import { Receipt, DollarSign, FileText, TrendingUp, TrendingDown, Heart, Sparkles, CheckCircle } from 'lucide-react';
import { useInvoiceData } from '../hooks/useInvoiceData';

interface InvoiceKPICardsProps {
  selectedMonth: string;
}

export function InvoiceKPICards({ selectedMonth }: InvoiceKPICardsProps) {
  const { getInvoiceStatsWithComparison } = useInvoiceData();
  const stats = getInvoiceStatsWithComparison(selectedMonth);

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatPercentageChange = (change: number, showIcon: boolean = true): { text: string; color: string; icon?: React.ReactNode } => {
    const isPositive = change > 0;
    const isNeutral = change === 0;
    
    if (isNeutral) {
      return {
        text: `- 0% vs mês anterior`,
        color: 'text-gray-500'
      };
    }
    
    const sign = isPositive ? '+' : '';
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const icon = showIcon ? (isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />) : undefined;
    
    return {
      text: `${sign}${change}% vs mês anterior`,
      color,
      icon
    };
  };

  const kpiData = [
    {
      title: 'Total de Notas',
      value: stats.totalInvoices.toString(),
      change: formatPercentageChange(stats.comparison.totalInvoicesChange),
      icon: Receipt,
      color: 'blue',
      description: 'Notas fiscais emitidas'
    },
    {
      title: 'Receita Total',
      value: formatCurrency(stats.totalValue),
      change: formatPercentageChange(stats.comparison.totalValueChange),
      icon: DollarSign,
      color: 'green',
      description: 'Valor total faturado'
    },
    {
      title: 'Notas Verificadas',
      value: `${stats.verifiedPercentage}%`,
      change: formatPercentageChange(stats.comparison.verifiedPercentageChange),
      icon: CheckCircle,
      color: 'purple',
      description: 'Notas revisadas e validadas'
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(stats.averageValue),
      change: formatPercentageChange(stats.comparison.averageValueChange),
      icon: TrendingUp,
      color: 'orange',
      description: 'Valor médio por nota'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        border: 'border-blue-100'
      },
      green: {
        bg: 'bg-green-50',
        icon: 'text-green-600',
        border: 'border-green-100'
      },
      purple: {
        bg: 'bg-purple-50',
        icon: 'text-purple-600',
        border: 'border-purple-100'
      },
      orange: {
        bg: 'bg-orange-50',
        icon: 'text-orange-600',
        border: 'border-orange-100'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  // Calculate percentages for the progress bar
  const fisioterapiaPercentage = stats.totalInvoices > 0 ? Math.round((stats.fisioterapiaCount / stats.totalInvoices) * 100) : 0;
  const esteticaPercentage = stats.totalInvoices > 0 ? Math.round((stats.esteticaCount / stats.totalInvoices) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
      {kpiData.map((kpi) => {
        const Icon = kpi.icon;
        const colors = getColorClasses(kpi.color);
        
        return (
          <div
            key={kpi.title}
            className={`bg-white rounded-xl p-6 border ${colors.border} hover:shadow-lg transition-all duration-200`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${colors.icon}`} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">{kpi.title}</p>
              <p className="text-2xl font-semibold text-gray-900">{kpi.value}</p>
              <div className={`flex items-center gap-1 text-xs ${kpi.change.color}`}>
                {kpi.change.icon}
                <span>{kpi.change.text}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">{kpi.description}</p>
            </div>
          </div>
        );
      })}

      {/* Card com barra de progresso horizontal para distribuição por tipo de serviço */}
      {(stats.fisioterapiaCount > 0 || stats.esteticaCount > 0) && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 md:col-span-2 lg:col-span-4">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-gray-800 font-medium">Distribuição por Tipo de Serviço</h4>
            <div className="text-sm text-gray-600">
              {stats.totalInvoices} {stats.totalInvoices === 1 ? 'nota' : 'notas'} no total
            </div>
          </div>

          {/* Barra de progresso horizontal */}
          <div className="space-y-4">
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className="h-full flex">
                {/* Segmento Fisioterapia - usando cores azuis como nas badges */}
                {fisioterapiaPercentage > 0 && (
                  <div 
                    className="bg-blue-600 h-full transition-all duration-500 ease-out"
                    style={{ width: `${fisioterapiaPercentage}%` }}
                  />
                )}
                {/* Segmento Estética - usando cores rosa como nas badges */}
                {esteticaPercentage > 0 && (
                  <div 
                    className="bg-pink-600 h-full transition-all duration-500 ease-out"
                    style={{ width: `${esteticaPercentage}%` }}
                  />
                )}
              </div>
            </div>

            {/* Legendas */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Fisioterapia - cores azuis consistentes */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <Heart className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Fisioterapia</p>
                    <p className="text-sm text-gray-500">{stats.fisioterapiaCount} notas</p>
                  </div>
                </div>

                {/* Estética - cores rosa consistentes */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-pink-600 rounded-full"></div>
                    <Sparkles className="w-4 h-4 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Estética</p>
                    <p className="text-sm text-gray-500">{stats.esteticaCount} notas</p>
                  </div>
                </div>
              </div>

              {/* Percentuais - cores consistentes */}
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-lg font-semibold text-blue-600">{fisioterapiaPercentage}%</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-pink-600">{esteticaPercentage}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}