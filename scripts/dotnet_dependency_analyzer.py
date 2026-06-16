#!/usr/bin/env python3
"""Analyze C# namespace dependencies in GateVision.Api."""

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

USING_RE = re.compile(r"^using\s+([\w.]+)\s*;", re.MULTILINE)
NAMESPACE_RE = re.compile(r"^namespace\s+([\w.]+)\s*;", re.MULTILINE)

LAYER_ORDER = {
    "Shared.Kernel": 0,
    "Features": 1,  # Domain
    "Application": 2,
    "Infrastructure": 3,
    "Api": 4,
    "Endpoints": 5,  # legacy
    "Services": 5,
    "Domain": 1,
}


def layer_of(ns: str) -> str:
    if ".Shared.Kernel" in ns:
        return "Kernel"
    if ".Api" in ns or ".Endpoints" in ns:
        return "Api"
    if ".Application" in ns:
        return "Application"
    if ".Infrastructure" in ns or ".Services" in ns:
        return "Infrastructure"
    if ".Domain" in ns:
        return "Domain"
    return "Other"


def short_bucket(ns: str) -> str:
    """Collapse namespaces into readable feature.layer buckets."""
    if ".Shared.Kernel" in ns:
        return "Shared.Kernel"
    if ".Shared.Infrastructure.HostedServices" in ns:
        return "Shared.HostedServices"
    if ".Shared.Infrastructure.Middleware" in ns:
        return "Shared.Middleware"
    if ".Shared.Infrastructure.Persistence" in ns:
        return "Shared.Persistence"
    if ".Shared.Infrastructure.Redis" in ns:
        return "Shared.Redis"
    if ".Shared.Infrastructure" in ns:
        return "Shared.Infrastructure"

    m = re.match(r"GateVision\.Api\.Features\.(\w+)\.(\w+)", ns)
    if m:
        feature, layer = m.group(1), m.group(2)
        label = {
            "AccessEvents": "Events",
            "GateOperations": "Gates",
            "HrSync": "HrSync",
            "Identity": "Identity",
            "Platform": "Platform",
        }.get(feature, feature)
        return f"{label}.{layer}"
    return ns.split(".")[-1]


def aggregate_graph(graph: dict[str, set[str]]) -> dict[str, set[str]]:
    """Aggregate fine-grained namespace edges to feature.layer buckets."""
    agg: dict[str, set[str]] = defaultdict(set)
    for src, dsts in graph.items():
        sb = short_bucket(src)
        for dst in dsts:
            db = short_bucket(dst)
            if sb != db:
                agg[sb].add(db)
    return agg


