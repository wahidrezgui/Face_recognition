using GateVision.Api.Shared.Kernel;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.GateOperations.Domain;
using GateVision.Api.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Features.GateOperations.Infrastructure;

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

    public async Task<GateRecognitionSettings> GetRecognitionSettingsAsync(string gateId, CancellationToken ct = default)
    {
        if (Guid.TryParse(gateId, out var id))
        {
            var gate = await GetByIdAsync(id, ct);
            return GateRecognitionSettings.FromGate(gate);
        }

        var gates = await GetAllAsync(ct);
        if (gates.Count == 1)
            return GateRecognitionSettings.FromGate(gates[0]);

        return GateRecognitionSettings.Default;
    }

    public void InvalidateCache()
    {
        _cache = null;
        _cacheExpiry = DateTime.MinValue;
    }
}
