import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCompanySettings } from './useCompanySettings';
import { useCompanies } from './useCompanies';

interface Transaction {
  id: string;
  label: string;
  value: number;
  type: 'entrada' | 'saida';
  completed: boolean;
  description?: string;
  category?: string;
  dueDate?: string;
  isManuallyAdjusted?: boolean;
  isInitialBalance?: boolean; // Added property for initial balance transactions
}

interface MonthlyData {
  faturamentoTotal: number;
  proLaboreTotal: number;
  inssCalculado: number;
  dasCalculado: number;
  previousMonth: string;
  lucroTotal: number; // Adicionado para o KPICards
  contabilidadeTotal: number; // Adicionado para o Mailroom
}

interface MonthlyComparison {
  faturamento: {
    change: number;
    isPositive: boolean | null;
  };
  proLabore: {
    change: number;
    isPositive: boolean | null;
  };
  lucro: {
    change: number;
    isPositive: boolean | null;
  };
}

interface PaymentContextType {
  getPaymentTransactionsForMonth: (month: string) => Transaction[];
  updatePaymentTransactionsForMonth: (month: string, transactions: Transaction[]) => void;
  getFaturamentoRealizadoForMonth: (month: string) => number;
  getProLaboreForMonth: (month: string) => number;
  ensureDefaultTransactions: () => void; // Nova função para forçar criação de transações
}

interface FinancialDataContextType extends PaymentContextType {
  getMonthlyData: (month: string) => MonthlyData;
  getMonthlyComparison: (currentMonth: string, previousMonth: string) => MonthlyComparison;
  getPreviousMonth: (currentMonth: string) => string;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);
const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

// Função para obter o mês anterior
const getPreviousMonth = (currentMonth: string): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const [monthName, year] = currentMonth.split(' ');
  const currentMonthIndex = months.indexOf(monthName);
  
  if (currentMonthIndex === 0) {
    return `Dezembro ${parseInt(year) - 1}`;
  } else {
    return `${months[currentMonthIndex - 1]} ${year}`;
  }
};

