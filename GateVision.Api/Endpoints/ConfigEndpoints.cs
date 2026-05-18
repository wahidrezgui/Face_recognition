using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GateVision.Api.Endpoints;

public static class ConfigEndpoints
{
    private static readonly HttpClient _pythonClient = new() { BaseAddress = new Uri("http://localhost:8000") };
    private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    private static string GetConfigDirPath(IWebHostEnvironment env)
    {
        // Resolve to project root: go up from GateVision.Api/ to repo root/config/
        return Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "config"));
    }

    public static void MapConfigEndpoints(this WebApplication app)
    {
        app.MapPost("/api/config/video-source", async (VideoSourceRequest req, IWebHostEnvironment env, ILogger<Program> logger) =>
        {
            if (string.IsNullOrWhiteSpace(req.CameraSource))
                return Results.BadRequest("camera_source is required");

            var configDir = GetConfigDirPath(env);
            Directory.CreateDirectory(configDir);
            var configPath = Path.Combine(configDir, "video_source.json");

            // Atomic write: temp file → rename
            var tmpPath = configPath + ".tmp";
            var config = new { camera_source = req.CameraSource };
            var json = JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(tmpPath, json);
            File.Move(tmpPath, configPath, overwrite: true);
            logger.LogInformation("Video source config written: {Source}", req.CameraSource);

            // Pass source directly in POST body (no file-as-IPC)
            var body = JsonSerializer.Serialize(new RestartRequestBody(req.CameraSource), _jsonOpts);
            var content = new StringContent(body, Encoding.UTF8, "application/json");

            try
            {
                var restartResp = await _pythonClient.PostAsync("/restart", content);
                restartResp.EnsureSuccessStatusCode();
                logger.LogInformation("Python service restart signaled successfully");

                // Health-check poll: confirm camera is live
                var cameraReady = false;
                for (var i = 0; i < 10; i++)
                {
                    await Task.Delay(300);
                    try
                    {
                        var healthResp = await _pythonClient.GetAsync("/health");
                        if (!healthResp.IsSuccessStatusCode) continue;
                        var healthDoc = JsonSerializer.Deserialize<HealthResponse>(await healthResp.Content.ReadAsStringAsync(), _jsonOpts);
                        if (healthDoc?.Camera == true)
                        {
                            cameraReady = true;
                            break;
                        }
                    }
                    catch { /* retry */ }
                }

                if (cameraReady)
                    return Results.Ok(new { status = "ok", camera_source = req.CameraSource });
                else
                    return Results.Ok(new { status = "warning", message = "Config saved and restart signal sent, but camera not yet ready. Verify camera source.", camera_source = req.CameraSource });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to signal Python service restart");
                return Results.Ok(new { status = "warning", message = "Config saved but Python restart failed. Restart the AI service manually.", camera_source = req.CameraSource });
            }
        });
    }
}

public class VideoSourceRequest
{
    public string CameraSource { get; set; } = "";
}

internal record RestartRequestBody(string Source);

internal record HealthResponse(string Status, bool Camera);
