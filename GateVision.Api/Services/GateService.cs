using GateVision.Api.Domain;
using GateVision.Api.Infrastructure.Db;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Services;

public class GateService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GateService> _logger;
    private List<Gate>? _cache;
    private DateTime _cacheExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    public GateService(IServiceScopeFactory scopeFactory, ILogger<GateService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<List<Gate>> GetAllAsync(CancellationToken ct = default)
    {
        if (_cache is not null && DateTime.UtcNow < _cacheExpiry)
            return _cache;

        await _lock.WaitAsync(ct);
        try
        {
            if (_cache is not null && DateTime.UtcNow < _cacheExpiry)
                return _cache;

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var gates = await db.Gates.AsNoTracking().ToListAsync(ct);
            _cache = gates;
            _cacheExpiry = DateTime.UtcNow.Add(CacheTtl);
            _logger.LogDebug("Gate cache refreshed ({Count} gates)", gates.Count);
            return gates;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<Gate?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var gates = await GetAllAsync(ct);
        return gates.FirstOrDefault(g => g.Id == id);
    }

    public void InvalidateCache()
    {
        _cache = null;
        _cacheExpiry = DateTime.MinValue;
    }
}