// Função para criar transações padrão com valores zerados
const createDefaultTransactions = (month: string): Transaction[] => {
  const previousMonth = getPreviousMonth(month);
  
  return [
    {
      id: 'e1',
      label: 'Renda mensal',
      value: 0,
      type: 'entrada',
      completed: false,
      description: 'Receita mensal da empresa',
      category: 'Renda',
      dueDate: ''
    },
    {
      id: 's1',
      label: 'Pró-labore',
      value: 0,
      type: 'saida',
      completed: false,
      description: 'Retirada mensal do sócio - calculado automaticamente',
      category: 'Retiradas',
      dueDate: ''
    },
    {
      id: 's1b',
      label: 'Distribuição de lucros',
      value: 0,
      type: 'saida',
      completed: false,
      description: 'Distribuição de lucros aos sócios',
      category: 'Retiradas',
      dueDate: ''
    },
    {
      id: 's2',
      label: `INSS - Referente a ${previousMonth}`,
      value: 0,
      type: 'saida',
      completed: false,
      description: `Contribuição previdenciária referente a ${previousMonth} - calculado automaticamente`,
      category: 'Impostos',
      dueDate: ''
    },
    {
      id: 's3',
      label: `DAS - Simples nacional - Referente a ${previousMonth}`,
      value: 0,
      type: 'saida',
      completed: false,
      description: `Documento de Arrecadação do Simples Nacional referente a ${previousMonth} - calculado automaticamente`,
      category: 'Impostos',
      dueDate: ''
    },
    {
      id: 's4',
      label: `Contabilidade - Referente a ${previousMonth}`,
      value: 0,
      type: 'saida',
      completed: false,
      description: `Honorários contábeis referente a ${previousMonth}`,
      category: 'Serviços',
      dueDate: ''
    }
  ];
};

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [paymentData, setPaymentData] = useState<Record<string, Transaction[]>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const { settings } = useCompanySettings();
  const { activeCompany } = useCompanies();

  // Função para obter a chave do localStorage baseada na empresa ativa
  const getStorageKey = () => {
    const companyId = activeCompany?.id || 'legacy-company';
    return `paymentData_${companyId}`;
  };

  // Carregar dados do localStorage na inicialização ou quando empresa mudar
  useEffect(() => {
    const loadPaymentData = () => {
      try {
        const storageKey = getStorageKey();
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setPaymentData(parsed);
          console.log('PaymentProvider - Dados carregados:', { storageKey, dataKeys: Object.keys(parsed) });
        } else {
          // Tentar migrar dados da versão anterior (global)
          const legacyData = localStorage.getItem('paymentData');
          if (legacyData && (!activeCompany || activeCompany.id === 'legacy-company')) {
            try {
              const parsed = JSON.parse(legacyData);
              setPaymentData(parsed);
              // Salvar no novo formato
              localStorage.setItem(storageKey, JSON.stringify(parsed));
              console.log('PaymentProvider - Dados migrados de versão anterior');
            } catch (error) {
              console.error('Erro ao migrar dados legacy:', error);
              setPaymentData({});
            }
          } else {
            // Nova empresa, começar com dados vazios
            console.log('PaymentProvider - Nova empresa, iniciando com dados vazios');
            setPaymentData({});
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados de pagamento:', error);
        setPaymentData({});
      } finally {
        setIsLoaded(true);
      }
    };

    loadPaymentData();
  }, [activeCompany?.id]); // Recarregar quando empresa mudar

  // Salvar dados no localStorage sempre que paymentData mudar
  useEffect(() => {
    if (isLoaded && activeCompany) {
      try {
        const storageKey = getStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(paymentData));
        console.log('PaymentProvider - Dados salvos:', { storageKey, dataKeys: Object.keys(paymentData) });
      } catch (error) {
        console.error('Erro ao salvar dados de pagamento:', error);
      }
    }
  }, [paymentData, isLoaded, activeCompany?.id]);

  const getPaymentTransactionsForMonth = (month: string): Transaction[] => {
    const transactions = paymentData[month] || [];
    console.log(`PaymentProvider - Obtendo transações para ${month}:`, transactions.length, 'transações');
    return transactions;
  };

  // Função para forçar criação de transações padrão
  const ensureDefaultTransactions = () => {
    if (!activeCompany) {
      console.log('PaymentProvider - Não há empresa ativa para criar transações');
      return;
    }

    console.log('PaymentProvider - Forçando criação de transações padrão');
    
    const monthsToCheck = [
      'Janeiro 2025', 'Fevereiro 2025', 'Março 2025', 'Abril 2025', 
      'Maio 2025', 'Junho 2025', 'Julho 2025', 'Agosto 2025',
      'Setembro 2025', 'Outubro 2025', 'Novembro 2025', 'Dezembro 2025'
    ];

    setPaymentData(prev => {
      const newData = { ...prev };
      let created = false;
      
      monthsToCheck.forEach(month => {
        if (!newData[month] || newData[month].length === 0) {
          console.log(`PaymentProvider - Forçando criação de transações para ${month}`);
          newData[month] = createDefaultTransactions(month);
          created = true;
        }
      });
      
      if (created) {
        console.log('PaymentProvider - Transações padrão criadas com sucesso');
      }
      
      return newData;
    });
  };

  // Effect automatico para criar transações padrão - SIMPLIFICADO
  useEffect(() => {
    // Só tenta criar se os dados foram carregados e há empresa ativa
    if (isLoaded && activeCompany) {
      console.log('PaymentProvider - Verificando criação automática de transações');
      
      // Aguardar um pouco para garantir que tudo foi carregado
      const timer = setTimeout(() => {
        ensureDefaultTransactions();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoaded, activeCompany?.id]); // Dependências simplificadas

  const updatePaymentTransactionsForMonth = (month: string, transactions: Transaction[]) => {
    console.log(`PaymentProvider - Atualizando transações para ${month}:`, transactions.length, 'transações');
    setPaymentData(prev => ({
      ...prev,
      [month]: transactions
    }));
  };

  const getFaturamentoRealizadoForMonth = (month: string): number => {
    const transactions = getPaymentTransactionsForMonth(month);
    const rendaTransactions = transactions.filter(t => 
      t.type === 'entrada' && t.category === 'Renda' && t.completed
    );
    return rendaTransactions.reduce((sum, t) => sum + t.value, 0);
  };

  const getProLaboreForMonth = (month: string): number => {
    const transactions = getPaymentTransactionsForMonth(month);
    const proLaboreTransaction = transactions.find(t => t.id === 's1');
    return proLaboreTransaction?.value || 0;
  };

  return (
    <PaymentContext.Provider value={{
      getPaymentTransactionsForMonth,
      updatePaymentTransactionsForMonth,
      getFaturamentoRealizadoForMonth,
      getProLaboreForMonth,
      ensureDefaultTransactions
    }}>
      <FinancialDataProvider>
        {children}
      </FinancialDataProvider>
    </PaymentContext.Provider>
  );
}

function FinancialDataProvider({ children }: { children: ReactNode }) {
  const paymentContext = useContext(PaymentContext);
  const { settings } = useCompanySettings();

  if (!paymentContext) {
    throw new Error('FinancialDataProvider must be used within PaymentProvider');
  }

  const getMonthlyData = (selectedMonth: string): MonthlyData => {
    const transactions = paymentContext.getPaymentTransactionsForMonth(selectedMonth);
    const previousMonth = getPreviousMonth(selectedMonth);

    // Calcular faturamento total das transações de Renda
    const faturamentoTotal = transactions
      .filter(t => t.type === 'entrada' && t.category === 'Renda')
      .reduce((sum, t) => sum + t.value, 0);

    // Calcular pró-labore baseado na configuração (apenas se há configurações e faturamento > 0)
    const proLaboreTotal = settings && faturamentoTotal > 0
      ? faturamentoTotal * settings.taxSettings.proLaborePercentual
      : 0;

    // Obter pró-labore do mês anterior para calcular INSS
    const previousMonthProLabore = paymentContext.getProLaboreForMonth(previousMonth);
    
    // Calcular INSS baseado no pró-labore do mês anterior
    const inssCalculado = settings && previousMonthProLabore > 0
      ? previousMonthProLabore * settings.taxSettings.inssPercentual
      : 0;

    // Obter faturamento total do mês anterior para calcular DAS (consistente com INSS que usa valor total)
    const previousMonthTransactions = paymentContext.getPaymentTransactionsForMonth(previousMonth);
    const previousMonthFaturamento = previousMonthTransactions
      .filter(t => t.type === 'entrada' && t.category === 'Renda')
      .reduce((sum, t) => sum + t.value, 0);
    
    // Calcular DAS baseado no faturamento total do mês anterior (consistente com INSS)
    const dasCalculado = settings && previousMonthFaturamento > 0
      ? previousMonthFaturamento * settings.taxSettings.dasAliquota
      : 0;

    // Calcular total de distribuição de lucros
    const lucroTotal = transactions
      .filter(t => t.id === 's1b') // Distribuição de lucros
      .reduce((sum, t) => sum + t.value, 0);

    // Calcular total de contabilidade
    const contabilidadeTotal = transactions
      .filter(t => t.id === 's4') // Contabilidade
      .reduce((sum, t) => sum + t.value, 0);

    return {
      faturamentoTotal,
      proLaboreTotal,
      inssCalculado,
      dasCalculado,
      previousMonth,
      lucroTotal,
      contabilidadeTotal
    };
  };

  const getMonthlyComparison = (currentMonth: string, previousMonth: string): MonthlyComparison => {
    const currentData = getMonthlyData(currentMonth);
    const previousData = getMonthlyData(previousMonth);

    // Função para calcular mudança percentual
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return ((current - previous) / previous) * 100;
    };

    // Função para determinar se a mudança é positiva
    const isPositiveChange = (current: number, previous: number) => {
      if (current === previous) return null;
      return current > previous;
    };

    return {
      faturamento: {
        change: calculateChange(currentData.faturamentoTotal, previousData.faturamentoTotal),
        isPositive: isPositiveChange(currentData.faturamentoTotal, previousData.faturamentoTotal)
      },
      proLabore: {
        change: calculateChange(currentData.proLaboreTotal, previousData.proLaboreTotal),
        isPositive: isPositiveChange(currentData.proLaboreTotal, previousData.proLaboreTotal)
      },
      lucro: {
        change: calculateChange(currentData.lucroTotal, previousData.lucroTotal),
        isPositive: isPositiveChange(currentData.lucroTotal, previousData.lucroTotal)
      }
    };
  };

  return (
    <FinancialDataContext.Provider value={{
      ...paymentContext,
      getMonthlyData,
      getMonthlyComparison,
      getPreviousMonth
    }}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function usePaymentContext() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePaymentContext must be used within a PaymentProvider');
  }
  return context;
}

export function useFinancialData() {
  const context = useContext(FinancialDataContext);
  if (context === undefined) {
    throw new Error('useFinancialData must be used within a FinancialDataProvider');
  }
  return context;
}