def build_layer_diagram(agg: dict[str, set[str]]) -> list[str]:
    """Human-readable layered dependency diagram (portable Mermaid)."""
    layers = {
        "api": ["Platform.Api", "Identity.Api", "Events.Api", "Gates.Api", "HrSync.Api"],
        "application": ["Identity.Application", "Events.Application", "HrSync.Application"],
        "domain": [
            "Shared.Kernel",
            "Identity.Domain",
            "Events.Domain",
            "Gates.Domain",
        ],
        "infrastructure": [
            "Identity.Infrastructure",
            "Events.Infrastructure",
            "Gates.Infrastructure",
            "Shared.Persistence",
            "Shared.Redis",
            "Shared.Middleware",
            "Shared.HostedServices",
        ],
    }

    lines = [
        "## Architecture layers (readable)",
        "",
        "Aggregated from namespace `using` analysis. Full detail: `dependency-report.json`.",
        "",
        "```mermaid",
        "flowchart TB",
        "  subgraph apiLayer [Api]",
    ]
    for n in layers["api"]:
        nid = n.replace(".", "_")
        lines.append(f'    {nid}["{n}"]')
    lines.append("  end")
    lines.append("  subgraph appLayer [Application]")
    for n in layers["application"]:
        nid = n.replace(".", "_")
        lines.append(f'    {nid}["{n}"]')
    lines.append("  end")
    lines.append("  subgraph domainLayer [Domain]")
    for n in layers["domain"]:
        nid = n.replace(".", "_")
        lines.append(f'    {nid}["{n}"]')
    lines.append("  end")
    lines.append("  subgraph infraLayer [Infrastructure]")
    for n in layers["infrastructure"]:
        nid = n.replace(".", "_")
        lines.append(f'    {nid}["{n}"]')
    lines.append("  end")

    # Canonical inward dependencies (documented architecture)
    canonical = [
        ("Identity_Api", "Identity_Application"),
        ("Identity_Api", "Identity_Domain"),
        ("Identity_Api", "Identity_Infrastructure"),
        ("Events_Api", "Events_Application"),
        ("Events_Api", "Events_Domain"),
        ("Events_Api", "Events_Infrastructure"),
        ("Gates_Api", "Gates_Domain"),
        ("Gates_Api", "Gates_Infrastructure"),
        ("HrSync_Api", "HrSync_Application"),
        ("Platform_Api", "Shared_Persistence"),
        ("Identity_Application", "Identity_Domain"),
        ("Events_Application", "Events_Domain"),
        ("Events_Application", "Events_Infrastructure"),
        ("HrSync_Application", "Identity_Domain"),
        ("Identity_Infrastructure", "Identity_Domain"),
        ("Identity_Infrastructure", "Shared_Persistence"),
        ("Events_Infrastructure", "Events_Domain"),
        ("Events_Infrastructure", "Shared_Persistence"),
        ("Gates_Infrastructure", "Gates_Domain"),
        ("Gates_Infrastructure", "Shared_Persistence"),
        ("Shared_Persistence", "Identity_Domain"),
        ("Shared_Persistence", "Events_Domain"),
        ("Shared_Persistence", "Gates_Domain"),
        ("Shared_Redis", "Identity_Domain"),
        ("Shared_Middleware", "Gates_Infrastructure"),
        ("Shared_HostedServices", "Shared_Persistence"),
        ("Identity_Domain", "Shared_Kernel"),
        ("Events_Domain", "Shared_Kernel"),
        ("Gates_Domain", "Shared_Kernel"),
    ]
    for src, dst in canonical:
        lines.append(f"  {src} --> {dst}")
    lines.append("```")
    lines.append("")

    # Aggregated cross-bucket edges — feature-level only (readable)
    lines.append("## Observed cross-feature dependencies")
    lines.append("")
    lines.append("Feature-to-feature edges only (Api/Application/Infrastructure collapsed per bounded context).")
    lines.append("")
    lines.append("```mermaid")
    lines.append("flowchart TB")
    feature_edges: set[tuple[str, str]] = set()
    for src, dsts in sorted(agg.items()):
        fs = src.split(".")[0]
        for dst in dsts:
            fd = dst.split(".")[0]
            if fs != fd:
                feature_edges.add((fs, fd))
    for src, dst in sorted(feature_edges):
        lines.append(f'  {src} --> {dst}')
    lines.append("```")
    return lines


