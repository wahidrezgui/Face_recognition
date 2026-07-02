#!/usr/bin/env python3
"""Fix UTF-8 mojibake caused by Windows cmd import (latin1 misread)."""

from __future__ import annotations

import subprocess
import sys

CONTAINER = "gatevision-mysql-test"
DB = "gateprod"
DB_USER = "root"
DB_PASS = "rootpass"

SKIP_COLUMNS = {
    "password",
    "token",
    "payload",
    "exception",
    "remember_token",
    "abilities",
    "uuid",
    "email",
}

FIX_SQL = (
    "CONVERT(BINARY CONVERT(`{col}` USING latin1) USING utf8mb4)"
)


def mysql(args: list[str], input_text: str | None = None) -> str:
    cmd = [
        "docker",
        "exec",
        "-i",
        CONTAINER,
        "mysql",
        f"-u{DB_USER}",
        f"-p{DB_PASS}",
        "--default-character-set=utf8mb4",
        *args,
    ]
    result = subprocess.run(
        cmd,
        input=input_text.encode("utf-8") if input_text else None,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        stdout = result.stdout.decode("utf-8", errors="replace")
        raise RuntimeError(stderr or stdout)
    return result.stdout.decode("utf-8", errors="replace")


def main() -> int:
    print("Loading text columns from base tables ...")
    rows = mysql(
        ["-N", "-B", DB, "-e", """
SELECT c.TABLE_NAME, c.COLUMN_NAME
FROM information_schema.COLUMNS c
JOIN information_schema.TABLES t
  ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
WHERE c.TABLE_SCHEMA = DATABASE()
  AND t.TABLE_TYPE = 'BASE TABLE'
  AND c.DATA_TYPE IN ('varchar', 'text', 'mediumtext', 'longtext', 'char', 'tinytext')
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;
""".strip()]
    ).strip().splitlines()

    pairs: list[tuple[str, str]] = []
    for row in rows:
        if not row.strip():
            continue
        table, column = row.split("\t", 1)
        if column in SKIP_COLUMNS:
            continue
        pairs.append((table, column))

    print(f"Fixing {len(pairs)} columns ...")
    for idx, (table, column) in enumerate(pairs, start=1):
        sql = (
            f"UPDATE `{table}` SET `{column}` = {FIX_SQL.format(col=column)} "
            f"WHERE `{column}` IS NOT NULL AND `{column}` <> '';"
        )
        print(f"[{idx}/{len(pairs)}] {table}.{column}")
        mysql([DB], sql)

    sample = mysql(
        [DB, "-e", "SELECT id, name_ar FROM departments WHERE id=2;"]
    )
    print("Sample after fix:")
    print(sample)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
