using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using GateVision.Api.Services;

namespace GateVision.Api.Endpoints;

public static class ConfigEndpoints
{
    private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    private static string GetConfigDirPath(IWebHostEnvironment env) =>
        Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "config"));

    private static string? GetPythonUrl(IConfiguration config, string gateId) =>
        config[$"Gates:{gateId}:PythonUrl"];

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
        // Concurrently probes all configured gates; returns live status or null if offline.
        app.MapGet("/api/gates", async (IConfiguration config, IHttpClientFactory http) =>
        {
            var gates = config.GetSection("Gates").GetChildren().ToList();
            var tasks = gates.Select(async g =>
            {
                var id   = g.Key;
                var name = g["Name"] ?? id;
                var url  = g["PythonUrl"];
                if (url is null) return new { id, name, online = false, status = (object?)null };

                try
                {
                    var client = http.CreateClient();
                    client.Timeout = TimeSpan.FromSeconds(2);
                    var resp = await client.GetAsync($"{url}/stream/status");
                    if (!resp.IsSuccessStatusCode)
                        return new { id, name, online = false, status = (object?)null };
                    var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
                    return new { id, name, online = true, status = (object?)body };
                }
                catch
                {
                    return new { id, name, online = false, status = (object?)null };
                }
            });

            var results = await Task.WhenAll(tasks);
            return Results.Ok(results);
        }).RequireAuthorization();

        // ── GET /api/config/gates/{gateId}/status ──────────────────────────────
        app.MapGet("/api/config/gates/{gateId}/status",
            async (string gateId, IConfiguration config, IHttpClientFactory http) =>
        {
            var url = GetPythonUrl(config, gateId);
            if (url is null) return Results.NotFound($"Gate '{gateId}' not configured.");
            try
            {
                var client = http.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(3);
                var resp = await client.GetAsync($"{url}/stream/status");
                var body = await resp.Content.ReadAsStringAsync();
                return Results.Content(body, "application/json");
            }
            catch { return Results.Problem("Gate AI service unreachable."); }
        }).RequireAuthorization();

        // ── POST /api/config/gates/{gateId}/video-source ───────────────────────
        app.MapPost("/api/config/gates/{gateId}/video-source",
            async (string gateId, VideoSourceRequest req,
                   IConfiguration config, IHttpClientFactory http,
                   IWebHostEnvironment env, ILogger<Program> logger) =>
        {
            if (string.IsNullOrWhiteSpace(req.CameraSource))
                return Results.BadRequest("camera_source is required.");

            var pythonUrl = GetPythonUrl(config, gateId);
            if (pythonUrl is null)
                return Results.NotFound($"Gate '{gateId}' not configured.");

            var direction = string.Equals(req.Direction, "exit", StringComparison.OrdinalIgnoreCase) ? "exit" : "entry";

            var configPath = Path.Combine(env.ContentRootPath, "config", $"video_source_{gateId}.json");
            var tmpPath    = configPath + ".tmp";
            Directory.CreateDirectory(Path.GetDirectoryName(configPath)!);
            await File.WriteAllTextAsync(tmpPath,
                JsonSerializer.Serialize(new { camera_source = req.CameraSource, direction }));
            File.Move(tmpPath, configPath, overwrite: true);
            logger.LogInformation("Gate {GateId} video source: {Source}, direction: {Direction}", gateId, req.CameraSource, direction);

            var client = http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);

            try
            {
                var body = JsonSerializer.Serialize(new RestartRequestBody(req.CameraSource, direction), _jsonOpts);
                var restart = await client.PostAsync($"{pythonUrl}/restart",
                    new StringContent(body, Encoding.UTF8, "application/json"));

                if (!restart.IsSuccessStatusCode)
                    return Results.Json(new
                    {
                        status        = "warning",
                        message       = $"Config saved but gate restart failed (HTTP {(int)restart.StatusCode})",
                        gate_id       = gateId,
                        camera_source = req.CameraSource,
                        direction
                    });
            }
            catch
            {
                return Results.Json(new
                {
                    status        = "warning",
                    message       = "Config saved but gate AI service is unreachable.",
                    gate_id       = gateId,
                    camera_source = req.CameraSource,
                    direction
                });
            }

            for (var i = 0; i < 10; i++)
            {
                await Task.Delay(300);
                try
                {
                    var h = await client.GetFromJsonAsync<HealthResponse>($"{pythonUrl}/health", _jsonOpts);
                    if (h?.Camera == true) break;
                }
                catch { /* gate not ready yet */ }
            }

            return Results.Ok(new
            {
                status        = "ok",
                gate_id       = gateId,
                camera_source = req.CameraSource,
                direction
            });
        }).RequireAuthorization();

        // ── POST /api/config/video-source (backwards-compat: defaults to gate-a) ──
        app.MapPost("/api/config/video-source",
            async (VideoSourceRequest req, IConfiguration config, IHttpClientFactory http,
                   IWebHostEnvironment env, ILogger<Program> logger) =>
        {
            if (string.IsNullOrWhiteSpace(req.CameraSource))
                return Results.BadRequest("camera_source is required");

            var direction  = string.Equals(req.Direction, "exit", StringComparison.OrdinalIgnoreCase) ? "exit" : "entry";
            var pythonUrl  = config["Gates:gate-a:PythonUrl"] ?? "http://localhost:8000";

            var configDir  = GetConfigDirPath(env);
            Directory.CreateDirectory(configDir);
            var configPath = Path.Combine(configDir, "video_source.json");
            var tmpPath    = configPath + ".tmp";
            var cfgJson    = JsonSerializer.Serialize(
                new { camera_source = req.CameraSource, direction },
                new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(tmpPath, cfgJson);
            File.Move(tmpPath, configPath, overwrite: true);
            logger.LogInformation("Video source config written: {Source}, direction: {Direction}", req.CameraSource, direction);

            var body    = JsonSerializer.Serialize(new RestartRequestBody(req.CameraSource, direction), _jsonOpts);
            var content = new StringContent(body, Encoding.UTF8, "application/json");
            var client  = http.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);

            try
            {
                var restartResp = await client.PostAsync($"{pythonUrl}/restart", content);
                restartResp.EnsureSuccessStatusCode();
                logger.LogInformation("Python service restart signaled successfully");

                var cameraReady = false;
                for (var i = 0; i < 10; i++)
                {
                    await Task.Delay(300);
                    try
                    {
                        var h = await client.GetFromJsonAsync<HealthResponse>($"{pythonUrl}/health", _jsonOpts);
                        if (h?.Camera == true) { cameraReady = true; break; }
                    }
                    catch { /* retry */ }
                }

                if (cameraReady)
                    return Results.Ok(new { status = "ok", camera_source = req.CameraSource, direction });

                return Results.Ok(new
                {
                    status        = "warning",
                    message       = "Config saved and restart signal sent, but camera not yet ready. Verify camera source.",
                    camera_source = req.CameraSource,
                    direction
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to signal Python service restart");
                return Results.Ok(new
                {
                    status        = "warning",
                    message       = "Config saved but AI service is not running. Start the AI service and the new source will be picked up automatically.",
                    camera_source = req.CameraSource,
                    direction
                });
            }
        });
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

internal record RestartRequestBody(string Source, string? Direction = null);

internal record HealthResponse(string Status, bool Camera);
