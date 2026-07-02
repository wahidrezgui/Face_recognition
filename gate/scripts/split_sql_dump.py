#!/usr/bin/env python3
"""Split a phpMyAdmin SQL dump into safe import chunks."""

from __future__ import annotations

import re
import sys
from pathlib import Path

TABLE_MARKER = re.compile(r"^-- Table structure for table `([^`]+)`")
CONSTRAINTS_MARKER = "-- Constraints for dumped tables"
CHUNK_BYTES = 20 * 1024 * 1024  # 20 MB per data chunk for huge tables
SPLIT_DATA_TABLES = {"logs", "movements"}
INSERT_PREFIX = re.compile(r"^INSERT INTO `")


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: split_sql_dump.py <input.sql> [output_dir]")
        return 1

    input_path = Path(sys.argv[1]).resolve()
    output_dir = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else input_path.parent / "gateprod-split"
    output_dir.mkdir(parents=True, exist_ok=True)

    header_path = output_dir / "00_header.sql"
    constraints_path = output_dir / "99_constraints.sql"
    footer_path = output_dir / "99_footer.sql"

    table_files: dict[str, list[Path]] = {}
    table_chunk_counters: dict[str, int] = {}
    current_table: str | None = None
    current_handle = None
    chunk_bytes = 0
    in_constraints = False
    in_footer = False
    current_insert_header: bytes | None = None

    def close_current() -> None:
        nonlocal current_handle, chunk_bytes, current_insert_header
        if current_handle is not None:
            current_handle.close()
            current_handle = None
        chunk_bytes = 0
        current_insert_header = None

    def open_table_file(table: str, suffix: str = "") -> None:
        nonlocal current_handle, chunk_bytes, current_insert_header
        if current_handle is not None:
            current_handle.close()
        filename = f"{table}{suffix}.sql" if suffix else f"{table}.sql"
        path = output_dir / filename
        table_files.setdefault(table, []).append(path)
        current_handle = path.open("wb")
        chunk_bytes = 0
        current_insert_header = None

    def finalize_chunk() -> None:
        nonlocal current_handle
        if current_handle is None:
            return
        path = Path(current_handle.name)
        current_handle.close()
        current_handle = None
        data = path.read_bytes().rstrip()
        if data.endswith(b","):
            data = data[:-1] + b";"
        elif not data.endswith(b";"):
            data += b";"
        path.write_bytes(data + b"\n")

    def rotate_chunk(table: str) -> None:
        finalize_chunk()
        table_chunk_counters[table] = table_chunk_counters.get(table, 0) + 1
        idx = table_chunk_counters[table]
        open_table_file(table, f"_data_{idx:03d}")

    def write_line(table: str, raw_line: bytes, text_line: str) -> None:
        nonlocal chunk_bytes, current_insert_header

        if table not in SPLIT_DATA_TABLES:
            current_handle.write(raw_line)
            return

        is_insert_header = bool(INSERT_PREFIX.match(text_line))
        is_value_line = text_line.startswith("(")

        if is_insert_header:
            if chunk_bytes > 0 and chunk_bytes + len(raw_line) > CHUNK_BYTES:
                rotate_chunk(table)
            current_insert_header = raw_line
            current_handle.write(raw_line)
            chunk_bytes += len(raw_line)
            return

        if is_value_line and chunk_bytes > CHUNK_BYTES and current_insert_header is not None:
            header = current_insert_header
            rotate_chunk(table)
            current_insert_header = header
            current_handle.write(header)
            chunk_bytes = len(header)

        current_handle.write(raw_line)
        chunk_bytes += len(raw_line)

    with input_path.open("rb") as source:
        header_handle = header_path.open("wb")
        constraints_handle = None
        footer_handle = None

        for raw_line in source:
            line = raw_line.decode("utf-8", errors="replace")
            marker = TABLE_MARKER.match(line)

            if marker and not in_constraints:
                close_current()
                if header_handle is not None:
                    header_handle.close()
                    header_handle = None

                current_table = marker.group(1)
                open_table_file(current_table)
                write_line(current_table, raw_line, line)
                continue

            if CONSTRAINTS_MARKER in line:
                close_current()
                in_constraints = True
                current_table = None
                constraints_handle = constraints_path.open("wb")
                constraints_handle.write(raw_line)
                continue

            if in_constraints:
                if line.strip() == "COMMIT;":
                    in_constraints = False
                    in_footer = True
                    constraints_handle.write(raw_line)
                    constraints_handle.close()
                    constraints_handle = None
                    footer_handle = footer_path.open("wb")
                    continue
                constraints_handle.write(raw_line)
                continue

            if in_footer:
                footer_handle.write(raw_line)
                continue

            if header_handle is not None:
                header_handle.write(raw_line)
                continue

            if current_table is not None:
                write_line(current_table, raw_line, line)

        close_current()
        if header_handle is not None:
            header_handle.close()
        if constraints_handle is not None:
            constraints_handle.close()
        if footer_handle is not None:
            footer_handle.close()

    import_order: list[Path] = [header_path]
    table_order = [
        "badges", "badges2", "bases", "check_times", "companies_times",
        "departments", "department_bases", "employees", "employee_cars",
        "employee_notes", "employee_zones", "failed_jobs", "gates", "genders",
        "logs", "migrations", "model_has_permissions", "model_has_roles",
        "movements", "nationalities", "password_reset_tokens", "permissions",
        "personal_access_tokens", "ranks", "ranks_categories", "ranks_parents",
        "roles", "role_has_permissions", "users", "zones",
    ]

    for table in table_order:
        import_order.extend(table_files.get(table, []))

    import_order.extend([constraints_path, footer_path])

    manifest_lines: list[str] = []
    seen_files: set[Path] = set()
    for path in import_order:
        if path.exists() and path not in seen_files:
            seen_files.add(path)
            size_mb = path.stat().st_size / (1024 * 1024)
            manifest_lines.append(f"{path.name}\t{size_mb:.2f} MB")

    manifest = output_dir / "import_order.txt"
    manifest.write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")

    ps1 = output_dir / "import.ps1"
    ps1.write_text(
        """# Import gateprod SQL dump in safe order
# Usage: .\\import.ps1 -Database gateprod -User root -DbHost 127.0.0.1

param(
    [string]$Database = "gateprod",
    [string]$User = "root",
    [string]$DbHost = "127.0.0.1",
    [int]$Port = 3306,
    [string]$Password = ""
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$orderFile = Join-Path $here "import_order.txt"

if (-not (Test-Path $orderFile)) {
    throw "import_order.txt not found. Run split_sql_dump.py first."
}

$files = Get-Content $orderFile | ForEach-Object { ($_ -split "`t")[0] }
$i = 0
$total = $files.Count

foreach ($file in $files) {
    $i++
    $path = Join-Path $here $file
    if (-not (Test-Path -LiteralPath $path)) {
        Write-Warning "Skipping missing file: $file"
        continue
    }
    Write-Host "[$i/$total] Importing $file ..."
    $sourcePath = (Resolve-Path -LiteralPath $path).Path -replace '\\\\','/'
    if ($Password) {
        & mysql -h $DbHost -P $Port -u $User -p$Password $Database -e "source $sourcePath"
    } else {
        & mysql -h $DbHost -P $Port -u $User $Database -e "source $sourcePath"
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Import failed on $file (exit $LASTEXITCODE)"
    }
}

Write-Host "Done. Imported $total files into $Database."
""",
        encoding="utf-8",
    )

    readme = output_dir / "README.txt"
    readme.write_text(
        f"""gateprod SQL dump split for safe import
========================================

Source: {input_path.name}
Output: {output_dir}

Import order:
1. 00_header.sql          - session settings + START TRANSACTION
2. <table>.sql files      - schema + data per table
3. logs_data_*.sql        - logs table split into ~20MB chunks
4. movements_data_*.sql   - movements split if large
5. 99_constraints.sql     - foreign keys (run after all tables)
6. 99_footer.sql          - COMMIT + restore client settings

Quick import (PowerShell):
  cd "{output_dir}"
  .\\import.ps1 -Database gateprod -User root

Manual import (recommended for large files):
  mysql -u root -p gateprod < 00_header.sql
  mysql -u root -p gateprod < badges.sql
  ... (see import_order.txt for full list)

Files created: {len(manifest_lines)}
""",
        encoding="utf-8",
    )

    print(f"Split complete -> {output_dir}")
    print(f"Files: {len(manifest_lines)}")
    for line in manifest_lines:
        print(f"  {line}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
