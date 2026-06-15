#!/usr/bin/env python3
"""
Check ROI investment nominal codes in PostgreSQL (same 7 "yellow" codes as petrolDataSage ROI).

Reads connection from env (same as Node backend):
  - Loads: HSRLDATABASEcomplete/.env then HSRL_ui/backend/.env (complete overrides)
  - DATABASE_URL or DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

Table/columns aligned with petrolDataSage.js:
  sage_audit_journal, nominal_code, amount, sage_date, dept_number

Usage (from repo root or backend):
  pip install -r scripts/requirements-roi-check.txt
  python scripts/check_roi_investment_codes.py

  # Optional: only these departments (comma-separated ints), e.g. head office only:
  python scripts/check_roi_investment_codes.py --dept 0
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Install dependencies: pip install -r scripts/requirements-roi-check.txt", file=sys.stderr)
    raise

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


# Seven ROI investment codes only (cost / asset lines — not depreciation)
ROI_INVESTMENT_CODES = ("0010", "0030", "0034", "0040", "0050", "0060", "0070")

CODE_LABELS = {
    "0010": "Motor Vehicles",
    "0030": "Freehold Land & Buildings-Cost",
    "0034": "Site Development & Improvement",
    "0040": "Plant & Machinery - Cost",
    "0050": "Fixture & Fitting",
    "0060": "Other Assets",
    "0070": "Investment Property",
}


def _repo_root() -> Path:
    # .../HSRL_ui/backend/scripts/this_file.py -> parents[3] = HSRLDatabase (repo)
    return Path(__file__).resolve().parents[3]


def load_env_files() -> None:
    if not load_dotenv:
        return
    root = _repo_root()
    backend_env = root / "HSRL_ui" / "backend" / ".env"
    complete_env = root / "HSRLDATABASEcomplete" / ".env"
    if backend_env.is_file():
        load_dotenv(backend_env, override=False)
    if complete_env.is_file():
        load_dotenv(complete_env, override=True)


def connect():
    url = os.environ.get("DATABASE_URL")
    if url:
        # Strip sslmode if present (optional)
        return psycopg2.connect(url)

    host = os.environ.get("DB_HOST", "localhost")
    port = int(os.environ.get("DB_PORT", "5432"))
    name = os.environ.get("DB_NAME", "petroleum_db")
    user = os.environ.get("DB_USER")
    password = os.environ.get("DB_PASSWORD", "")
    if not user:
        print("Set DATABASE_URL or DB_USER (and DB_HOST, DB_NAME, etc.) in .env", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(
        host=host,
        port=port,
        dbname=name,
        user=user,
        password=password,
    )


def set_search_path(cur) -> None:
    path = os.environ.get("DB_SEARCH_PATH")
    if path:
        # safe: only commas and identifiers from env — same as Node
        safe = ", ".join(p.strip() for p in path.split(",") if p.strip())
        if safe:
            cur.execute(f"SET search_path TO {safe}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify ROI investment N/C data in sage_audit_journal")
    parser.add_argument(
        "--dept",
        type=str,
        default="",
        help="Optional comma-separated dept_number filter (e.g. 0 or 6,7). Omit = all sites.",
    )
    args = parser.parse_args()
    dept_filter = []
    if args.dept.strip():
        for part in args.dept.split(","):
            part = part.strip()
            if part:
                dept_filter.append(int(part))

    load_env_files()

    codes_sql = ", ".join("%s" for _ in ROI_INVESTMENT_CODES)

    dept_clause = ""
    params: list = list(ROI_INVESTMENT_CODES)
    if dept_filter:
        dept_clause = " AND (NULLIF(TRIM(dept_number::text), '')::int) IN (" + ",".join(["%s"] * len(dept_filter)) + ")"
        params.extend(dept_filter)

    # Match petrolDataSage DATE_EXPR / AMOUNT_EXPR
    date_expr = "(NULLIF(TRIM(sage_date), ''))::date"
    amt_expr = "(NULLIF(TRIM(amount), ''))::numeric"

    summary_sql = f"""
        SELECT
            TRIM(nominal_code::text) AS nc,
            COUNT(*)::bigint AS row_count,
            COALESCE(SUM({amt_expr}), 0)::numeric AS net_sum,
            MIN({date_expr}) AS min_date,
            MAX({date_expr}) AS max_date
        FROM sage_audit_journal
        WHERE TRIM(nominal_code::text) IN ({codes_sql})
        {dept_clause}
        GROUP BY TRIM(nominal_code::text)
        ORDER BY TRIM(nominal_code::text)
    """

    total_all_sql = f"""
        SELECT
            COUNT(*)::bigint AS row_count,
            COALESCE(SUM({amt_expr}), 0)::numeric AS net_sum
        FROM sage_audit_journal
        WHERE TRIM(nominal_code::text) IN ({codes_sql})
        {dept_clause}
    """

    by_dept_sql = f"""
        SELECT
            COALESCE(NULLIF(TRIM(dept_number::text), '')::int, -1) AS dept,
            COUNT(*)::bigint AS row_count,
            COALESCE(SUM({amt_expr}), 0)::numeric AS net_sum
        FROM sage_audit_journal
        WHERE TRIM(nominal_code::text) IN ({codes_sql})
        {dept_clause}
        GROUP BY 1
        ORDER BY 1
    """

    print("=" * 72)
    print("ROI investment codes check (7 yellow codes only)")
    print("Codes:", ", ".join(ROI_INVESTMENT_CODES))
    if dept_filter:
        print("Dept filter:", dept_filter, "(single-site / subset)")
    else:
        print("Dept filter: none (all departments / all sites)")
    print("=" * 72)

    conn = connect()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            set_search_path(cur)
            cur.execute("SELECT current_database() AS db, current_setting('search_path', true) AS sp")
            meta = cur.fetchone()
            print(f"Database: {meta['db']}")
            print(f"search_path: {meta['sp']}")
            print()

            cur.execute(summary_sql, params)
            rows = cur.fetchall()
            found = {r["nc"] for r in rows}

            print(f"{'Code':<6} {'Label':<38} {'Rows':>8} {'Net sum':>16} {'Min date':<12} {'Max date':<12}")
            print("-" * 72)
            for code in ROI_INVESTMENT_CODES:
                r = next((x for x in rows if x["nc"] == code), None)
                label = (CODE_LABELS.get(code, "") or "")[:36]
                if not r:
                    print(f"{code:<6} {label:<38} {'0':>8} {'0':>16} {'—':<12} {'—':<12}  (no rows)")
                    continue
                print(
                    f"{code:<6} {label:<38} {r['row_count']!s:>8} {str(r['net_sum']):>16} "
                    f"{str(r['min_date'] or '—'):<12} {str(r['max_date'] or '—'):<12}"
                )

            missing = [c for c in ROI_INVESTMENT_CODES if c not in found]
            if missing:
                print()
                print("WARNING: No rows for codes:", ", ".join(missing))

            cur.execute(total_all_sql, params)
            tot = cur.fetchone()
            print("-" * 72)
            print(f"{'TOTAL':<6} {'(all 7 codes)':<38} {tot['row_count']!s:>8} {str(tot['net_sum']):>16}")

            if not dept_filter:
                print()
                print("--- Breakdown by dept_number (same 7 codes, no dept filter) ---")
                cur.execute(by_dept_sql, list(ROI_INVESTMENT_CODES))
                for r in cur.fetchall():
                    d = r["dept"]
                    dept_label = "unknown/blank" if d == -1 else str(d)
                    print(f"  Dept {dept_label}: rows={r['row_count']}, net_sum={r['net_sum']}")

            print()
            print("Note: Dashboard ROI applies site filter when sites are selected; this script")
            print("  defaults to ALL depts so you can confirm data exists outside one site.")
    finally:
        conn.close()

    print("=" * 72)


if __name__ == "__main__":
    main()
