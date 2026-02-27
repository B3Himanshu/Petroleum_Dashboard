import { Button } from "@/components/common/Button";
import { DateFilter } from "./DateFilter";
import { RegionFilter } from "./RegionFilter";
import { CategoryFilter } from "./CategoryFilter";

// JSX version: remove TypeScript interface and types
export const FilterPanel = ({ onApply, onReset }) => {
  return (
    <div className="chart-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Filters</span>
        </div>
        <button
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={onReset}
        >
          Reset
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <DateFilter />
        <RegionFilter />
        <CategoryFilter />

        <Button onClick={onApply} className="px-6">
          Apply Filters
        </Button>
      </div>
    </div>
  );
};


