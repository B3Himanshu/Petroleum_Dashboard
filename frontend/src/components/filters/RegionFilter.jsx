import { Dropdown } from "@/components/common/Dropdown";

// JSX version (no TypeScript types)
export const RegionFilter = ({ value = "all", onChange }) => (
  <div className="min-w-[150px] flex-1">
    <label className="text-xs font-medium text-muted-foreground mb-2 block">Region</label>
    <Dropdown
      defaultValue={value}
      onChange={onChange}
      placeholder="Select region"
      options={[
        { value: "all", label: "All Regions" },
        { value: "north", label: "North" },
        { value: "south", label: "South" },
        { value: "east", label: "East" },
        { value: "west", label: "West" },
      ]}
    />
  </div>
);


