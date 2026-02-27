import { DataTable } from "./DataTable";
import { TablePagination } from "./TablePagination";

const mockSales = [
  { date: "2024-06-01", region: "North", category: "Fuel", amount: 120000, orders: 120 },
  { date: "2024-06-02", region: "South", category: "Shop", amount: 85000, orders: 95 },
];

export const SalesTable = () => {
  return (
    <div className="space-y-3">
      <DataTable
        columns={[
          { key: "date", label: "Date" },
          { key: "region", label: "Region" },
          { key: "category", label: "Category" },
          { key: "amount", label: "Amount" },
          { key: "orders", label: "Orders" },
        ]}
        data={mockSales}
      />
      <TablePagination page={1} pageSize={10} total={20} />
    </div>
  );
};


