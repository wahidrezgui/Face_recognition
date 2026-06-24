using System.Diagnostics;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using GateVision.Api.Features.AccessEvents.Application;
using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.AccessEvents.Infrastructure;
using GateVision.Api.Features.GateOperations.Domain;
using GateVision.Api.Features.GateOperations.Infrastructure;
using GateVision.Api.Features.Identity.Application;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Features.Identity.Infrastructure;
using GateVision.Api.Shared.Infrastructure.Persistence;
using GateVision.Api.Shared.Kernel;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Features.GateOperations.Api;

public static class GateEndpoints
{
    private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public static void MapGateEndpoints(this WebApplication app)
    {
        app.MapGet("/api/v1/config/training-mode", (TrainingModeService svc) =>
            Results.Ok(new { enabled = svc.Enabled }));

        app.MapPost("/api/v1/config/training-mode", (TrainingModeRequest req, TrainingModeService svc, ILogger<Program> logger) =>
        {
            svc.Enabled = req.Enabled;
            logger.LogInformation("Training mode set to {Enabled}", req.Enabled);
            return Results.Ok(new { enabled = svc.Enabled });
        }).RequireAuthorization();

        app.MapGet("/api/v1/config/log-unknown", (LogUnknownService svc) =>
            Results.Ok(new { enabled = svc.Enabled }));

        app.MapPost("/api/v1/config/log-unknown", (LogUnknownRequest req, LogUnknownService svc, ILogger<Program> logger) =>
        {
            svc.Enabled = req.Enabled;
            logger.LogInformation("Log unknown set to {Enabled}", req.Enabled);
            return Results.Ok(new { enabled = svc.Enabled });
        }).RequireAuthorization();

        // ── GET /api/gates ─────────────────────────────────────────────────────
        // Reads gates from DB, concurrently probes each; returns live status or null if offline.
        app.MapGet("/api/v1/gates", async (GateService gateService, IHttpClientFactory http, CancellationToken ct) =>
        {
            var gates = await gateService.GetAllAsync(ct);
            var tasks = gates.Select(async g =>
            {
                var url = g.PythonUrl;
                if (string.IsNullOrEmpty(url))
                    return new { id = g.Id, name = g.Name, pythonUrl = (string?)null, online = false, status = (object?)null };

                try
                {
                    var client = http.CreateClient();
                    client.Timeout = TimeSpan.FromSeconds(5);
                    var resp = await client.GetAsync($"{url}/stream/status", ct);
                    if (!resp.IsSuccessStatusCode)
                        return new { id = g.Id, name = g.Name, pythonUrl = (string?)url, online = false, status = (object?)null };
                    var body = await resp.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
                    return new { id = g.Id, name = g.Name, pythonUrl = (string?)url, online = true, status = (object?)body };
                }
                catch
                {
                    return new { id = g.Id, name = g.Name, pythonUrl = (string?)url, online = false, status = (object?)null };
                }
            });

            var results = await Task.WhenAll(tasks);
            return Results.Ok(results);
        }).RequireAuthorization();

        // ── GET /api/gates/{gateId}/config ─────────────────────────────────────
        // Python processing instances call this at startup to load their full config.
        // AuthMiddleware validates the X-API-Key header — no JWT needed.
        app.MapGet("/api/v1/gates/{gateId:guid}/config",
            async (Guid gateId, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            return Results.Json(BuildGateConfigDto(gate), _jsonOpts);
        });

        // Resolves gate from per-gate X-API-Key (or single-gate install with global key).
        app.MapGet("/api/v1/gates/me/config",
            async (HttpContext ctx, GateService gateService, CancellationToken ct) =>
        {
            var gate = await ResolveGateFromAuthAsync(ctx, gateService, ct);
            if (gate is null)
                return Results.NotFound(
                    "Gate could not be resolved. Use a per-gate API key or configure exactly one gate.");
            return Results.Json(BuildGateConfigDto(gate), _jsonOpts);
        });

        // ── GET /api/config/gates/{gateId}/status ──────────────────────────────
        app.MapGet("/api/v1/config/gates/{gateId:guid}/status",
            async (Guid gateId, GateService gateService, IHttpClientFactory http, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                var client = http.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(3);
                var resp = await client.GetAsync($"{gate.PythonUrl}/stream/status", ct);
                var body = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(body, "application/json");
            }
            catch { return Results.Problem("Gate AI service unreachable."); }
        }).RequireAuthorization();

        // ── POST /api/config/gates/{gateId}/video-source ───────────────────────
        // Persists camera_source to DB, then signals Python to restart.
        app.MapPost("/api/v1/config/gates/{gateId:guid}/video-source",
            async (Guid gateId, VideoSourceRequest req,
                   GateService gateService, AppDbContext db,
                   IHttpClientFactory http, ILogger<Program> logger, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.CameraSource))
                return Results.BadRequest("camera_source is required.");

            var gate = await db.Gates.FindAsync([gateId], ct);
            if (gate is null)
                return Results.NotFound($"Gate '{gateId}' not configured.");

            gate.UpdateConfig(new GateConfigUpdate { CameraSource = req.CameraSource });
            await db.SaveChangesAsync(ct);
            gateService.InvalidateCache();
            logger.LogInformation("Gate {GateId} video source saved: {Source}", gateId, req.CameraSource);

            var client = http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            if (!string.IsNullOrEmpty(gate.ApiKey))
                client.DefaultRequestHeaders.Add("X-API-Key", gate.ApiKey);

