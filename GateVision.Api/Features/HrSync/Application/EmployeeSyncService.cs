using System.Text;
using GateVision.Api.Features.AccessEvents.Domain;
using GateVision.Api.Features.GateOperations.Domain;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Shared.Infrastructure.Persistence;
using GateVision.Api.Shared.Kernel;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace GateVision.Api.Features.HrSync.Application;

public record EmployeePreviewItem(
    int MysqlId,
    string FullName,
    string? FullNameAr,
    string Department,
    string? QrCode,
    string? PhotoPath,
    bool IsAlreadyImported,
    string? PersonId);

public record EmployeePreviewResult(
    int Total,
    int AlreadyImported,
    IReadOnlyList<EmployeePreviewItem> Employees);

public record ImportResultItem(
    int MysqlId,
    string Status,
    string? PersonId,
    string? Error);

public record ImportResult(
    int Imported,
    int Skipped,
    int Failed,
    int EnrolledFaces,
    IReadOnlyList<ImportResultItem> Results);

public class EmployeeSyncService(
    IConfiguration config,
    AppDbContext db,
    IHttpClientFactory httpClientFactory,
    ILogger<EmployeeSyncService> logger)
{
    private static readonly string FaceImagesDir =
        Path.Combine(Directory.GetCurrentDirectory(), "FaceImages");

    private string? MySqlConnectionString =>
        config["Sync:MySqlConnectionString"];

    private string UploadsBasePath =>
        config["Sync:UploadsBasePath"] ?? string.Empty;

    private string AiServiceUrl =>
        config["Sync:AiServiceUrl"] ?? "http://localhost:8000";

    public async Task<EmployeePreviewResult> GetPreviewAsync(
        int limit, int offset, bool skipImported, CancellationToken ct)
    {
        var connStr = MySqlConnectionString;
        if (string.IsNullOrWhiteSpace(connStr))
            throw new InvalidOperationException("Sync:MySqlConnectionString is not configured.");

        await using var conn = new MySqlConnection(connStr);
        await conn.OpenAsync(ct);

        int total = 0;
        await using (var cmd = new MySqlCommand("SELECT COUNT(*) FROM employees", conn))
        {
            var result = await cmd.ExecuteScalarAsync(ct);
            total = Convert.ToInt32(result);
        }

        var importedMap = await BuildImportedMapAsync(ct);
        var hrIds = await FetchAllHrEmployeeIdsAsync(conn, ct);
        var alreadyImportedTotal = hrIds.Count(importedMap.ContainsKey);

        var rows = new List<EmployeeRow>();
        const string sql = """
            SELECT id, qrcode, military_number, phone_number, fullname_en, fullname_ar,
                   dep_id, rank_id, nationality_id, is_employee, qid, default_base,
                   remarks, bloodtype, Job_Arabic, photo
            FROM employees
            ORDER BY id
            LIMIT @limit OFFSET @offset
            """;

        await using (var cmd = new MySqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@limit", limit);
            cmd.Parameters.AddWithValue("@offset", offset);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
                rows.Add(ReadRow(reader));
        }

        var items = new List<EmployeePreviewItem>();
        foreach (var row in rows)
        {
            var isImported = importedMap.TryGetValue(row.Id, out var personId);
            if (skipImported && isImported) continue;

            var displayName = !string.IsNullOrWhiteSpace(row.FullNameEn)
                ? row.FullNameEn
                : row.FullNameAr ?? "Unknown";

            items.Add(new EmployeePreviewItem(
                MysqlId: row.Id,
                FullName: displayName,
                FullNameAr: row.FullNameAr,
                Department: $"Dept-{row.DepId}",
                QrCode: row.QrCode,
                PhotoPath: row.Photo,
                IsAlreadyImported: isImported,
                PersonId: personId));
        }

        return new EmployeePreviewResult(total, alreadyImportedTotal, items);
    }

    public async Task<ImportResult> ImportEmployeesAsync(
        int[] mysqlIds, bool enrollPhotos, CancellationToken ct)
    {
        var connStr = MySqlConnectionString;
        if (string.IsNullOrWhiteSpace(connStr))
            throw new InvalidOperationException("Sync:MySqlConnectionString is not configured.");

        var rows = await FetchRowsByIdsAsync(connStr, mysqlIds, ct);

        var importedMap = await BuildImportedMapAsync(ct);

        int imported = 0, skipped = 0, failed = 0, enrolledFaces = 0;
        var results = new List<ImportResultItem>();

        foreach (var row in rows)
        {
            if (importedMap.ContainsKey(row.Id))
            {
                skipped++;
                results.Add(new ImportResultItem(row.Id, "skipped", null, null));
                continue;
            }

            try
            {
                var person = Person.CreateFromEmployee(row);
                db.Persons.Add(person);
                await db.SaveChangesAsync(ct);

                string? enrollError = null;

                if (!string.IsNullOrWhiteSpace(row.Photo) &&
                    !row.Photo.Contains("nopic", StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(UploadsBasePath))
                {
                    var filePath = Path.Combine(
                        UploadsBasePath,
                        row.Photo.Replace('/', Path.DirectorySeparatorChar));

                    if (File.Exists(filePath))
                    {
                        var ext = Path.GetExtension(filePath).ToLowerInvariant();
                        if (ext is ".jpg" or ".jpeg" or ".png")
                        {
                            var personDir = Path.Combine(FaceImagesDir, person.Id.ToString());
                            Directory.CreateDirectory(personDir);
                            File.Copy(filePath, Path.Combine(personDir, $"profile{ext}"), overwrite: true);

                            if (enrollPhotos)
                            {
                                enrollError = await EnrollPhotoAsync(person.Id, filePath, ct);
                                if (enrollError is null) enrolledFaces++;
                            }
                        }
                        else
                        {
                            logger.LogWarning(
                                "Skipping unsupported photo format for employee {Id}: {Ext}", row.Id, ext);
                        }
                    }
                    else
                    {
                        logger.LogWarning(
                            "Photo not found for employee {Id}: {Path}", row.Id, filePath);
                    }
                }

                imported++;
                results.Add(new ImportResultItem(row.Id, "imported", person.Id.ToString(), enrollError));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to import employee {Id}", row.Id);
                failed++;
                results.Add(new ImportResultItem(row.Id, "failed", null, ex.Message));
            }
        }

        return new ImportResult(imported, skipped, failed, enrolledFaces, results);
    }

    private async Task<string?> EnrollPhotoAsync(Guid personId, string filePath, CancellationToken ct)
    {
        try
        {
            var bytes = await File.ReadAllBytesAsync(filePath, ct);
            var b64 = Convert.ToBase64String(bytes);

            var payload = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(new
                {
                    personId = personId.ToString(),
                    frame = b64,
                }),
                Encoding.UTF8,
                "application/json");

            var http = httpClientFactory.CreateClient();
            var response = await http.PostAsync($"{AiServiceUrl}/enroll/from-image", payload, ct);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                logger.LogWarning(
                    "Enrollment failed for person {PersonId}: {Status} {Body}",
                    personId, (int)response.StatusCode, body);
                return $"HTTP {(int)response.StatusCode}";
            }
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Enrollment failed for person {PersonId}", personId);
            return ex.Message;
        }
    }

    public async Task<int[]> GetAllUnimportedIdsAsync(CancellationToken ct)
    {
        var connStr = MySqlConnectionString;
        if (string.IsNullOrWhiteSpace(connStr))
            throw new InvalidOperationException("Sync:MySqlConnectionString is not configured.");

        var importedMap = await BuildImportedMapAsync(ct);

        await using var conn = new MySqlConnection(connStr);
        await conn.OpenAsync(ct);

        var allIds = new List<int>();
        await using var cmd = new MySqlCommand("SELECT id FROM employees ORDER BY id", conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var id = reader.GetInt32(0);
            if (!importedMap.ContainsKey(id))
                allIds.Add(id);
        }

        return [.. allIds];
    }

    private async Task<Dictionary<int, string>> BuildImportedMapAsync(CancellationToken ct)
    {
        var linked = await db.Persons
            .AsNoTracking()
            .Where(p => p.ExternalSourceId != null)
            .Select(p => new { p.ExternalSourceId, Id = p.Id.ToString() })
            .ToListAsync(ct);

        var map = new Dictionary<int, string>();
        foreach (var person in linked)
        {
            if (TryParseEmployeeSourceId(person.ExternalSourceId, out var employeeId))
                map.TryAdd(employeeId, person.Id);
        }

        return map;
    }

    private static async Task<List<int>> FetchAllHrEmployeeIdsAsync(
        MySqlConnection conn, CancellationToken ct)
    {
        var ids = new List<int>();
        await using var cmd = new MySqlCommand("SELECT id FROM employees", conn);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
            ids.Add(reader.GetInt32(0));
        return ids;
    }

    private static bool TryParseEmployeeSourceId(string? externalSourceId, out int employeeId) =>
        int.TryParse(externalSourceId, out employeeId);

    private static async Task<List<EmployeeRow>> FetchRowsByIdsAsync(
        string connStr, int[] ids, CancellationToken ct)
    {
        if (ids.Length == 0) return [];

        await using var conn = new MySqlConnection(connStr);
        await conn.OpenAsync(ct);

        var placeholders = string.Join(",", ids.Select((_, i) => $"@id{i}"));
        var sql = $"""
            SELECT id, qrcode, military_number, phone_number, fullname_en, fullname_ar,
                   dep_id, rank_id, nationality_id, is_employee, qid, default_base,
                   remarks, bloodtype, Job_Arabic, photo
            FROM employees
            WHERE id IN ({placeholders})
            """;

        await using var cmd = new MySqlCommand(sql, conn);
        for (var i = 0; i < ids.Length; i++)
            cmd.Parameters.AddWithValue($"@id{i}", ids[i]);

        var rows = new List<EmployeeRow>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
            rows.Add(ReadRow(reader));

        return rows;
    }

    private static EmployeeRow ReadRow(MySqlDataReader r)
    {
        int? NullableInt(string col)
        {
            var ord = r.GetOrdinal(col);
            return r.IsDBNull(ord) ? null : r.GetInt32(ord);
        }
        string? NullableStr(string col)
        {
            var ord = r.GetOrdinal(col);
            return r.IsDBNull(ord) ? null : r.GetValue(ord).ToString();
        }

        return new EmployeeRow(
            Id: r.GetInt32("id"),
            MilitaryNumber: NullableInt("military_number"),
            FullNameEn: NullableStr("fullname_en"),
            FullNameAr: NullableStr("fullname_ar"),
            Photo: NullableStr("photo"),
            DepId: r.GetInt32("dep_id"),
            QrCode: NullableStr("qrcode"));
    }
}
