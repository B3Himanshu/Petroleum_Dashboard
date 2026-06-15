import { useState, useEffect, useRef, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardAPI } from "@/services/api";
import { ChevronDown, Check } from "lucide-react";
import { useIsSmUp } from "@/hooks/use-mobile";
import {
  dashTickSecondary,
  dashAxisLabel,
  dashTooltipTitlePx,
  dashTooltipBodyPx,
  dashLegendFontPx,
  dashLegendIconSize,
  dashLegendItemClass,
  dashCartesianGridProps,
  dashXAxisIntervalDenseMonths,
  dashXAxisTickSizePrimary,
  formatMonthAxisTick,
} from "@/lib/dashboardChartTypography";

const ALL_CATEGORIES = [
  { key: 'labour',        label: 'Wages', color: 'hsl(var(--chart-blue))', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600' },
  { key: 'rent',          label: 'Rent', color: '#7c3aed', bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-600' },
  { key: 'rentals',       label: 'Rentals', color: '#6d28d9', bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-700' },
  { key: 'generalRates',  label: 'General Rates', color: '#8b5cf6', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-600' },
  { key: 'waterRates',    label: 'Water Rates', color: '#0ea5e9', bg: 'bg-sky-50 dark:bg-sky-950/20', text: 'text-sky-600' },
  { key: 'heatLightPower',label: 'Electricity', color: '#06b6d4', bg: 'bg-cyan-50 dark:bg-cyan-950/20', text: 'text-cyan-600' },
  { key: 'insurance',     label: 'Insurance', color: '#14b8a6', bg: 'bg-teal-50 dark:bg-teal-950/20', text: 'text-teal-600' },
  { key: 'mileage',       label: 'Mileage Expenses', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600' },
  { key: 'motor',         label: 'Motor Expenses', color: '#f97316', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-600' },
  { key: 'travel',        label: 'Travelling and Entertainment', color: '#ef4444', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600' },
  { key: 'royalty',       label: 'Royalty', color: '#a855f7', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-600' },
  { key: 'franchiseeFees',label: 'Franchisee Fees', color: '#a78bfa', bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-600' },
  { key: 'repairs',       label: 'Repairs & Renewals', color: '#84cc16', bg: 'bg-lime-50 dark:bg-lime-950/20', text: 'text-lime-600' },
  { key: 'printingStationery', label: 'Printing and Stationery', color: '#64748b', bg: 'bg-slate-50 dark:bg-slate-950/20', text: 'text-slate-600' },
  { key: 'advertisementBusinessPromotion', label: 'Advertisement & Business Promotion', color: '#eab308', bg: 'bg-yellow-50 dark:bg-yellow-950/20', text: 'text-yellow-600' },
  { key: 'repairMaintenance', label: 'Repair & Maintenance', color: '#22c55e', bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-600' },
  { key: 'bankInterestCharges', label: 'Bank Interest and Charges', color: '#0d9488', bg: 'bg-teal-50 dark:bg-teal-950/20', text: 'text-teal-600' },
  { key: 'pollingCharges', label: 'Polling Charges', color: '#d946ef', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20', text: 'text-fuchsia-600' },
  { key: 'creditCharges', label: 'Credit Card Charges', color: '#c026d3', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20', text: 'text-fuchsia-600' },
  { key: 'badDebts',      label: 'Bad Debts', color: '#dc2626', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600' },
  { key: 'cashUnderOver', label: 'Cash Under/Over', color: '#f43f5e', bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-600' },
  { key: 'legalProfessional', label: 'Legal & Professional', color: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-600' },
  { key: 'telephoneCosts', label: 'Telephone Costs', color: '#0c4a6e', bg: 'bg-sky-50 dark:bg-sky-950/20', text: 'text-sky-600' },
  { key: 'generalExpenses', label: 'General Expenses', color: '#78716c', bg: 'bg-stone-50 dark:bg-stone-950/20', text: 'text-stone-600' },
  { key: 'loanInterest', label: 'Loan Interest', color: '#b91c1c', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700' },
  { key: 'overdraftInterest', label: 'Overdraft Interest', color: '#9f1239', bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-700' },
  { key: 'arrangementFees', label: 'Arrangement Fees', color: '#4338ca', bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-700' },
  { key: 'guaranteeFees', label: 'Guarantee Fees', color: '#7e22ce', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-700' },
  { key: 'depreciation', label: 'Depreciation', color: '#475569', bg: 'bg-slate-50 dark:bg-slate-950/20', text: 'text-slate-600' },
];

const DEFAULT_VISIBLE = new Set(['labour', 'rent', 'rentals', 'generalRates', 'creditCharges']);

export const OverheadTrendsChart = ({ startDate, endDate, siteIds, showInMillions = true }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState(new Set(DEFAULT_VISIBLE));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTooltipLabel, setActiveTooltipLabel] = useState(null);
  const rotateRootRef = useRef(null);
  const dropdownRef = useRef(null);
  const smUp = useIsSmUp();

  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData([]);
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await dashboardAPI.getPetrolOverheadTrends(startDate, endDate, siteIds);
        const data = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setChartData(data);
      } catch (err) {
        console.error('[OverheadTrendsChart] Error:', err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate, siteIds]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categoriesWithData = useMemo(() => {
    if (!chartData.length) return [];
    return ALL_CATEGORIES.filter(c =>
      chartData.some(d => Math.abs(d[c.key] || 0) > 0)
    );
  }, [chartData]);

  const DEFAULT_KEY_ORDER = ['labour', 'rent', 'rentals', 'generalRates', 'creditCharges'];
  const categoriesForFilter = useMemo(() => {
    return [...categoriesWithData].sort((a, b) => {
      const ia = DEFAULT_KEY_ORDER.indexOf(a.key);
      const ib = DEFAULT_KEY_ORDER.indexOf(b.key);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      const oa = ALL_CATEGORIES.findIndex((c) => c.key === a.key);
      const ob = ALL_CATEGORIES.findIndex((c) => c.key === b.key);
      return (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob);
    });
  }, [categoriesWithData]);

  const activeCategories = useMemo(() => categoriesWithData.filter(c => visibleKeys.has(c.key)), [categoriesWithData, visibleKeys]);

  const xAxisInterval = dashXAxisIntervalDenseMonths(smUp, chartData.length);
  const denseMobileOH = !smUp && chartData.length > 6;


  const toggleKey = (key) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fmt = (v) => {
    const a = Math.abs(v);
    if (showInMillions) {
      if (a >= 1e6) return `£${(a / 1e6).toFixed(2)}M`;
      if (a >= 1e3) return `£${(a / 1e3).toFixed(2)}K`;
      return `£${a.toFixed(2)}`;
    }
    const [i, d] = a.toFixed(2).split('.');
    return `£${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${d}`;
  };

  /** Desktop 2-col grid: truncate at 14 chars. */
  const shortLabelDesktop = (label) => label.length > 14 ? label.slice(0, 13).trimEnd() + '…' : label;

  /** Shared row renderer — used by both desktop and mobile tooltips. */
  const TooltipRows = ({ row, twoCol }) => {
    const visibleRows = activeCategories.filter(c => (row[c.key] || 0) !== 0);
    return (
      <>
        <div style={{
          display: "grid",
          gridTemplateColumns: twoCol ? "1fr 1fr" : "1fr",
          columnGap: 14,
          rowGap: twoCol ? 3 : 4,
        }}>
          {visibleRows.map(c => (
            <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: c.color, flexShrink: 0 }} />
              <span style={{
                fontSize: twoCol ? 10 : 11,
                color: "rgba(255,255,255,0.78)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}>
                {twoCol ? shortLabelDesktop(c.label) : c.label}
              </span>
              <span style={{ fontSize: twoCol ? 10 : 11, color: c.color, fontWeight: 600, whiteSpace: "nowrap", paddingLeft: 4 }}>
                {fmt(row[c.key] || 0)}
              </span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", marginTop: 5, paddingTop: 5, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>Total:</span>
          <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{fmt(row.total || 0)}</span>
        </div>
      </>
    );
  };

  /** Desktop tooltip — follows cursor, uses 2-col grid. */
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      const many = activeCategories.length > 6;
      return (
        <div style={{
          backgroundColor: "hsl(222,47%,11%)",
          border: "1px solid hsl(217,33%,20%)",
          borderRadius: 10,
          padding: "8px 12px",
          minWidth: many ? 320 : 200,
          maxWidth: 420,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 12, marginBottom: 6, letterSpacing: "0.02em" }}>{row.month}</p>
          <TooltipRows row={row} twoCol={many} />
        </div>
      );
    }
    return null;
  };

  const avg = (key) => chartData.length ? chartData.reduce((s, d) => s + (d[key] || 0), 0) / chartData.length : 0;

  return (
    <Card>
      <CardContent className="px-3 pb-3 pt-3 sm:px-6 sm:pb-6 sm:pt-6">
        {loading ? (
          <div className="h-80 bg-muted animate-pulse rounded-lg" />
        ) : chartData.length > 0 ? (
          <div className="space-y-4">
            {/* Filter: all categories in one dropdown (same as Overhead Cost Breakdown) */}
            <div className="flex items-center gap-2 flex-wrap">
              {categoriesWithData.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((p) => !p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background text-muted-foreground hover:bg-muted transition-colors"
                  >
                    More Overheads
                    <ChevronDown className={`h-3 w-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute z-50 mt-1 left-0 min-w-[260px] max-h-[min(70vh,420px)] overflow-y-auto bg-background border border-border rounded-lg shadow-lg py-1">
                      {categoriesForFilter.map((c) => {
                        const on = visibleKeys.has(c.key);
                        return (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => toggleKey(c.key)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                          >
                            <span
                              className="w-3 h-3 rounded-sm border flex items-center justify-center shrink-0"
                              style={
                                on
                                  ? { backgroundColor: c.color, borderColor: c.color }
                                  : { borderColor: '#d1d5db' }
                              }
                            >
                              {on && <Check className="h-2 w-2 text-white" />}
                            </span>
                            <span className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                              {c.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Legend rendered outside Recharts on both desktop and mobile — never overlaps chart */}
            {activeCategories.length > 0 && (
              <div className={smUp
                ? "flex flex-wrap gap-x-4 gap-y-1.5 mb-3 px-1"
                : "flex flex-wrap gap-x-3 gap-y-1 mb-2 px-1"
              }>
                {activeCategories.map(c => (
                  <div key={c.key} className="flex items-center gap-1.5">
                    <span style={{ width: smUp ? 10 : 8, height: smUp ? 10 : 8, borderRadius: "50%", backgroundColor: c.color, flexShrink: 0 }} />
                    <span style={{ fontSize: smUp ? "14px" : "10px", fontWeight: 500, color: "hsl(var(--foreground))" }}>{c.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div ref={rotateRootRef} className="w-full">
              <div data-rotate-fill className="w-full">
                {/* Mobile layout: label column + chart column */}
                <div data-rotate-plot style={{ width: "100%", height: smUp ? 350 : 320, display: "flex", position: "relative" }}>

                  {/* Mobile-only: dedicated Y-axis label column on the far left */}
                  {!smUp && (
                    <div style={{
                      width: 18,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingRight: 2,
                    }}>
                      <span style={{
                        transform: "rotate(-90deg)",
                        whiteSpace: "nowrap",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "hsl(var(--foreground))",
                        letterSpacing: "0.02em",
                      }}>
                        Cost (£)
                      </span>
                    </div>
                  )}

                  {/* Chart — takes remaining width */}
                  <div style={{ flex: 1, position: "relative", height: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={smUp
                        ? { top: 10, right: 20, left: 40, bottom: 20 }
                        : { top: 8, right: 8, left: 0, bottom: 20 }}
                      onMouseMove={(d) => { if (!smUp && d?.activeLabel) setActiveTooltipLabel(d.activeLabel); }}
                      onMouseLeave={() => { if (!smUp) setActiveTooltipLabel(null); }}
                    >
                      <defs>
                        {activeCategories.map(c => (
                          <linearGradient key={c.key} id={`color_${c.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={c.color} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={c.color} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid {...dashCartesianGridProps} />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: smUp ? dashXAxisTickSizePrimary(smUp) : 9, fontWeight: 500 }}
                        angle={smUp ? 0 : -45}
                        textAnchor={smUp ? "middle" : "end"}
                        height={smUp ? 28 : 46}
                        interval={xAxisInterval}
                        minTickGap={smUp ? 4 : 0}
                        tickFormatter={formatMonthAxisTick}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={smUp ? 76 : 44}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: smUp ? dashTickSecondary(smUp) : 10, fontWeight: 500 }}
                        tickFormatter={(v) => showInMillions ? `£${(v / 1000).toFixed(0)}K` : `£${Math.round(v).toLocaleString('en-GB')}`}
                        label={smUp ? {
                          value: "Cost (£)",
                          angle: -90,
                          position: "left",
                          offset: 6,
                          dx: -6,
                          style: { fill: "hsl(var(--muted-foreground))", fontSize: dashAxisLabel(smUp), fontWeight: 600 },
                        } : undefined}
                      />
                      {smUp && (
                        <Tooltip
                          content={<CustomTooltip />}
                          allowEscapeViewBox={{ x: false, y: true }}
                          offset={10}
                          wrapperStyle={{ zIndex: 50 }}
                        />
                      )}
                      {!smUp && <Tooltip content={() => null} cursor={{ fill: "rgba(0,0,0,0.04)" }} />}
                      {activeCategories.map(c => (
                        <Area
                          key={c.key}
                          type="monotone"
                          dataKey={c.key}
                          stackId="1"
                          stroke={c.color}
                          strokeWidth={smUp ? 1.5 : 1}
                          fillOpacity={1}
                          fill={`url(#color_${c.key})`}
                          name={c.label}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            </div>

            {/* Mobile-only tap tooltip — full width, single column, below chart */}
            {!smUp && activeTooltipLabel && (() => {
              const row = chartData.find(d => d.month === activeTooltipLabel);
              if (!row) return null;
              return (
                <div style={{
                  backgroundColor: "hsl(222,47%,11%)",
                  border: "1px solid hsl(217,33%,20%)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                }}>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: 12, marginBottom: 6, letterSpacing: "0.02em" }}>{activeTooltipLabel}</p>
                  <TooltipRows row={row} twoCol={false} />
                </div>
              );
            })()}

            {/* Summary cards — only for active categories */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 pt-3 sm:pt-4 border-t">
              {activeCategories.map(c => (
                <div key={c.key} className={`p-3 sm:flex-1 sm:min-w-[140px] ${c.bg} rounded-lg`}>
                  <p className="text-xs text-muted-foreground mb-1 break-words">Avg {c.label}</p>
                  <p className={`text-base font-bold ${c.text} break-all`}>
                    {fmt(avg(c.key))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