            try
            {
                var body = JsonSerializer.Serialize(new RestartRequestBody(req.CameraSource, gateId.ToString()), _jsonOpts);
                var restart = await client.PostAsync($"{gate.PythonUrl}/restart",
                    new StringContent(body, Encoding.UTF8, "application/json"), ct);

                if (!restart.IsSuccessStatusCode)
                    return Results.Json(new
                    {
                        status = "warning",
                        message = $"Config saved but gate restart failed (HTTP {(int)restart.StatusCode})",
                        gate_id = gateId,
                        camera_source = req.CameraSource,
                    });
            }
            catch
            {
                return Results.Json(new
                {
                    status = "warning",
                    message = "Config saved but gate AI service is unreachable.",
                    gate_id = gateId,
                    camera_source = req.CameraSource,
                });
            }

            for (var i = 0; i < 10; i++)
            {
                await Task.Delay(300, ct);
                try
                {
                    var h = await client.GetFromJsonAsync<HealthResponse>($"{gate.PythonUrl}/health", _jsonOpts, ct);
                    if (h?.Camera == true) break;
                }
                catch { /* gate not ready yet */ }
            }

            return Results.Ok(new
            {
                status = "ok",
                gate_id = gateId,
                camera_source = req.CameraSource,
            });
        }).RequireAuthorization();

        // ── GET /api/gates/{gateId}/stream ───────────────────────────────────────
        // Proxies the MJPEG stream from the edge Python service.
        // No RequireAuthorization — <img> tags can't carry JWT headers.
        // AuthMiddleware still validates token/api-key via query param.
        app.MapGet("/api/v1/gates/{gateId:guid}/stream",
            async (Guid gateId, GateService gateService, HttpContext ctx) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ctx.RequestAborted);
            if (gate is null) { ctx.Response.StatusCode = 404; return; }

            try
            {
                using var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
                using var resp = await http.GetAsync($"{gate.PythonUrl}/stream",
                    HttpCompletionOption.ResponseHeadersRead, ctx.RequestAborted);
                ctx.Response.ContentType = resp.Content.Headers.ContentType?.ToString()
                    ?? "multipart/x-mixed-replace; boundary=frame";
                ctx.Response.Headers.CacheControl = "no-cache";
                await using var downstream = await resp.Content.ReadAsStreamAsync(ctx.RequestAborted);
                await downstream.CopyToAsync(ctx.Response.Body, ctx.RequestAborted);
            }
            catch (OperationCanceledException)
            {
                // Client disconnected — normal for a streaming endpoint
            }
            catch (Exception ex)
            {
                if (!ctx.Response.HasStarted)
                {
                    ctx.Response.StatusCode = 502;
                    await ctx.Response.WriteAsync($"Stream proxy error: {ex.Message}");
                }
            }
        });

        // ── POST /api/gates/{gateId}/enroll/webcam ──────────────────────────────
        app.MapPost("/api/v1/gates/{gateId:guid}/enroll/webcam",
            async (Guid gateId, JsonElement body, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                using var http = CreateAiClient(gate, TimeSpan.FromSeconds(60));
                var content = new StringContent(body.GetRawText(), Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/enroll/webcam", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json", statusCode: (int)resp.StatusCode);
            }
            catch (Exception ex) { return Results.Problem($"Gate AI service unreachable: {ex.Message}"); }
        }).RequireAuthorization();

        // ── POST /api/gates/{gateId}/enroll/from-image ──────────────────────────
        app.MapPost("/api/v1/gates/{gateId:guid}/enroll/from-image",
            async (Guid gateId, JsonElement body, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                using var http = CreateAiClient(gate, TimeSpan.FromSeconds(30));
                var content = new StringContent(body.GetRawText(), Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/enroll/from-image", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json", statusCode: (int)resp.StatusCode);
            }
            catch (Exception ex) { return Results.Problem($"Gate AI service unreachable: {ex.Message}"); }
        }).RequireAuthorization();

        // ── POST /api/gates/{gateId}/enroll/capture ─────────────────────────────
        app.MapPost("/api/v1/gates/{gateId:guid}/enroll/capture",
            async (Guid gateId, JsonElement body, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                using var http = CreateAiClient(gate, TimeSpan.FromSeconds(60));
                var content = new StringContent(body.GetRawText(), Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/enroll/capture", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json", statusCode: (int)resp.StatusCode);
            }
            catch (Exception ex) { return Results.Problem($"Gate AI service unreachable: {ex.Message}"); }
        }).RequireAuthorization();

        // ── POST /api/gates/{gateId}/pose ───────────────────────────────────────
        app.MapPost("/api/v1/gates/{gateId:guid}/pose",
            async (Guid gateId, JsonElement body, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                var content = new StringContent(body.GetRawText(), Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/pose", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json", statusCode: (int)resp.StatusCode);
            }
            catch { return Results.Ok(new { detected = false, yaw = 0, pitch = 0 }); }
        }).RequireAuthorization();

        // ── POST /api/gates/{gateId}/roi ────────────────────────────────────────
        app.MapPost("/api/v1/gates/{gateId:guid}/roi",
            async (Guid gateId, JsonElement body, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                using var http = CreateAiClient(gate, TimeSpan.FromSeconds(5));
                var content = new StringContent(body.GetRawText(), Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/roi", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json", statusCode: (int)resp.StatusCode);
            }
            catch (Exception ex) { return Results.Problem($"Gate AI service unreachable: {ex.Message}"); }
        }).RequireAuthorization();

        // ── GET /api/config/gates/{gateId}/cameras ──────────────────────────────
        app.MapGet("/api/v1/config/gates/{gateId:guid}/cameras",
            async (Guid gateId, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
                var resp = await http.GetStringAsync($"{gate.PythonUrl}/cameras", ct);
                return Results.Content(resp, "application/json");
            }
            catch { return Results.Ok(Array.Empty<object>()); }
        }).RequireAuthorization();

        // ── GET /api/config/gates/{gateId}/processing-fps ───────────────────────
        app.MapGet("/api/v1/config/gates/{gateId:guid}/processing-fps",
            async (Guid gateId, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
                var resp = await http.GetStringAsync($"{gate.PythonUrl}/config/processing-fps", ct);
                return Results.Content(resp, "application/json");
            }
            catch { return Results.Problem("Gate AI service unreachable."); }
        }).RequireAuthorization();

        // ── GET /api/config/gates/{gateId}/camera-events ───────────────────────
        app.MapGet("/api/v1/config/gates/{gateId:guid}/camera-events",
            async (Guid gateId, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
                var resp = await http.GetStringAsync($"{gate.PythonUrl}/camera-events", ct);
                return Results.Content(resp, "application/json");
            }
            catch { return Results.Ok(new { enabled = false, connected = false, active = false, url = (string?)null, events = Array.Empty<object>() }); }
        }).RequireAuthorization();

        // ── GET /api/config/gates/{gateId}/kiosk-settings ─────────────────────
        app.MapGet("/api/v1/config/gates/{gateId:guid}/kiosk-settings",
            async (Guid gateId, IWebHostEnvironment env, CancellationToken ct) =>
        {
            var path = Path.Combine(env.ContentRootPath, "config", $"kiosk_{gateId}.json");
            if (!File.Exists(path))
                return Results.Ok(new { speechBuffered = false });
            try
            {
                var json = await File.ReadAllTextAsync(path, ct);
                using var doc = JsonDocument.Parse(json);
                var buffered = doc.RootElement.TryGetProperty("speechBuffered", out var p) && p.GetBoolean();
                return Results.Ok(new { speechBuffered = buffered });
            }
            catch { return Results.Ok(new { speechBuffered = false }); }
        });

        // ── POST /api/config/gates/{gateId}/kiosk-settings ────────────────────
        app.MapPost("/api/v1/config/gates/{gateId:guid}/kiosk-settings",
            async (Guid gateId, KioskSettingsRequest req, IWebHostEnvironment env, CancellationToken ct) =>
        {
            var dir = Path.Combine(env.ContentRootPath, "config");
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, $"kiosk_{gateId}.json");
            var tmp = path + ".tmp";
            await File.WriteAllTextAsync(tmp, JsonSerializer.Serialize(new { speechBuffered = req.SpeechBuffered }), ct);
            File.Move(tmp, path, overwrite: true);
            return Results.Ok(new { speechBuffered = req.SpeechBuffered });
        }).RequireAuthorization();

        // ── GET /api/config/gates/{gateId}/desk-settings ────────────────────────
        // Public kiosk endpoint — desk page loads display timing without admin auth.
        app.MapGet("/api/v1/config/gates/{gateId:guid}/desk-settings",
            async (Guid gateId, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            return Results.Ok(new
            {
                desk_display_seconds = gate.DeskDisplaySeconds,
                desk_event_lookback_seconds = gate.DeskEventLookbackSeconds,
                show_needs_review_on_desk = gate.ShowNeedsReviewOnDesk,
            });
        });

        // ── POST /api/config/gates/{gateId}/welcome-workflow ────────────────────
        app.MapPost("/api/v1/config/gates/{gateId:guid}/welcome-workflow",
            async (Guid gateId, WelcomeWorkflowConfigRequest req,
                   GateService gateService, AppDbContext db,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([gateId], ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");

            gate.UpdateConfig(new GateConfigUpdate
            {
                WelcomeCooldownSeconds = req.WelcomeCooldownSeconds,
                BufferTrackExpirySeconds = req.BufferTrackExpirySeconds,
                BufferPersonDedupSeconds = req.BufferPersonDedupSeconds,
                RefireScoreDelta = req.RefireScoreDelta,
                MinTrackHits = req.MinTrackHits,
                DeskDisplaySeconds = req.DeskDisplaySeconds,
                DeskEventLookbackSeconds = req.DeskEventLookbackSeconds,
                ShowNeedsReviewOnDesk = req.ShowNeedsReviewOnDesk,
            });
            await db.SaveChangesAsync(ct);
            gateService.InvalidateCache();
            logger.LogInformation("Gate {GateId} welcome workflow settings saved", gateId);

            return Results.Ok(new
            {
                status = "saved",
                welcome_cooldown_seconds = gate.WelcomeCooldownSeconds,
                buffer_track_expiry_seconds = gate.BufferTrackExpirySeconds,
                buffer_person_dedup_seconds = gate.BufferPersonDedupSeconds,
                refire_score_delta = gate.RefireScoreDelta,
                min_track_hits = gate.MinTrackHits,
                desk_display_seconds = gate.DeskDisplaySeconds,
                desk_event_lookback_seconds = gate.DeskEventLookbackSeconds,
                show_needs_review_on_desk = gate.ShowNeedsReviewOnDesk,
                note = "Restart the gate AI service to apply min_track_hits and refire_score_delta.",
            });
        }).RequireAuthorization();

        // ── POST /api/config/gates/{gateId}/processing-fps ──────────────────────
        // Persists to DB, then hot-updates the running Python instance in-memory.
        app.MapPost("/api/v1/config/gates/{gateId:guid}/processing-fps",
            async (Guid gateId, ProcessingFpsRequest req,
                   GateService gateService, AppDbContext db,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([gateId], ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");

            gate.UpdateConfig(new GateConfigUpdate { ProcessingFps = req.Fps });
            await db.SaveChangesAsync(ct);
            gateService.InvalidateCache();
            logger.LogInformation("Gate {GateId} processing_fps saved: {Fps}", gateId, req.Fps);

            try
            {
                using var http = CreateAiClient(gate, TimeSpan.FromSeconds(3));
                var body = JsonSerializer.Serialize(new { fps = req.Fps });
                var content = new StringContent(body, Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/config/processing-fps", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json");
            }
            catch { return Results.Ok(new { status = "saved", fps = req.Fps, note = "Gate AI service unreachable — config saved, will apply on next start." }); }
        }).RequireAuthorization();

        // ── POST /api/config/gates/{gateId}/recognition ─────────────────────────
        app.MapPost("/api/v1/config/gates/{gateId:guid}/recognition",
            async (Guid gateId, RecognitionConfigRequest req,
                   GateService gateService, AppDbContext db,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([gateId], ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");

            gate.UpdateConfig(new GateConfigUpdate
            {
                MinMatchScore = req.MinMatchScore,
                IdentifyConfidenceThreshold = req.IdentifyConfidenceThreshold,
                AutoValidateConfidence = req.AutoValidateConfidence,
                MinFaceConfidence = req.MinFaceConfidence,
                LogUnknown = req.LogUnknown,
                TrainingMode = req.TrainingMode,
            });
            await db.SaveChangesAsync(ct);
            gateService.InvalidateCache();
            logger.LogInformation(
                "Gate {GateId} recognition thresholds saved: identify={Identify:P0} minMatch={MinMatch:P0} autoValidate={AutoValidate:P0} minFace={MinFace:P0}",
                gateId, gate.IdentifyConfidenceThreshold, gate.MinMatchScore,
                gate.AutoValidateConfidence, gate.MinFaceConfidence);

            return Results.Ok(new
            {
                status = "saved",
                min_match_score = gate.MinMatchScore,
                identify_confidence_threshold = gate.IdentifyConfidenceThreshold,
                auto_validate_confidence = gate.AutoValidateConfidence,
                min_face_confidence = gate.MinFaceConfidence,
                log_unknown = gate.LogUnknown,
                training_mode = gate.TrainingMode,
                note = "Restart the gate AI service to apply face-detection thresholds.",
            });
        }).RequireAuthorization();

        // ── POST /api/config/gates/{gateId}/hikvision ───────────────────────────
        // Persists Hikvision settings to DB, then hot-updates the Python instance.
        app.MapPost("/api/v1/config/gates/{gateId:guid}/hikvision",
            async (Guid gateId, HikvisionConfigRequest req,
                   GateService gateService, AppDbContext db,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([gateId], ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");

            gate.UpdateConfig(new GateConfigUpdate
            {
                HikvisionUrl = req.Url ?? "",
                HikvisionUser = req.User ?? "admin",
                HikvisionPassword = req.Password,
                HikvisionEventTtlMs = req.EventTtlMs,
                HikvisionEventTypes = req.EventTypes,
                HikvisionDetectionTarget = req.DetectionTarget,
            });
            await db.SaveChangesAsync(ct);
            gateService.InvalidateCache();
            logger.LogInformation("Gate {GateId} Hikvision config saved: {Url}", gateId, req.Url);

            try
            {
                using var http = CreateAiClient(gate, TimeSpan.FromSeconds(5));
                var body = JsonSerializer.Serialize(req, _jsonOpts);
                var content = new StringContent(body, Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/config/hikvision", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json");
            }
            catch { return Results.Ok(new { status = "saved", note = "Gate AI service unreachable — config saved, will apply on next start." }); }
        }).RequireAuthorization();

        // ── POST /api/config/gates/{gateId}/motion ──────────────────────────────
        app.MapPost("/api/v1/config/gates/{gateId:guid}/motion",
            async (Guid gateId, MotionConfigRequest req,
                   GateService gateService, AppDbContext db,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([gateId], ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");

            gate.UpdateConfig(new GateConfigUpdate
            {
                MotionThreshold = req.Threshold,
                MotionPixelThreshold = req.PixelThreshold,
            });
            await db.SaveChangesAsync(ct);
            gateService.InvalidateCache();

            try
            {
                using var http = CreateAiClient(gate, TimeSpan.FromSeconds(3));
                var body = JsonSerializer.Serialize(new { threshold = req.Threshold, pixel_threshold = req.PixelThreshold });
                var content = new StringContent(body, Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/config/motion", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json");
            }
            catch { return Results.Ok(new { status = "saved", note = "Gate AI service unreachable — config saved, will apply on next start." }); }
        }).RequireAuthorization();

        // ── POST /api/config/gates/{gateId}/model-profile ───────────────────────
        app.MapPost("/api/v1/config/gates/{gateId:guid}/model-profile",
            async (Guid gateId, ModelProfileRequest req,
                   GateService gateService, AppDbContext db,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([gateId], ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");

            gate.UpdateConfig(new GateConfigUpdate { ModelProfile = req.Profile });
            await db.SaveChangesAsync(ct);
            gateService.InvalidateCache();

            try
            {
                using var http = CreateAiClient(gate, TimeSpan.FromSeconds(3));
                var body = JsonSerializer.Serialize(new { profile = req.Profile });
                var content = new StringContent(body, Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/config/model-profile", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json");
            }
            catch { return Results.Ok(new { status = "saved", profile = req.Profile, note = "Gate AI service unreachable — config saved, will apply on next start." }); }
        }).RequireAuthorization();

        // ── POST /api/config/gates/{gateId}/det-size ────────────────────────────
        app.MapPost("/api/v1/config/gates/{gateId:guid}/det-size",
            async (Guid gateId, DetSizeRequest req,
                   GateService gateService, AppDbContext db,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([gateId], ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");

            gate.UpdateConfig(new GateConfigUpdate
            {
                DetectorInputWidth = req.Width,
                DetectorInputHeight = req.Height,
                ClearDetectorInputSize = (req.Width is null && req.Height is null) ? true : null,
            });
            await db.SaveChangesAsync(ct);
            gateService.InvalidateCache();

            try
            {
                using var http = CreateAiClient(gate, TimeSpan.FromSeconds(3));
                var body = req.Width.HasValue
                    ? JsonSerializer.Serialize(new { width = req.Width, height = req.Height })
                    : "{}";
                var method = req.Width.HasValue ? HttpMethod.Post : HttpMethod.Delete;
                var resp = await http.SendAsync(new HttpRequestMessage(method, $"{gate.PythonUrl}/config/det-size")
                {
                    Content = new StringContent(body, Encoding.UTF8, "application/json")
                }, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json");
            }
            catch { return Results.Ok(new { status = "saved", note = "Gate AI service unreachable — config saved, will apply on next start." }); }
        }).RequireAuthorization();

        // ── POST /api/config/gates/{gateId}/detect-scale ────────────────────────
        app.MapPost("/api/v1/config/gates/{gateId:guid}/detect-scale",
            async (Guid gateId, DetectScaleRequest req,
                   GateService gateService, AppDbContext db,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([gateId], ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");

            gate.UpdateConfig(new GateConfigUpdate { DetectMaxWidth = req.MaxWidth });
            await db.SaveChangesAsync(ct);
            gateService.InvalidateCache();

            try
            {
                using var http = CreateAiClient(gate, TimeSpan.FromSeconds(3));
                var body = JsonSerializer.Serialize(new { max_width = req.MaxWidth });
                var content = new StringContent(body, Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/config/detect-scale", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json");
            }
            catch { return Results.Ok(new { status = "saved", max_width = req.MaxWidth, note = "Gate AI service unreachable — config saved, will apply on next start." }); }
        }).RequireAuthorization();

        // ── POST /api/config/video-source (backwards-compat: targets first gate) ──
        app.MapPost("/api/v1/config/video-source",
            async (VideoSourceRequest req, GateService gateService, AppDbContext db,
                   IHttpClientFactory http, ILogger<Program> logger, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.CameraSource))
                return Results.BadRequest("camera_source is required");

            var gate = (await gateService.GetAllAsync(ct)).FirstOrDefault();
            var pythonUrl = gate?.PythonUrl ?? "http://localhost:8000";

            if (gate is not null)
            {
                var tracked = await db.Gates.FindAsync([gate.Id], ct);
                if (tracked is not null)
                {
                    tracked.UpdateConfig(new GateConfigUpdate { CameraSource = req.CameraSource });
                    await db.SaveChangesAsync(ct);
                    gateService.InvalidateCache();
                }
            }
            logger.LogInformation("Video source config saved: {Source}", req.CameraSource);

            var body = JsonSerializer.Serialize(new RestartRequestBody(req.CameraSource, null), _jsonOpts);
            var content = new StringContent(body, Encoding.UTF8, "application/json");
            var client = http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            if (!string.IsNullOrEmpty(gate?.ApiKey))
                client.DefaultRequestHeaders.Add("X-API-Key", gate.ApiKey);

            try
            {
                var restartResp = await client.PostAsync($"{pythonUrl}/restart", content, ct);
                restartResp.EnsureSuccessStatusCode();

                var cameraReady = false;
                for (var i = 0; i < 10; i++)
                {
                    await Task.Delay(300, ct);
                    try
                    {
                        var h = await client.GetFromJsonAsync<HealthResponse>($"{pythonUrl}/health", _jsonOpts, ct);
                        if (h?.Camera == true) { cameraReady = true; break; }
                    }
                    catch { /* retry */ }
                }

                if (cameraReady)
                    return Results.Ok(new { status = "ok", camera_source = req.CameraSource });

                return Results.Ok(new
                {
                    status = "warning",
                    message = "Config saved and restart signal sent, but camera not yet ready.",
                    camera_source = req.CameraSource,
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to signal Python service restart");
                return Results.Ok(new
                {
                    status = "warning",
                    message = "Config saved but AI service is not running. Start the AI service and the new source will be picked up automatically.",
                    camera_source = req.CameraSource,
                });
            }
        });

        // ── POST /api/config/gates/{gateId}/stop ────────────────────────────────
        app.MapPost("/api/v1/config/gates/{gateId:guid}/stop",
            async (Guid gateId, GateService gateService, IHttpClientFactory http,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound(new { error = $"Gate '{gateId}' not configured." });
            try
            {
                var client = http.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                if (!string.IsNullOrEmpty(gate.ApiKey))
                    client.DefaultRequestHeaders.Add("X-API-Key", gate.ApiKey);
                var resp = await client.PostAsync($"{gate.PythonUrl}/stop", null, ct);
                logger.LogInformation("Stop signal sent to gate {GateId} (HTTP {Status})", gateId, (int)resp.StatusCode);
                return Results.Ok(new { status = "stopping", gate_id = gateId });
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to send stop signal to gate {GateId}", gateId);
                return Results.Problem($"Gate AI service unreachable: {ex.Message}");
            }
        }).RequireAuthorization();

        // ── POST /api/config/gates/{gateId}/start ───────────────────────────────
        app.MapPost("/api/v1/config/gates/{gateId:guid}/start",
            async (Guid gateId, GateService gateService, IHttpClientFactory http,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound(new { error = $"Gate '{gateId}' not configured." });
            if (string.IsNullOrWhiteSpace(gate.StartCommand))
                return Results.UnprocessableEntity(new { error = "No start command configured for this gate. Edit the gate to add one." });

            try
            {
                var psi = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                    ? new ProcessStartInfo("cmd.exe", $"/c start /b {gate.StartCommand}")
                    { UseShellExecute = false, CreateNoWindow = true }
                    : new ProcessStartInfo("/bin/bash", $"-c \"{gate.StartCommand}\"")
                    { UseShellExecute = false, CreateNoWindow = true };

                Process.Start(psi);
                logger.LogInformation("Start command executed for gate {GateId}: {Cmd}", gateId, gate.StartCommand);

                var client = http.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                if (!string.IsNullOrEmpty(gate.ApiKey))
                    client.DefaultRequestHeaders.Add("X-API-Key", gate.ApiKey);

                for (var i = 0; i < 10; i++)
                {
                    await Task.Delay(500, ct);
                    try
                    {
                        var h = await client.GetFromJsonAsync<HealthResponse>($"{gate.PythonUrl}/health", _jsonOpts, ct);
                        if (h?.Status == "ok")
                        {
                            await SyncGateRuntimeFromDbAsync(gate, client, logger, ct);
                            return Results.Ok(new
                            {
                                status = "running",
                                gate_id = gateId,
                                camera_source = gate.CameraSource,
                            });
                        }
                    }
                    catch { /* not up yet */ }
                }
                return Results.Ok(new { status = "starting", gate_id = gateId, message = "Command executed — service still starting up." });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to start gate {GateId}", gateId);
                return Results.Problem($"Failed to run start command: {ex.Message}");
            }
        }).RequireAuthorization();

        // ── Admin: Gate CRUD ──────────────────────────────────────────────────────

        app.MapGet("/api/v1/admin/gates", async (AppDbContext db, CancellationToken ct) =>
        {
            var gates = await db.Gates.OrderBy(g => g.CreatedAt).ToListAsync(ct);
            return Results.Ok(gates.Select(g => new
            {
                g.Id,
                g.Name,
                g.PythonUrl,
                g.ApiKey,
                g.StartCommand,
                g.CreatedAt,
                g.CameraSource,
                g.ProcessingFps,
                g.ModelProfile,
                detectorInputSize = (g.DetectorInputWidth.HasValue && g.DetectorInputHeight.HasValue)
                    ? (object?)new[] { g.DetectorInputWidth.Value, g.DetectorInputHeight.Value }
                    : null,
                g.MotionThreshold,
                g.MotionPixelThreshold,
                g.DetectMaxWidth,
                g.HikvisionUrl,
                g.HikvisionUser,
                g.HikvisionEventTtlMs,
                g.HikvisionEventTypes,
                g.HikvisionDetectionTarget,
                g.MinMatchScore,
                g.IdentifyConfidenceThreshold,
                g.AutoValidateConfidence,
                g.MinFaceConfidence,
                g.TrackerMaxLostS,
                g.LogUnknown,
                g.TrainingMode,
            }));
        }).RequireAuthorization();

        app.MapPost("/api/v1/admin/gates", async (
            CreateGateRequest req, AppDbContext db, GateService svc,
            ILogger<Program> logger, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.PythonUrl))
                return Results.BadRequest(new { error = "name and pythonUrl are required." });

            var gate = Gate.Create(req.Name, req.PythonUrl, req.ApiKey, req.StartCommand);
            db.Gates.Add(gate);
            await db.SaveChangesAsync(ct);
            svc.InvalidateCache();
            logger.LogInformation("Gate {GateId} created (url={Url})", gate.Id, gate.PythonUrl);
            return Results.Created($"/api/v1/admin/gates/{gate.Id}",
                new { gate.Id, gate.Name, gate.PythonUrl, gate.ApiKey, gate.CreatedAt });
        }).RequireAuthorization();

        app.MapPatch("/api/v1/admin/gates/{id:guid}", async (
            Guid id, UpdateGateRequest req, AppDbContext db, GateService svc,
            ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([id], ct);
            if (gate is null) return Results.NotFound(new { error = $"Gate '{id}' not found." });

            if (!string.IsNullOrWhiteSpace(req.Name)) gate.UpdateName(req.Name);
            if (!string.IsNullOrWhiteSpace(req.PythonUrl)) gate.UpdatePythonUrl(req.PythonUrl);
            if (req.ApiKey is not null) gate.UpdateApiKey(req.ApiKey);
            if (req.StartCommand is not null) gate.UpdateStartCommand(req.StartCommand);

            // Apply processing config fields (any non-null field is updated)
            gate.UpdateConfig(new GateConfigUpdate
            {
                CameraSource = req.CameraSource,
                ProcessingFps = req.ProcessingFps,
                ModelProfile = req.ModelProfile,
                DetectorInputWidth = req.DetectorInputWidth,
                DetectorInputHeight = req.DetectorInputHeight,
                ClearDetectorInputSize = req.ClearDetectorInputSize,
                MotionThreshold = req.MotionThreshold,
                MotionPixelThreshold = req.MotionPixelThreshold,
                DetectMaxWidth = req.DetectMaxWidth,
                HikvisionUrl = req.HikvisionUrl,
                HikvisionUser = req.HikvisionUser,
                HikvisionPassword = req.HikvisionPassword,
                HikvisionEventTtlMs = req.HikvisionEventTtlMs,
                HikvisionEventTypes = req.HikvisionEventTypes,
                HikvisionDetectionTarget = req.HikvisionDetectionTarget,
                MinMatchScore = req.MinMatchScore,
                IdentifyConfidenceThreshold = req.IdentifyConfidenceThreshold,
                AutoValidateConfidence = req.AutoValidateConfidence,
                MinFaceConfidence = req.MinFaceConfidence,
                TrackerMaxLostS = req.TrackerMaxLostS,
                LogUnknown = req.LogUnknown,
                TrainingMode = req.TrainingMode,
                WelcomeCooldownSeconds = req.WelcomeCooldownSeconds,
                BufferTrackExpirySeconds = req.BufferTrackExpirySeconds,
                BufferPersonDedupSeconds = req.BufferPersonDedupSeconds,
                RefireScoreDelta = req.RefireScoreDelta,
                MinTrackHits = req.MinTrackHits,
                DeskDisplaySeconds = req.DeskDisplaySeconds,
                DeskEventLookbackSeconds = req.DeskEventLookbackSeconds,
                ShowNeedsReviewOnDesk = req.ShowNeedsReviewOnDesk,
            });

            await db.SaveChangesAsync(ct);
            svc.InvalidateCache();
            logger.LogInformation("Gate {GateId} updated", id);
            return Results.Ok(new { gate.Id, gate.Name, gate.PythonUrl, gate.ApiKey, gate.CreatedAt });
        }).RequireAuthorization();

        app.MapDelete("/api/v1/admin/gates/{id:guid}", async (
            Guid id, AppDbContext db, GateService svc,
            ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([id], ct);
            if (gate is null) return Results.NotFound(new { error = $"Gate '{id}' not found." });

            db.Gates.Remove(gate);
            await db.SaveChangesAsync(ct);
            svc.InvalidateCache();
            logger.LogInformation("Gate {GateId} deleted", id);
            return Results.NoContent();
        }).RequireAuthorization();
    }

    private static HttpClient CreateAiClient(Gate gate, TimeSpan timeout)
    {
        var client = new HttpClient { Timeout = timeout };
        if (!string.IsNullOrEmpty(gate.ApiKey))
            client.DefaultRequestHeaders.Add("X-API-Key", gate.ApiKey);
        return client;
    }

    private static async Task<Gate?> ResolveGateFromAuthAsync(
        HttpContext ctx, GateService gateService, CancellationToken ct)
    {
        var gateIdClaim = ctx.User.FindFirst("GateId")?.Value;
        if (gateIdClaim is not null && Guid.TryParse(gateIdClaim, out var gid))
            return await gateService.GetByIdAsync(gid, ct);

        var gates = await gateService.GetAllAsync(ct);
        return gates.Count == 1 ? gates[0] : null;
    }

    private static object BuildGateConfigDto(Gate gate)
    {
        int[]? detSize = (gate.DetectorInputWidth.HasValue && gate.DetectorInputHeight.HasValue)
            ? [gate.DetectorInputWidth.Value, gate.DetectorInputHeight.Value]
            : null;

        return new
        {
            gate_id = gate.Id,
            camera_source = gate.CameraSource,
            processing_fps = gate.ProcessingFps,
            model_profile = gate.ModelProfile,
            detector_input_size = detSize,
            motion_threshold = gate.MotionThreshold,
            motion_pixel_threshold = gate.MotionPixelThreshold,
            detect_max_width = gate.DetectMaxWidth,
            hikvision_url = gate.HikvisionUrl,
            hikvision_user = gate.HikvisionUser,
            hikvision_password = gate.HikvisionPassword ?? "",
            hikvision_event_ttl_ms = gate.HikvisionEventTtlMs,
            hikvision_event_types = gate.HikvisionEventTypes,
            hikvision_detection_target = gate.HikvisionDetectionTarget,
            min_match_score = gate.MinMatchScore,
            identify_confidence_threshold = gate.IdentifyConfidenceThreshold,
            auto_validate_confidence = gate.AutoValidateConfidence,
            min_face_confidence = gate.MinFaceConfidence,
            tracker_max_lost_s = gate.TrackerMaxLostS,
            log_unknown = gate.LogUnknown,
            training_mode = gate.TrainingMode,
            welcome_cooldown_seconds = gate.WelcomeCooldownSeconds,
            buffer_track_expiry_seconds = gate.BufferTrackExpirySeconds,
            buffer_person_dedup_seconds = gate.BufferPersonDedupSeconds,
            refire_score_delta = gate.RefireScoreDelta,
            min_track_hits = gate.MinTrackHits,
            desk_display_seconds = gate.DeskDisplaySeconds,
            desk_event_lookback_seconds = gate.DeskEventLookbackSeconds,
            show_needs_review_on_desk = gate.ShowNeedsReviewOnDesk,
        };
    }

    private static async Task SyncGateRuntimeFromDbAsync(
        Gate gate, HttpClient client, ILogger logger, CancellationToken ct)
    {
        try
        {
            if (gate.ProcessingFps is >= 1 and <= 30)
            {
                var fpsBody = JsonSerializer.Serialize(new { fps = gate.ProcessingFps });
                var fpsResp = await client.PostAsync($"{gate.PythonUrl}/config/processing-fps",
                    new StringContent(fpsBody, Encoding.UTF8, "application/json"), ct);
                if (!fpsResp.IsSuccessStatusCode)
                {
                    logger.LogWarning(
                        "Sync processing_fps failed for gate {GateId} (HTTP {Status})",
                        gate.Id, (int)fpsResp.StatusCode);
                }
            }

            if (string.IsNullOrWhiteSpace(gate.CameraSource))
                return;

            var body = JsonSerializer.Serialize(
                new RestartRequestBody(gate.CameraSource, gate.Id.ToString()), _jsonOpts);
            var restart = await client.PostAsync($"{gate.PythonUrl}/restart",
                new StringContent(body, Encoding.UTF8, "application/json"), ct);
            if (!restart.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "Sync camera_source failed for gate {GateId} (HTTP {Status})",
                    gate.Id, (int)restart.StatusCode);
                return;
            }

            for (var i = 0; i < 10; i++)
            {
                await Task.Delay(300, ct);
                try
                {
                    var h = await client.GetFromJsonAsync<HealthResponse>($"{gate.PythonUrl}/health", _jsonOpts, ct);
                    if (h?.Camera == true) break;
                }
                catch { /* not ready */ }
            }

            logger.LogInformation(
                "Gate {GateId} Python service synced — camera_source={Source}, processing_fps={Fps}",
                gate.Id, gate.CameraSource, gate.ProcessingFps);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to sync DB runtime config to gate {GateId}", gate.Id);
        }
    }
}

public class TrainingModeRequest
{
    public bool Enabled { get; set; }
}

public class LogUnknownRequest
{
    public bool Enabled { get; set; }
}

public class VideoSourceRequest
{
    public string CameraSource { get; set; } = "";
}

public class CreateGateRequest
{
    public string Name { get; set; } = "";
    public string PythonUrl { get; set; } = "";
    public string? ApiKey { get; set; }
    public string? StartCommand { get; set; }
}

public class UpdateGateRequest
{
    // Identity
    public string? Name { get; set; }
    public string? PythonUrl { get; set; }
    public string? ApiKey { get; set; }
    public string? StartCommand { get; set; }
    // Processing config — all optional; null = don't change
    public string? CameraSource { get; set; }
    public int? ProcessingFps { get; set; }
    public string? ModelProfile { get; set; }
    public int? DetectorInputWidth { get; set; }
    public int? DetectorInputHeight { get; set; }
    public bool? ClearDetectorInputSize { get; set; }
    public double? MotionThreshold { get; set; }
    public int? MotionPixelThreshold { get; set; }
    public int? DetectMaxWidth { get; set; }
    public string? HikvisionUrl { get; set; }
    public string? HikvisionUser { get; set; }
    public string? HikvisionPassword { get; set; }
    public int? HikvisionEventTtlMs { get; set; }
    public string? HikvisionEventTypes { get; set; }
    public string? HikvisionDetectionTarget { get; set; }
    public double? MinMatchScore { get; set; }
    public double? IdentifyConfidenceThreshold { get; set; }
    public double? AutoValidateConfidence { get; set; }
    public double? MinFaceConfidence { get; set; }
    public double? TrackerMaxLostS { get; set; }
    public bool? LogUnknown { get; set; }
    public bool? TrainingMode { get; set; }
    public int? WelcomeCooldownSeconds { get; set; }
    public int? BufferTrackExpirySeconds { get; set; }
    public int? BufferPersonDedupSeconds { get; set; }
    public double? RefireScoreDelta { get; set; }
    public int? MinTrackHits { get; set; }
    public int? DeskDisplaySeconds { get; set; }
    public int? DeskEventLookbackSeconds { get; set; }
    public bool? ShowNeedsReviewOnDesk { get; set; }
}

internal record RestartRequestBody(string Source, string? GateId = null);

internal record HealthResponse(string Status, bool Camera);

internal record ProcessingFpsRequest(int Fps);

public class RecognitionConfigRequest
{
    public double? MinMatchScore { get; set; }
    public double? IdentifyConfidenceThreshold { get; set; }
    public double? AutoValidateConfidence { get; set; }
    public double? MinFaceConfidence { get; set; }
    public bool? LogUnknown { get; set; }
    public bool? TrainingMode { get; set; }
}

public class WelcomeWorkflowConfigRequest
{
    public int? WelcomeCooldownSeconds { get; set; }
    public int? BufferTrackExpirySeconds { get; set; }
    public int? BufferPersonDedupSeconds { get; set; }
    public double? RefireScoreDelta { get; set; }
    public int? MinTrackHits { get; set; }
    public int? DeskDisplaySeconds { get; set; }
    public int? DeskEventLookbackSeconds { get; set; }
    public bool? ShowNeedsReviewOnDesk { get; set; }
}

public class KioskSettingsRequest
{
    public bool SpeechBuffered { get; set; }
}

public class HikvisionConfigRequest
{
    public string? Url { get; set; }
    public string? User { get; set; }
    public string? Password { get; set; }
    public int? EventTtlMs { get; set; }
    public string? EventTypes { get; set; }
    public string? DetectionTarget { get; set; }
}

public class MotionConfigRequest
{
    public double Threshold { get; set; }
    public int PixelThreshold { get; set; }
}

public class ModelProfileRequest
{
    public string Profile { get; set; } = "auto";
}

public class DetSizeRequest
{
    public int? Width { get; set; }
    public int? Height { get; set; }
}

public class DetectScaleRequest
{
    public int MaxWidth { get; set; }
}
