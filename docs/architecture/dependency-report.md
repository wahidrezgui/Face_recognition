# GateVision.Api Dependency Report

- **Files analyzed:** 35
- **Namespaces:** 20
- **Dependency edges:** 114

## Circular dependencies
- None detected (excluding same-namespace usings)

## Architecture layers (readable)

Aggregated from namespace `using` analysis. Full detail: `dependency-report.json`.

```mermaid
flowchart TB
  subgraph apiLayer [Api]
    Platform_Api["Platform.Api"]
    Identity_Api["Identity.Api"]
    Events_Api["Events.Api"]
    Gates_Api["Gates.Api"]
    HrSync_Api["HrSync.Api"]
  end
  subgraph appLayer [Application]
    Identity_Application["Identity.Application"]
    Events_Application["Events.Application"]
    HrSync_Application["HrSync.Application"]
  end
  subgraph domainLayer [Domain]
    Shared_Kernel["Shared.Kernel"]
    Identity_Domain["Identity.Domain"]
    Events_Domain["Events.Domain"]
    Gates_Domain["Gates.Domain"]
  end
  subgraph infraLayer [Infrastructure]
    Identity_Infrastructure["Identity.Infrastructure"]
    Events_Infrastructure["Events.Infrastructure"]
    Gates_Infrastructure["Gates.Infrastructure"]
    Shared_Persistence["Shared.Persistence"]
    Shared_Redis["Shared.Redis"]
    Shared_Middleware["Shared.Middleware"]
    Shared_HostedServices["Shared.HostedServices"]
  end
  Identity_Api --> Identity_Application
  Identity_Api --> Identity_Domain
  Identity_Api --> Identity_Infrastructure
  Events_Api --> Events_Application
  Events_Api --> Events_Domain
  Events_Api --> Events_Infrastructure
  Gates_Api --> Gates_Domain
  Gates_Api --> Gates_Infrastructure
  HrSync_Api --> HrSync_Application
  Platform_Api --> Shared_Persistence
  Identity_Application --> Identity_Domain
  Events_Application --> Events_Domain
  Events_Application --> Events_Infrastructure
  HrSync_Application --> Identity_Domain
  Identity_Infrastructure --> Identity_Domain
  Identity_Infrastructure --> Shared_Persistence
  Events_Infrastructure --> Events_Domain
  Events_Infrastructure --> Shared_Persistence
  Gates_Infrastructure --> Gates_Domain
  Gates_Infrastructure --> Shared_Persistence
  Shared_Persistence --> Identity_Domain
  Shared_Persistence --> Events_Domain
  Shared_Persistence --> Gates_Domain
  Shared_Redis --> Identity_Domain
  Shared_Middleware --> Gates_Infrastructure
  Shared_HostedServices --> Shared_Persistence
  Identity_Domain --> Shared_Kernel
  Events_Domain --> Shared_Kernel
  Gates_Domain --> Shared_Kernel
```

## Observed cross-feature dependencies

Feature-to-feature edges only (Api/Application/Infrastructure collapsed per bounded context).

```mermaid
flowchart TB
  Events --> Gates
  Events --> HrSync
  Events --> Identity
  Events --> Shared
  Gates --> Events
  Gates --> HrSync
  Gates --> Identity
  Gates --> Shared
  HrSync --> Events
  HrSync --> Gates
  HrSync --> Identity
  HrSync --> Shared
  Identity --> Events
  Identity --> Gates
  Identity --> HrSync
  Identity --> Shared
  Platform --> Shared
  Shared --> Events
  Shared --> Gates
  Shared --> Identity
```
## Full namespace graph

Too large to render inline. Open [`dependency-graph-aggregated.mmd`](dependency-graph-aggregated.mmd) or `dependency-report.json`.
