using GateVision.Api.Domain;
using StackExchange.Redis;
using System.Text.Json;

namespace GateVision.Api.Infrastructure.Redis;

public class CacheService
{
    private readonly IConnectionMultiplexer? _redis;

    public CacheService(IConnectionMultiplexer? redis)
    {
        _redis = redis;
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
    {
        if (_redis is null) return;
        var db = _redis.GetDatabase();
        var json = JsonSerializer.Serialize(value);
        await db.StringSetAsync(key, json, expiry ?? TimeSpan.FromMinutes(10));
    }

    public async Task<T?> GetAsync<T>(string key) where T : class
    {
        if (_redis is null) return null;
        var db = _redis.GetDatabase();
        var json = await db.StringGetAsync(key);
        if (json.IsNullOrEmpty) return null;
        return JsonSerializer.Deserialize<T>(json!);
    }

    public async Task RemoveAsync(string key)
    {
        if (_redis is null) return;
        var db = _redis.GetDatabase();
        await db.KeyDeleteAsync(key);
    }

    // ── Combined person metadata (1 key instead of 3) ──────────

    public async Task<PersonCacheData?> GetPersonAsync(Guid personId)
        => await GetAsync<PersonCacheData>($"person:{personId}");

    public async Task SetPersonAsync(Guid personId, string name, string? department, string? welcomeMessage)
        => await SetAsync($"person:{personId}", new PersonCacheData(name, department, welcomeMessage));

    public async Task RemovePersonAsync(Guid personId)
        => await RemoveAsync($"person:{personId}");
}
