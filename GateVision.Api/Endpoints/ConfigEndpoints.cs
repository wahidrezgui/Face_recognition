using System.Diagnostics;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;
using GateVision.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Endpoints;

public static class ConfigEndpoints
{
    private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public static void MapConfigEndpoints(this WebApplication app)
    {
        app.MapGet("/api/config/training-mode", (TrainingModeService svc) =>
            Results.Ok(new { enabled = svc.Enabled }));

        app.MapPost("/api/config/training-mode", (TrainingModeRequest req, TrainingModeService svc, ILogger<Program> logger) =>
        {
            svc.Enabled = req.Enabled;
            logger.LogInformation("Training mode set to {Enabled}", req.Enabled);
            return Results.Ok(new { enabled = svc.Enabled });
        }).RequireAuthorization();

        app.MapGet("/api/config/log-unknown", (LogUnknownService svc) =>
            Results.Ok(new { enabled = svc.Enabled }));

        app.MapPost("/api/config/log-unknown", (LogUnknownRequest req, LogUnknownService svc, ILogger<Program> logger) =>
        {
            svc.Enabled = req.Enabled;
            logger.LogInformation("Log unknown set to {Enabled}", req.Enabled);
            return Results.Ok(new { enabled = svc.Enabled });
        }).RequireAuthorization();

        // ── GET /api/gates ─────────────────────────────────────────────────────
        // Reads gates from DB, concurrently probes each; returns live status or null if offline.
        app.MapGet("/api/gates", async (GateService gateService, IHttpClientFactory http, CancellationToken ct) =>
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
                    client.Timeout = TimeSpan.FromSeconds(2);
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

        // ── GET /api/config/gates/{gateId}/status ──────────────────────────────
        app.MapGet("/api/config/gates/{gateId:guid}/status",
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
        app.MapPost("/api/config/gates/{gateId:guid}/video-source",
            async (Guid gateId, VideoSourceRequest req,
                   GateService gateService, IHttpClientFactory http,
                   IWebHostEnvironment env, ILogger<Program> logger, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.CameraSource))
                return Results.BadRequest("camera_source is required.");

            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null)
                return Results.NotFound($"Gate '{gateId}' not configured.");

            var direction = string.Equals(req.Direction, "exit", StringComparison.OrdinalIgnoreCase) ? "exit" : "entry";

            var configPath = Path.Combine(env.ContentRootPath, "config", $"video_source_{gateId}.json");
            var tmpPath = configPath + ".tmp";
            Directory.CreateDirectory(Path.GetDirectoryName(configPath)!);
            await File.WriteAllTextAsync(tmpPath,
                JsonSerializer.Serialize(new { camera_source = req.CameraSource, direction }), ct);
            File.Move(tmpPath, configPath, overwrite: true);
            logger.LogInformation("Gate {GateId} video source: {Source}, direction: {Direction}", gateId, req.CameraSource, direction);

            var client = http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);

            try
            {
                var body = JsonSerializer.Serialize(new RestartRequestBody(req.CameraSource, direction, gateId.ToString()), _jsonOpts);
                var restart = await client.PostAsync($"{gate.PythonUrl}/restart",
                    new StringContent(body, Encoding.UTF8, "application/json"), ct);

                if (!restart.IsSuccessStatusCode)
                    return Results.Json(new
                    {
                        status = "warning",
                        message = $"Config saved but gate restart failed (HTTP {(int)restart.StatusCode})",
                        gate_id = gateId,
                        camera_source = req.CameraSource,
                        direction
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
                    direction
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
                direction
            });
        }).RequireAuthorization();

