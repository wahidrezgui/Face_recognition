#!/usr/bin/env python3
"""One-time DDD folder migration for GateVision.Api."""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "GateVision.Api"

# (old_relative, new_relative, namespace_from, namespace_to)
MOVES = [
    ("Infrastructure/Db/AppDbContext.cs", "Shared/Infrastructure/Persistence/AppDbContext.cs",
     "GateVision.Api.Infrastructure.Db", "GateVision.Api.Shared.Infrastructure.Persistence"),
    ("Infrastructure/Redis/CacheService.cs", "Shared/Infrastructure/Redis/CacheService.cs",
     "GateVision.Api.Infrastructure.Redis", "GateVision.Api.Shared.Infrastructure.Redis"),
    ("Infrastructure/Middleware/AuthMiddleware.cs", "Shared/Infrastructure/Middleware/AuthMiddleware.cs",
     "GateVision.Api.Infrastructure.Middleware", "GateVision.Api.Shared.Infrastructure.Middleware"),
    ("Domain/Person.cs", "Features/Identity/Domain/Person.cs",
     "GateVision.Api.Domain", "GateVision.Api.Features.Identity.Domain"),
    ("Domain/GateEvent.cs", "Features/AccessEvents/Domain/GateEvent.cs",
     "GateVision.Api.Domain", "GateVision.Api.Features.AccessEvents.Domain"),
    ("Domain/TrainingEvent.cs", "Features/AccessEvents/Domain/TrainingEvent.cs",
     "GateVision.Api.Domain", "GateVision.Api.Features.AccessEvents.Domain"),
    ("Domain/ValidatedEvent.cs", "Features/AccessEvents/Domain/ValidatedEvent.cs",
     "GateVision.Api.Domain", "GateVision.Api.Features.AccessEvents.Domain"),
    ("Domain/Gate.cs", "Features/GateOperations/Domain/Gate.cs",
     "GateVision.Api.Domain", "GateVision.Api.Features.GateOperations.Domain"),
    ("Services/IVectorStore.cs", "Features/Identity/Domain/IVectorStore.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.Identity.Domain"),
    ("Services/QdrantVectorStore.cs", "Features/Identity/Infrastructure/QdrantVectorStore.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.Identity.Infrastructure"),
    ("Services/EnrollmentService.cs", "Features/Identity/Application/EnrollmentService.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.Identity.Application"),
    ("Services/IdentificationService.cs", "Features/AccessEvents/Application/IdentificationService.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.AccessEvents.Application"),
    ("Services/EventBufferService.cs", "Features/AccessEvents/Infrastructure/EventBufferService.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.AccessEvents.Infrastructure"),
    ("Services/GateEventChannel.cs", "Features/AccessEvents/Infrastructure/GateEventChannel.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.AccessEvents.Infrastructure"),
    ("Services/WelcomeDedupService.cs", "Features/AccessEvents/Infrastructure/WelcomeDedupService.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.AccessEvents.Infrastructure"),
    ("Services/TrainingModeService.cs", "Features/AccessEvents/Infrastructure/TrainingModeService.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.AccessEvents.Infrastructure"),
    ("Services/LogUnknownService.cs", "Features/AccessEvents/Infrastructure/LogUnknownService.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.AccessEvents.Infrastructure"),
    ("Services/GateService.cs", "Features/GateOperations/Infrastructure/GateService.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.GateOperations.Infrastructure"),
    ("Services/EmployeeSyncService.cs", "Features/HrSync/Application/EmployeeSyncService.cs",
     "GateVision.Api.Services", "GateVision.Api.Features.HrSync.Application"),
    ("Endpoints/PersonEndpoints.cs", "Features/Identity/Api/PersonEndpoints.cs",
     "GateVision.Api.Endpoints", "GateVision.Api.Features.Identity.Api"),
    ("Endpoints/IdentifyEndpoints.cs", "Features/AccessEvents/Api/IdentifyEndpoints.cs",
     "GateVision.Api.Endpoints", "GateVision.Api.Features.AccessEvents.Api"),
    ("Endpoints/EventEndpoints.cs", "Features/AccessEvents/Api/EventEndpoints.cs",
     "GateVision.Api.Endpoints", "GateVision.Api.Features.AccessEvents.Api"),
    ("Endpoints/ValidatedEventEndpoints.cs", "Features/AccessEvents/Api/ValidatedEventEndpoints.cs",
     "GateVision.Api.Endpoints", "GateVision.Api.Features.AccessEvents.Api"),
    ("Endpoints/ConfigEndpoints.cs", "Features/GateOperations/Api/GateEndpoints.cs",
     "GateVision.Api.Endpoints", "GateVision.Api.Features.GateOperations.Api"),
    ("Endpoints/SyncEndpoints.cs", "Features/HrSync/Api/SyncEndpoints.cs",
     "GateVision.Api.Endpoints", "GateVision.Api.Features.HrSync.Api"),
]

GLOBAL_REPLACEMENTS = [
    ("using GateVision.Api.Domain;", "using GateVision.Api.Shared.Kernel;\nusing GateVision.Api.Features.Identity.Domain;\nusing GateVision.Api.Features.AccessEvents.Domain;\nusing GateVision.Api.Features.GateOperations.Domain;"),
    ("using GateVision.Api.Infrastructure.Db;", "using GateVision.Api.Shared.Infrastructure.Persistence;"),
    ("using GateVision.Api.Infrastructure.Redis;", "using GateVision.Api.Shared.Infrastructure.Redis;"),
    ("using GateVision.Api.Infrastructure.Middleware;", "using GateVision.Api.Shared.Infrastructure.Middleware;"),
    ("using GateVision.Api.Services;", "using GateVision.Api.Features.Identity.Application;\nusing GateVision.Api.Features.Identity.Domain;\nusing GateVision.Api.Features.Identity.Infrastructure;\nusing GateVision.Api.Features.AccessEvents.Application;\nusing GateVision.Api.Features.AccessEvents.Infrastructure;\nusing GateVision.Api.Features.GateOperations.Infrastructure;\nusing GateVision.Api.Features.HrSync.Application;"),
    ("GateVision.Api.Endpoints", "GateVision.Api.Features.GateOperations.Api"),
    ('"/api/', '"/api/v1/'),
    ("/api/events/stream", "/api/v1/events/stream"),  # fix double v1 if any
]

def fix_double_v1(text: str) -> str:
    return text.replace("/api/v1/v1/", "/api/v1/")

def migrate_file(old_rel: str, new_rel: str, ns_from: str, ns_to: str):
    src = ROOT / old_rel
    dst = ROOT / new_rel
    if not src.exists():
        print(f"SKIP missing: {old_rel}")
        return
    text = src.read_text(encoding="utf-8")
    text = text.replace(f"namespace {ns_from}", f"namespace {ns_to}")
    for old, new in GLOBAL_REPLACEMENTS:
        text = text.replace(old, new)
    text = fix_double_v1(text)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(text, encoding="utf-8")
    print(f"OK {old_rel} -> {new_rel}")

def main():
    for old, new, ns_from, ns_to in MOVES:
        migrate_file(old, new, ns_from, ns_to)
    print("Done.")

if __name__ == "__main__":
    main()
