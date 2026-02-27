import { DataTable } from "./DataTable";
import { TablePagination } from "./TablePagination";

const mockCards = [
  { card: "Premium Rewards", bank: "Chase", annualFee: 95, rewardRate: "2.5%" },
  { card: "Platinum Travel", bank: "Amex", annualFee: 199, rewardRate: "3.0%" },
];

export const CreditCardTable = () => {
  return (
    <div className="space-y-3">
      <DataTable
        columns={[
          { key: "card", label: "Card Name" },
          { key: "bank", label: "Bank" },
          { key: "annualFee", label: "Annual Fee" },
          { key: "rewardRate", label: "Reward Rate" },
        ]}
        data={mockCards}
      />
      <TablePagination page={1} pageSize={10} total={20} />
    </div>
  );
};


