import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from './ui/card';

export function RecentlyCompleted() {
  const [filters, setFilters] = useState({
    period: 'Junho 2025',
    dateRange: '01 - 30 Jun',
    method: 'Todas as contas',
    type: 'Geral'
  });

  const data = [
    {
      label: 'Receita',
      value: 85420.50,
      percentage: 65,
      color: 'bg-green-400'
    },
    {
      label: 'Impostos e Despesas',
      value: 32180.75,
      percentage: 25,
      color: 'bg-red-400'
    },
    {
      label: 'Saldo Líquido',
      value: 53239.75,
      percentage: 40,
      color: 'bg-blue-400'
    }
  ];

  // Calcular o total baseado na receita (que é o valor principal)
  const totalReceita = data[0].value;

  const FilterDropdown = ({ value, options }: { value: string; options?: string[] }) => (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
      <span className="text-sm text-gray-700">{value}</span>
      <ChevronDown className="w-4 h-4 text-gray-500" />
    </div>
  );

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-gray-600 mb-2">Distribuição Financeira</h3>
          <div className="text-3xl text-gray-900">
            R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2">
          <FilterDropdown value={filters.period} />
          <FilterDropdown value={filters.dateRange} />
          <FilterDropdown value={filters.method} />
          <FilterDropdown value={filters.type} />
        </div>
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="text-xl text-gray-900">
              R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-600">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bars */}
      <div className="flex h-8 rounded-lg overflow-hidden">
        {data.map((item, index) => (
          <div
            key={index}
            className={`${item.color} flex items-center justify-center relative`}
            style={{ width: `${item.percentage}%` }}
          >
            {/* Pattern especial para Impostos e Despesas */}
            {index === 1 && (
              <div 
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 2px,
                    rgba(255,255,255,0.4) 2px,
                    rgba(255,255,255,0.4) 4px
                  )`
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Percentages */}
      <div className="flex justify-between mt-3">
        {data.map((item, index) => (
          <div key={index} className="text-sm text-gray-600" style={{ width: `${item.percentage}%` }}>
            {item.percentage}%
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
            <span className="text-sm text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}