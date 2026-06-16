using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GateVision.Api.Features.Identity.Infrastructure;

public interface IPersonRepository
{
    Task<Person?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<int> CountAsync(CancellationToken ct = default);
    Task<(IReadOnlyList<Person> Items, int Total)> ListAsync(
        int page, int pageSize, string? search, EnrollmentStatus? status, CancellationToken ct = default);
    Task AddAsync(Person person, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    void Remove(Person person);
    Task<List<Person>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default);
}

public class PersonRepository(AppDbContext db) : IPersonRepository
{
    public Task<Person?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Persons.FindAsync([id], ct).AsTask();

    public Task<int> CountAsync(CancellationToken ct = default) =>
        db.Persons.CountAsync(ct);

    public async Task<(IReadOnlyList<Person> Items, int Total)> ListAsync(
        int page, int pageSize, string? search, EnrollmentStatus? status, CancellationToken ct = default)
    {
        var query = db.Persons.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(p =>
                p.FullName.ToLower().Contains(s) ||
                (p.FullNameEn != null && p.FullNameEn.ToLower().Contains(s)) ||
                (p.FullNameAr != null && p.FullNameAr.ToLower().Contains(s)));
        }

        if (status.HasValue)
            query = query.Where(p => p.EnrollmentStatus == status.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task AddAsync(Person person, CancellationToken ct = default)
    {
        db.Persons.Add(person);
        await db.SaveChangesAsync(ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);

    public void Remove(Person person) => db.Persons.Remove(person);

    public Task<List<Person>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default) =>
        db.Persons.Where(p => ids.Contains(p.Id)).ToListAsync(ct);
}
