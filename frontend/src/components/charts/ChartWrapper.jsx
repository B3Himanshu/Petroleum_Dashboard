import { Card } from "@/components/common/Card";
import { Dropdown } from "@/components/common/Dropdown";

// JSX version (no TypeScript types)
export const ChartWrapper = ({ title, legend, children, timeSelector }) => {
  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-3">
          {legend}
          {timeSelector && (
            <div className="w-32">
              <Dropdown
                defaultValue="6m"
                options={[
                  { value: "1m", label: "Last 1M" },
                  { value: "3m", label: "Last 3M" },
                  { value: "6m", label: "Last 6M" },
                  { value: "12m", label: "Last 12M" },
                ]}
              />
            </div>
          )}
        </div>
      </div>
      <div className="h-[300px]">{children}</div>
    </Card>
  );
};


