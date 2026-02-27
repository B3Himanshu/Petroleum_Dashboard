import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Build array of all months between start and end (inclusive)
function monthsBetween(startDate, endDate) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end || start > end) return [];
  const months = [];
  const curr = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (curr <= last) {
    months.push({ year: curr.getFullYear(), month: curr.getMonth() });
    curr.setMonth(curr.getMonth() + 1);
  }
  return months;
}

// Optional minDate 'YYYY-MM-DD' — months before this are not selectable (e.g. '2025-05-01' disables Jan–Apr 2025)
export const DateRangePicker = ({ startDate, endDate, onDateChange, minDate }) => {
  const minParsed = minDate ? normalizeDate(minDate) : null;
  const isMonthDisabled = (year, monthIndex) => {
    if (!minParsed) return false;
    const d = new Date(year, monthIndex, 1);
    return d < new Date(minParsed.getFullYear(), minParsed.getMonth(), 1);
  };

  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState(() => {
    if (startDate && endDate) {
      const months = monthsBetween(startDate, endDate);
      return months.length > 0 ? months : [{ year: normalizeDate(startDate).getFullYear(), month: normalizeDate(startDate).getMonth() }];
    }
    const now = new Date();
    return [{ year: now.getFullYear(), month: now.getMonth() }];
  });
  const [tempSelectedMonths, setTempSelectedMonths] = useState(selectedMonths);
  const [tempViewMonth, setTempViewMonth] = useState(() => {
    const date = normalizeDate(startDate) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYearNum - 3 + i);

  useEffect(() => {
    if (startDate && endDate) {
      const months = monthsBetween(startDate, endDate);
      if (months.length > 0) {
        setSelectedMonths(months);
      }
    }
  }, [startDate, endDate]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = tempViewMonth.getFullYear();
  const currentMonthIndex = tempViewMonth.getMonth();

  const isMonthSelected = (year, monthIndex) => {
    return tempSelectedMonths.some(m => m.year === year && m.month === monthIndex);
  };

  const handleSelectMonth = (monthIndex) => {
    if (isMonthDisabled(currentYear, monthIndex)) return;
    const monthKey = { year: currentYear, month: monthIndex };
    
    if (isMonthSelected(currentYear, monthIndex)) {
      // Deselect if already selected
      setTempSelectedMonths(
        tempSelectedMonths.filter(m => !(m.year === currentYear && m.month === monthIndex))
      );
    } else {
      // Select month
      setTempSelectedMonths([...tempSelectedMonths, monthKey]);
    }
  };

  const handleYearChange = (change) => {
    setTempViewMonth(new Date(currentYear + change, currentMonthIndex, 1));
  };

  const handleConfirm = () => {
    // Exclude disabled months (e.g. Jan–Apr 2025 when minDate is set)
    const allowed = tempSelectedMonths.filter((m) => !isMonthDisabled(m.year, m.month));
    if (allowed.length === 0) return;

    // Sort selected months
    const sorted = [...allowed].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    setSelectedMonths(sorted);

    // Get date range from first to last selected month
    const firstMonth = sorted[0];
    const lastMonth = sorted[sorted.length - 1];
    
    const firstDay = new Date(firstMonth.year, firstMonth.month, 1);
    const lastDay = new Date(lastMonth.year, lastMonth.month + 1, 0);

    onDateChange(format(firstDay, 'yyyy-MM-dd'), format(lastDay, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempSelectedMonths([]);
  };

  const handleSelectAll = () => {
    const allMonthsThisYear = Array.from({ length: 12 }, (_, i) => ({ year: currentYear, month: i }))
      .filter((m) => !isMonthDisabled(m.year, m.month));
    const otherYears = tempSelectedMonths.filter((m) => m.year !== currentYear);
    setTempSelectedMonths([...otherYears, ...allMonthsThisYear]);
  };

  const displayYears = selectedMonths.length > 0
    ? [...new Set(selectedMonths.map((m) => m.year))].sort((a, b) => a - b)
    : [];
  const displayText = selectedMonths.length > 0
    ? `${selectedMonths.length} month${selectedMonths.length > 1 ? 's' : ''} selected${displayYears.length > 0 ? ` · ${displayYears.join(', ')}` : ''}`
    : "Select months";

  return (
    <div className="w-full space-y-2">
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (open) {
            setTempSelectedMonths([...selectedMonths]);
          }
        }}
      >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-9 px-3 border border-slate-800 bg-slate-900 text-slate-100 hover:border-slate-600 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3.5 w-3.5 text-slate-300" />
                <span className="text-xs font-medium">{displayText}</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            </Button>
          </PopoverTrigger>
          
          <PopoverContent 
            className="w-80 p-0 bg-slate-950 border border-slate-800 shadow-xl rounded-lg"
            align="start"
          >
            <div className="bg-slate-950 rounded-lg overflow-hidden">
              {/* Header with year selection dropdown + navigation */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 bg-slate-900/50">
                <button
                  onClick={() => handleYearChange(-1)}
                  className="p-0.5 hover:bg-slate-800 rounded transition-colors"
                  aria-label="Previous year"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setYearDropdownOpen((o) => !o)}
                    className="flex items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-800 transition-colors min-w-[4rem] justify-center"
                  >
                    <span className="text-xs font-semibold text-slate-100">{currentYear}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {yearDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        aria-hidden="true"
                        onClick={() => setYearDropdownOpen(false)}
                      />
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 py-1.5 w-24 max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
                        {yearOptions.map((y) => (
                          <button
                            key={y}
                            type="button"
                            onClick={() => {
                              setTempViewMonth(new Date(y, currentMonthIndex, 1));
                              setYearDropdownOpen(false);
                            }}
                            className={`block w-full text-center px-2 py-1.5 text-xs font-medium rounded mx-1 transition-colors ${
                              y === currentYear ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handleYearChange(1)}
                  className="p-0.5 hover:bg-slate-800 rounded transition-colors"
                  aria-label="Next year"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </button>
              </div>

              {/* Month Grid */}
              <div className="p-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {months.map((month, index) => {
                    const selected = isMonthSelected(currentYear, index);
                    const disabled = isMonthDisabled(currentYear, index);
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => handleSelectMonth(index)}
                        disabled={disabled}
                        className={`
                          px-2.5 py-1.5 text-xs font-medium rounded transition-all relative
                          ${disabled
                            ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-60'
                            : selected
                              ? 'bg-blue-600 text-white font-semibold shadow-md'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }
                        `}
                      >
                        {month.slice(0, 3)}
                        {selected && !disabled && (
                          <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-white rounded-full"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer with Select all, Clear, Confirm */}
              <div className="px-3 py-2 border-t border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-400">
                    {tempSelectedMonths.length} month{tempSelectedMonths.length !== 1 ? 's' : ''}
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    Select all
                  </button>
                  {tempSelectedMonths.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Button
                  onClick={handleConfirm}
                  disabled={tempSelectedMonths.length === 0}
                  className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-sm transition-colors disabled:opacity-40 disabled:bg-slate-700 disabled:cursor-not-allowed"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Selected months display below dropdown */}
        {selectedMonths.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {[...selectedMonths]
              .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
              })
              .map((m) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-600/20 border border-blue-500/40 rounded text-[11px] text-blue-300 font-medium"
                >
                  <span>{months[m.month].slice(0, 3)} '{m.year.toString().slice(-2)}</span>
                  <button
                    onClick={() => {
                      const newMonths = selectedMonths.filter(sel => !(sel.year === m.year && sel.month === m.month));
                      setSelectedMonths(newMonths);
                      if (newMonths.length > 0) {
                        const sorted = [...newMonths].sort((a, b) => {
                          if (a.year !== b.year) return a.year - b.year;
                          return a.month - b.month;
                        });
                        const firstMonth = sorted[0];
                        const lastMonth = sorted[sorted.length - 1];
                        const firstDay = new Date(firstMonth.year, firstMonth.month, 1);
                        const lastDay = new Date(lastMonth.year, lastMonth.month + 1, 0);
                        onDateChange(format(firstDay, 'yyyy-MM-dd'), format(lastDay, 'yyyy-MM-dd'));
                      }
                    }}
                    className="hover:text-blue-200 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        )}
    </div>
  );
}