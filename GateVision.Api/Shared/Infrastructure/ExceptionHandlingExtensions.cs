using GateVision.Api.Shared.Kernel;

namespace GateVision.Api.Shared.Infrastructure;

public static class ExceptionHandlingExtensions
{
    public static void UseGateVisionExceptionHandling(this WebApplication app)
    {
        app.UseExceptionHandler(exceptionHandlerApp =>
        {
            exceptionHandlerApp.Run(async context =>
            {
                var ex = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
                if (ex is DomainException dex)
                {
                    context.Response.StatusCode = dex.StatusCode;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        type = "https://tools.ietf.org/html/rfc7807",
                        title = "Domain error",
                        status = dex.StatusCode,
                        detail = dex.Message,
                    });
                    return;
                }

                context.Response.StatusCode = 500;
                await context.Response.WriteAsJsonAsync(new
                {
                    type = "https://tools.ietf.org/html/rfc7807",
                    title = "Internal server error",
                    status = 500,
                    detail = app.Environment.IsDevelopment() ? ex?.Message : "An unexpected error occurred.",
                });
            });
        });
    }
}
