# Wireframe (wireframe.csv) → HSRL (All Nominal code.csv) Mapping

**Source of truth:** The project uses **`wireframe.csv`** (project root: `HSRLDatabase/wireframe.csv`) only. **Do not use** `HSRL_ui/PRL Logic Bar csv.csv` or `PRL Logic Bar for Wireframe.xlsx` as the wireframe; those are for a different product and use different N/Cs.

This document maps the **wireframe.csv** metrics to **All Nominal code.csv** so the dashboard shows the correct data.

---

## Matched metrics (dashboard uses wireframe.csv + All Nominal code.csv)

| Wireframe metric | N/Cs (wireframe.csv) | HSRL (All Nominal code.csv) | Dashboard card / data |
|------------------|----------------------|------------------------------|------------------------|
| **1. Total Site Revenue – Fuel Sales** | 4000, 4001, 4002, 4003, 4004 | 4000–4004 (Adblue = 4004) | Total Site Revenue (fuel). |
| **1. Shop Sales** | 4032, 4034, 4036 | E-Pay, Paypoint/Keycharge, Lottery | Shop component of revenue. |
| **1. Valet Sales** | 4028, 4029, 4030, 4031, 4017 | Car Wash, Jet Wash, Car Vac, Car Airline, Hot Food/Costa | Valet component. |
| **2. Total Fuel Volume** | Same as Fuel Margin report | 5000–5004 (volume from details) | Total Fuel Volume. |
| **5. Total Net Profit – Fuel Profit** | Net Sales + Closing Stock − Opening Stock − Purchases | Revenue/Cost from All Nominal code.csv | Total Net Profit, Profit breakdown. |
| **6. PPL After Overheads** | Overheads: 7150, 7151, 7200, 7600, 7906 | 7150 Rent, 7151 Rates, 7200 Light & Heat, 7600 General Repairs, 7906 Credit Card Charges | PPL After Overheads, Actual PPL breakdown. |
| **8. Labour Cost** | 7000, 7001, 7005 | 7000 Gross Wages, 7001 Employers N.I. - Staff, 7005 Directors Pensions (+ 7002, 7003 per CSV) | Labour Cost, Labour Cost breakdown. |
| **15. Net Profit / ROI** | Revenue 4000–4004; Misc 4400, 4401, …; Cost 5000–5005; Overhead N/Cs in wireframe | Full CSV revenue/cost/investment N/Cs | Net Profit, EBITA, ROI. |
| **18. Overheads Breakdown** | 7151 Rates, 7150 Rent, 7200 Electricity, 7800 Repairs, 7906 Credit | 7150, 7151, 7200, 7600, 7906 (implementation) | Overhead trends, Actual PPL breakdown. |

---

## Summary

- **Fuel:** Wireframe (and dashboard) use **4000–4004** for fuel sales; **5000–5004** for volume from details.
- **Labour:** Wireframe: 7000, 7001, 7005; implementation also includes 7002, 7003 from All Nominal code.csv.
- **Overheads:** Wireframe: **7150, 7151, 7200, 7600, 7906**. Display names from **All Nominal code.csv** via `backend/data/nominalCodeNames.js`.

Data is read from `sage_audit_journal`; all N/Cs and formulas follow **wireframe.csv**.
