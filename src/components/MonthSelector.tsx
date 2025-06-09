interface MonthSelectorProps {
  selectedMonth: string;
}

export function MonthSelector({ selectedMonth }: MonthSelectorProps) {
  return (
    <div className="mb-4">
      <h3 className="text-gray-700">Visão geral - {selectedMonth}</h3>
    </div>
  );
}