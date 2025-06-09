import { DollarSign, Receipt, TrendingUp, Percent, ArrowUp, ArrowDown, CreditCard } from 'lucide-react';
import { useFinancialData } from '../hooks/useFinancialData';
import { usePaymentContext } from '../hooks/useFinancialData';

interface KPICardsProps {
  selectedMonth: string;
}

export function KPICards({ selectedMonth }: KPICardsProps) {
  const { getMonthlyData, getMonthlyComparison, getPreviousMonth } = useFinancialData();
  const { getPaymentTransactionsForMonth } = usePaymentContext();
  
  const monthlyData = getMonthlyData(selectedMonth);
  const previousMonth = getPreviousMonth(selectedMonth);
  const comparison = getMonthlyComparison(selectedMonth, previousMonth);

  // Calcular total de impostos das transações de pagamento
  const calculateTaxesFromPayments = (month: string): number => {
    const paymentTransactions = getPaymentTransactionsForMonth(month);
    const taxTransactions = paymentTransactions.filter(t => 
      t.type === 'saida' && t.category === 'Impostos'
    );
    return taxTransactions.reduce((sum, t) => sum + t.value, 0);
  };

  // Calcular total de outras despesas das transações de pagamento
  const calculateOtherExpensesFromPayments = (month: string): number => {
    const paymentTransactions = getPaymentTransactionsForMonth(month);
    const otherExpensesTransactions = paymentTransactions.filter(t => 
      t.type === 'saida' && t.category === 'Outras despesas'
    );
    return otherExpensesTransactions.reduce((sum, t) => sum + t.value, 0);
  };

  // Calcular total de impostos para o mês atual e anterior
  const currentMonthTaxes = calculateTaxesFromPayments(selectedMonth);
  const previousMonthTaxes = calculateTaxesFromPayments(previousMonth);

  // Calcular total de outras despesas para o mês atual e anterior
  const currentMonthOtherExpenses = calculateOtherExpensesFromPayments(selectedMonth);
  const previousMonthOtherExpenses = calculateOtherExpensesFromPayments(previousMonth);

  // Calcular variação percentual dos impostos
  const calculateTaxChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Calcular variação percentual das outras despesas
  const calculateOtherExpensesChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const taxChange = calculateTaxChange(currentMonthTaxes, previousMonthTaxes);
  const otherExpensesChange = calculateOtherExpensesChange(currentMonthOtherExpenses, previousMonthOtherExpenses);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return Math.abs(Math.round(value * 10) / 10);
  };

  const kpiData = [
    {
      title: 'Faturamento Total',
      value: formatCurrency(monthlyData.faturamentoTotal),
      icon: <DollarSign className="w-5 h-5 text-green-600" />,
      iconBg: 'bg-green-100',
      change: {
        percentage: formatPercentage(comparison.faturamento.change),
        isPositive: comparison.faturamento.isPositive,
        comparison: 'vs mês anterior'
      }
    },
    {
      title: 'Total de Impostos',
      value: formatCurrency(currentMonthTaxes),
      icon: <Receipt className="w-5 h-5 text-red-600" />,
      iconBg: 'bg-red-100',
      change: {
        percentage: formatPercentage(taxChange),
        isPositive: currentMonthTaxes <= previousMonthTaxes, // Para impostos, menor é melhor
        comparison: 'vs mês anterior'
      }
    },
    {
      title: 'Outras despesas',
      value: formatCurrency(currentMonthOtherExpenses),
      icon: <CreditCard className="w-5 h-5 text-orange-600" />,
      iconBg: 'bg-orange-100',
      change: {
        percentage: formatPercentage(otherExpensesChange),
        isPositive: currentMonthOtherExpenses <= previousMonthOtherExpenses, // Para despesas, menor é melhor
        comparison: 'vs mês anterior'
      }
    },
    {
      title: 'Total Pró-labore',
      value: formatCurrency(monthlyData.proLaboreTotal),
      icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-100',
      change: {
        percentage: formatPercentage(comparison.proLabore.change),
        isPositive: comparison.proLabore.isPositive,
        comparison: 'vs mês anterior'
      }
    },
    {
      title: 'Retirada de lucros',
      value: formatCurrency(monthlyData.lucroTotal),
      icon: <Percent className="w-5 h-5 text-purple-600" />,
      iconBg: 'bg-purple-100',
      change: {
        percentage: formatPercentage(comparison.lucro.change),
        isPositive: comparison.lucro.isPositive,
        comparison: 'vs mês anterior'
      }
    }
  ];

  const getTrendIndicator = (change: { percentage: number; isPositive: boolean | null; comparison: string }) => {
    if (change.percentage === 0 || change.isPositive === null) {
      return (
        <div className="flex items-center gap-1 text-gray-500 text-sm mt-2">
          <span>—</span>
          <span>0% {change.comparison}</span>
        </div>
      );
    }

    if (change.isPositive) {
      return (
        <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
          <ArrowUp className="w-3 h-3" />
          <span>+{change.percentage}% {change.comparison}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-red-600 text-sm mt-2">
          <ArrowDown className="w-3 h-3" />
          <span>-{change.percentage}% {change.comparison}</span>
        </div>
      );
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {kpiData.map((kpi, index) => (
        <div 
          key={index}
          className="bg-white rounded-lg border p-6 hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <h4 className="text-gray-600 text-sm">{kpi.title}</h4>
            <div className={`${kpi.iconBg} p-2 rounded-lg`}>
              {kpi.icon}
            </div>
          </div>
          <div className="text-2xl text-gray-800 mb-1">{kpi.value}</div>
          {getTrendIndicator(kpi.change)}
        </div>
      ))}
    </div>
  );
}