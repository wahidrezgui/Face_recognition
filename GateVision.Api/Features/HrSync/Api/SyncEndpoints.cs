using GateVision.Api.Features.Identity.Application;
using GateVision.Api.Features.Identity.Domain;
using GateVision.Api.Features.Identity.Infrastructure;
using GateVision.Api.Features.AccessEvents.Application;
using GateVision.Api.Features.AccessEvents.Infrastructure;
using GateVision.Api.Features.GateOperations.Infrastructure;
using GateVision.Api.Features.HrSync.Application;

namespace GateVision.Api.Features.HrSync.Api;

public static class SyncEndpoints
{
    public static void MapSyncEndpoints(this WebApplication app)
    {
        app.MapGet("/api/v1/sync/employees", async (
            int limit,
            int offset,
            bool skipImported,
            EmployeeSyncService svc,
            CancellationToken ct) =>
        {
            if (limit <= 0 || limit > 200) limit = 50;
            if (offset < 0) offset = 0;
            try
            {
                var result = await svc.GetPreviewAsync(limit, offset, skipImported, ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Problem(ex.Message, statusCode: 503);
            }
        })
        .RequireAuthorization();

        app.MapGet("/api/v1/sync/employees/ids", async (
            EmployeeSyncService svc,
            CancellationToken ct) =>
        {
            try
            {
                var ids = await svc.GetAllUnimportedIdsAsync(ct);
                return Results.Ok(new { ids, count = ids.Length });
            }
            catch (InvalidOperationException ex)
            {
                return Results.Problem(ex.Message, statusCode: 503);
            }
        })
        .RequireAuthorization();

        app.MapPost("/api/v1/sync/employees", async (
            SyncImportDto dto,
            EmployeeSyncService svc,
            CancellationToken ct) =>
        {
            if (dto.MysqlIds is null || dto.MysqlIds.Length == 0)
                return Results.BadRequest(new { error = "mysqlIds must not be empty" });

            if (dto.MysqlIds.Length > 500)
                return Results.BadRequest(new { error = "Maximum 500 employees per request" });

            try
            {
                var result = await svc.ImportEmployeesAsync(dto.MysqlIds, dto.EnrollPhotos, ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Problem(ex.Message, statusCode: 503);
            }
        })
        .RequireAuthorization();
    }
}

public class SyncImportDto
{
    public int[] MysqlIds    { get; set; } = [];
    public bool  EnrollPhotos { get; set; } = false;
}