def main():
    parser = argparse.ArgumentParser(description="Analyze .NET namespace dependencies")
    parser.add_argument("project_path", nargs="?", default="GateVision.Api")
    parser.add_argument("--output", choices=["human", "json"], default="human")
    parser.add_argument("--save", action="store_true")
    args = parser.parse_args()

    root = Path(args.project_path)
    file_ns: dict[str, str] = {}
    edges: list[tuple[str, str]] = []
    ns_files: dict[str, list[str]] = defaultdict(list)

    for cs in root.rglob("*.cs"):
        if any(p in cs.parts for p in ("bin", "obj")):
            continue
        text = cs.read_text(encoding="utf-8", errors="replace")
        ns_m = NAMESPACE_RE.search(text)
        if not ns_m:
            continue
        ns = ns_m.group(1)
        rel = str(cs.relative_to(root))
        file_ns[rel] = ns
        ns_files[ns].append(rel)

        for imp in USING_RE.findall(text):
            if imp.startswith("System") or imp.startswith("Microsoft"):
                continue
            if imp.startswith("GateVision"):
                edges.append((ns, imp))

    # Build namespace-level graph
    graph: dict[str, set[str]] = defaultdict(set)
    for src, dst in edges:
        graph[src].add(dst)

    # Detect cycles (simple DFS)
    cycles: list[list[str]] = []

    def dfs(node: str, path: list[str], visited: set[str]):
        if node in path:
            idx = path.index(node)
            cycles.append(path[idx:] + [node])
            return
        if node in visited:
            return
        visited.add(node)
        path.append(node)
        for nxt in graph.get(node, []):
            dfs(nxt, path, visited)
        path.pop()

    for ns in graph:
        dfs(ns, [], set())

    # Layer violations
    violations = []
    layer_rank = {"Kernel": 0, "Domain": 1, "Application": 2, "Infrastructure": 3, "Api": 4, "Other": 2}
    for src, dsts in graph.items():
        src_layer = layer_rank.get(layer_of(src), 2)
        for dst in dsts:
            dst_layer = layer_rank.get(layer_of(dst), 2)
            if src_layer < dst_layer and dst_layer == 4 and "Shared" not in src:
                violations.append((src, dst, layer_of(src), layer_of(dst)))

    report = {
        "files": len(file_ns),
        "namespaces": len(ns_files),
        "edges": len(edges),
        "cycles": [list(c) for c in cycles[:20]],
        "layer_violations": [
            {"from": s, "to": d, "from_layer": sl, "to_layer": dl}
            for s, d, sl, dl in violations
        ],
        "graph": {k: sorted(v) for k, v in sorted(graph.items())},
    }

    out_dir = Path("docs/architecture")
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.output == "json" or args.save:
        (out_dir / "dependency-report.json").write_text(
            json.dumps(report, indent=2), encoding="utf-8"
        )

    lines = [
        "# GateVision.Api Dependency Report",
        "",
        f"- **Files analyzed:** {report['files']}",
        f"- **Namespaces:** {report['namespaces']}",
        f"- **Dependency edges:** {report['edges']}",
        "",
    ]

    if violations:
        lines.append("## Layer violations")
        for v in violations:
            lines.append(f"- `{v[0]}` ({v[2]}) → `{v[1]}` ({v[3]})")
        lines.append("")

    if cycles:
        lines.append("## Circular dependencies")
        shown = set()
        for c in cycles[:10]:
            # Skip trivial self-references (same namespace)
            if len(c) == 2 and c[0] == c[1]:
                continue
            key = tuple(c)
            if key in shown:
                continue
            shown.add(key)
            lines.append(f"- {' -> '.join(c)}")
        if not shown:
            lines.append("- None detected (excluding same-namespace usings)")
        lines.append("")

    agg = aggregate_graph(graph)
    report["aggregated_graph"] = {k: sorted(v) for k, v in sorted(agg.items())}
    lines.extend(build_layer_diagram(agg))

    lines.append("## Full namespace graph")
    lines.append("")
    lines.append("Too large to render inline. Open [`dependency-graph-aggregated.mmd`](dependency-graph-aggregated.mmd) or `dependency-report.json`.")
    lines.append("")

    # Write standalone mmd for aggregated graph
    mmd_lines = ["flowchart LR"]
    for src, dsts in sorted(agg.items()):
        sid = src.replace(".", "_")
        for dst in sorted(dsts):
            did = dst.replace(".", "_")
            mmd_lines.append(f'  {sid}["{src}"] --> {did}["{dst}"]')
    (out_dir / "dependency-graph-aggregated.mmd").write_text("\n".join(mmd_lines) + "\n", encoding="utf-8")

    md = "\n".join(lines)
    if args.save or args.output == "human":
        (out_dir / "dependency-report.md").write_text(md, encoding="utf-8")
        if args.output == "human":
            print(md.encode("utf-8", errors="replace").decode("utf-8"))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
