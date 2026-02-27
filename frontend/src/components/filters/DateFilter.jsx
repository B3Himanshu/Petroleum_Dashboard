import { Dropdown } from "@/components/common/Dropdown";

// JSX version (no TypeScript types)
export const DateFilter = ({ month = "december", year = "2024", onMonthChange, onYearChange }) => {
  return (
    <div className="flex gap-4 flex-wrap">
      <div className="min-w-[150px] flex-1">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Month</label>
        <Dropdown
          defaultValue={month}
          onChange={onMonthChange}
          placeholder="Select month"
          options={[
            "january","february","march","april","may","june","july","august","september","october","november","december"
          ].map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))}
        />
      </div>
      <div className="min-w-[150px] flex-1">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Year</label>
        <Dropdown
          defaultValue={year}
          onChange={onYearChange}
          placeholder="Select year"
          options={[
            { value: "2022", label: "2022" },
            { value: "2023", label: "2023" },
            { value: "2024", label: "2024" },
          ]}
        />
      </div>
    </div>
  );
};


