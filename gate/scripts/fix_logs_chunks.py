#!/usr/bin/env python3
"""Fix logs SQL chunks split mid-INSERT at byte boundaries."""

from __future__ import annotations

import re
from pathlib import Path

CHUNK_DIR = Path(__file__).resolve().parent.parent / "gateprod-split"


def log_files() -> list[Path]:
    files = [CHUNK_DIR / "logs.sql"]
    files.extend(sorted(CHUNK_DIR.glob("logs_data_*.sql"), key=lambda p: p.name))
    return files


def ends_with_complete_statement(data: bytes) -> bool:
    stripped = data.rstrip()
    return stripped.endswith(b");") or stripped.endswith(b";")


def fix_file(path: Path, is_last: bool) -> bool:
    data = path.read_bytes()
    if ends_with_complete_statement(data):
        return False

    text = data.decode("utf-8", errors="replace").rstrip()
    if not text:
        return False

    # Remove trailing comma from last value row and close INSERT.
    if text.endswith(","):
        text = text[:-1] + ";"
    elif not text.endswith(";"):
        if text.endswith(")"):
            text += ";"
        else:
            # Cut back to last complete row.
            last_row = text.rfind("\n(")
            if last_row == -1:
                raise ValueError(f"Cannot fix chunk ending: {path.name}")
            text = text[:last_row].rstrip().rstrip(",") + ";"

    path.write_bytes(text.encode("utf-8") + b"\n")
    return True


def main() -> int:
    files = log_files()
    fixed = 0
    for idx, path in enumerate(files):
        if not path.exists():
            print(f"Missing: {path.name}")
            continue
        before = path.read_bytes()
        ok_before = ends_with_complete_statement(before)
        is_last = idx == len(files) - 1
        if fix_file(path, is_last):
            fixed += 1
            print(f"Fixed: {path.name}")
        elif not ok_before:
            print(f"Still broken: {path.name}")
        else:
            print(f"OK: {path.name}")

    print(f"Done. Fixed {fixed} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