        // ── GET /api/gates/{gateId}/stream ───────────────────────────────────────
        // Proxies the MJPEG stream from the edge Python service.
        // No RequireAuthorization — <img> tags can't carry JWT headers.
        // AuthMiddleware still validates token/api-key via query param.
        app.MapGet("/api/gates/{gateId:guid}/stream",
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

        // ── GET /api/config/gates/{gateId}/cameras ──────────────────────────────
        app.MapGet("/api/config/gates/{gateId:guid}/cameras",
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
        app.MapGet("/api/config/gates/{gateId:guid}/processing-fps",
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
        // Returns recent Hikvision ISAPI events from the Python service.
        // Returns empty event list (not 500) when the gate is offline.
        app.MapGet("/api/config/gates/{gateId:guid}/camera-events",
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
        // No auth required — the /desk kiosk display reads this on a separate machine
        // that only has a read-only token, not admin credentials.
        app.MapGet("/api/config/gates/{gateId:guid}/kiosk-settings",
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
        app.MapPost("/api/config/gates/{gateId:guid}/kiosk-settings",
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

        // ── POST /api/config/gates/{gateId}/processing-fps ──────────────────────
        app.MapPost("/api/config/gates/{gateId:guid}/processing-fps",
            async (Guid gateId, ProcessingFpsRequest req, GateService gateService, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
                var body = JsonSerializer.Serialize(new { fps = req.Fps });
                var content = new StringContent(body, Encoding.UTF8, "application/json");
                var resp = await http.PostAsync($"{gate.PythonUrl}/config/processing-fps", content, ct);
                var result = await resp.Content.ReadAsStringAsync(ct);
                return Results.Content(result, "application/json");
            }
            catch { return Results.Problem("Gate AI service unreachable."); }
        }).RequireAuthorization();

        // ── POST /api/config/video-source (backwards-compat: defaults to gate-a) ──
        app.MapPost("/api/config/video-source",
            async (VideoSourceRequest req, GateService gateService, IHttpClientFactory http,
                   IWebHostEnvironment env, ILogger<Program> logger, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.CameraSource))
                return Results.BadRequest("camera_source is required");

            var direction = string.Equals(req.Direction, "exit", StringComparison.OrdinalIgnoreCase) ? "exit" : "entry";
            var gate = (await gateService.GetAllAsync(ct)).FirstOrDefault();
            var pythonUrl = gate?.PythonUrl ?? "http://localhost:8000";

            var configDir = Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "config"));
            Directory.CreateDirectory(configDir);
            var configPath = Path.Combine(configDir, "video_source.json");
            var tmpPath = configPath + ".tmp";
            var cfgJson = JsonSerializer.Serialize(
                new { camera_source = req.CameraSource, direction },
                new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(tmpPath, cfgJson, ct);
            File.Move(tmpPath, configPath, overwrite: true);
            logger.LogInformation("Video source config written: {Source}, direction: {Direction}", req.CameraSource, direction);

            var body = JsonSerializer.Serialize(new RestartRequestBody(req.CameraSource, direction, null), _jsonOpts);
            var content = new StringContent(body, Encoding.UTF8, "application/json");
            var client = http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);

            try
            {
                var restartResp = await client.PostAsync($"{pythonUrl}/restart", content, ct);
                restartResp.EnsureSuccessStatusCode();
                logger.LogInformation("Python service restart signaled successfully");

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
                    return Results.Ok(new { status = "ok", camera_source = req.CameraSource, direction });

                return Results.Ok(new
                {
                    status = "warning",
                    message = "Config saved and restart signal sent, but camera not yet ready. Verify camera source.",
                    camera_source = req.CameraSource,
                    direction
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
                    direction
                });
            }
        });

        // ── POST /api/config/gates/{gateId}/stop ────────────────────────────────
        // Proxies a graceful shutdown signal to the Python AI service.
        app.MapPost("/api/config/gates/{gateId:guid}/stop",
            async (Guid gateId, GateService gateService, IHttpClientFactory http,
                   ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await gateService.GetByIdAsync(gateId, ct);
            if (gate is null) return Results.NotFound(new { error = $"Gate '{gateId}' not configured." });
            try
            {
                var client = http.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);
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
        // Runs the gate's stored StartCommand on the .NET host to launch the Python service.
        app.MapPost("/api/config/gates/{gateId:guid}/start",
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

                // Poll health for up to 5s to see if it came up
                var client = http.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(2);
                for (var i = 0; i < 10; i++)
                {
                    await Task.Delay(500, ct);
                    try
                    {
                        var h = await client.GetFromJsonAsync<HealthResponse>($"{gate.PythonUrl}/health", _jsonOpts, ct);
                        if (h?.Status == "ok")
                            return Results.Ok(new { status = "running", gate_id = gateId });
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

        app.MapGet("/api/admin/gates", async (AppDbContext db, CancellationToken ct) =>
        {
            var gates = await db.Gates.OrderBy(g => g.CreatedAt).ToListAsync(ct);
            return Results.Ok(gates.Select(g => new
            {
                g.Id,
                g.Name,
                g.PythonUrl,
                g.ApiKey,
                g.StartCommand,
                g.CreatedAt
            }));
        }).RequireAuthorization();

        app.MapPost("/api/admin/gates", async (
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
            return Results.Created($"/api/admin/gates/{gate.Id}",
                new { gate.Id, gate.Name, gate.PythonUrl, gate.ApiKey, gate.CreatedAt });
        }).RequireAuthorization();

        app.MapPatch("/api/admin/gates/{id:guid}", async (
            Guid id, UpdateGateRequest req, AppDbContext db, GateService svc,
            ILogger<Program> logger, CancellationToken ct) =>
        {
            var gate = await db.Gates.FindAsync([id], ct);
            if (gate is null) return Results.NotFound(new { error = $"Gate '{id}' not found." });

            if (!string.IsNullOrWhiteSpace(req.Name)) gate.UpdateName(req.Name);
            if (!string.IsNullOrWhiteSpace(req.PythonUrl)) gate.UpdatePythonUrl(req.PythonUrl);
            // ApiKey / StartCommand: null = don't change; "" = clear; non-empty = set new value
            if (req.ApiKey is not null) gate.UpdateApiKey(req.ApiKey);
            if (req.StartCommand is not null) gate.UpdateStartCommand(req.StartCommand);

            await db.SaveChangesAsync(ct);
            svc.InvalidateCache();
            logger.LogInformation("Gate {GateId} updated", id);
            return Results.Ok(new { gate.Id, gate.Name, gate.PythonUrl, gate.ApiKey, gate.CreatedAt });
        }).RequireAuthorization();

        app.MapDelete("/api/admin/gates/{id:guid}", async (
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
    public string? Direction { get; set; }
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
    public string? Name { get; set; }
    public string? PythonUrl { get; set; }
    public string? ApiKey { get; set; }
    public string? StartCommand { get; set; }
}

internal record RestartRequestBody(string Source, string? Direction = null, string? GateId = null);

internal record HealthResponse(string Status, bool Camera);

internal record ProcessingFpsRequest(int Fps);

public class KioskSettingsRequest
{
    public bool SpeechBuffered { get; set; }
}
