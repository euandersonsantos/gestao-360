import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Star } from 'lucide-react';
import { TaxCard } from './TaxCard';
import { useFinancialData, usePaymentContext } from '../hooks/useFinancialData';
import { useCompanySettings } from '../hooks/useCompanySettings';

interface ImportantActionsProps {
  selectedMonth: string;
}

export function ImportantActions({ selectedMonth }: ImportantActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { getMonthlyData, getPreviousMonth } = useFinancialData();
  const { getPaymentTransactionsForMonth } = usePaymentContext();
  const { settings: companySettings } = useCompanySettings();

  // Obter dados do mês selecionado
  const monthlyData = getMonthlyData(selectedMonth);
  const transactions = getPaymentTransactionsForMonth(selectedMonth);
  const previousMonth = getPreviousMonth(selectedMonth);

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calcular status das contas baseado nas transações reais
  const getAccountsStatus = () => {
    const accounts = [];

    // 1. DAS - Buscar transação de DAS
    const dasTransaction = transactions.find(t => 
      t.category === 'Impostos' && t.label.includes('DAS')
    );
    if (dasTransaction && dasTransaction.value > 0) {
      accounts.push({
        label: 'DAS',
        status: dasTransaction.completed ? 'paid' : 'pending',
        amount: formatCurrency(dasTransaction.value),
        dueDate: dasTransaction.dueDate || ''
      });
    } else if (monthlyData.dasCalculado > 0) {
      // Se não há transação mas há valor calculado, mostrar como pendente
      accounts.push({
        label: 'DAS',
        status: 'pending',
        amount: formatCurrency(monthlyData.dasCalculado),
        dueDate: ''
      });
    }

    // 2. INSS - Buscar transação de INSS
    const inssTransaction = transactions.find(t => 
      t.category === 'Impostos' && t.label.includes('INSS')
    );
    if (inssTransaction && inssTransaction.value > 0) {
      accounts.push({
        label: 'INSS',
        status: inssTransaction.completed ? 'paid' : 'pending',
        amount: formatCurrency(inssTransaction.value),
        dueDate: inssTransaction.dueDate || ''
      });
    } else if (monthlyData.inssCalculado > 0) {
      // Se não há transação mas há valor calculado, mostrar como pendente
      accounts.push({
        label: 'INSS',
        status: 'pending',
        amount: formatCurrency(monthlyData.inssCalculado),
        dueDate: ''
      });
    }

    // 3. Contabilidade - Buscar transação de contabilidade
    const contabilidadeTransaction = transactions.find(t => 
      t.category === 'Serviços' && t.label.includes('Contabilidade')
    );
    if (contabilidadeTransaction && contabilidadeTransaction.value > 0) {
      accounts.push({
        label: 'Contabilidade',
        status: contabilidadeTransaction.completed ? 'paid' : 'pending',
        amount: formatCurrency(contabilidadeTransaction.value),
        dueDate: contabilidadeTransaction.dueDate || ''
      });
    }

    // 4. Outras despesas - Somar todas as transações de saída que não são impostos nem serviços
    const outrasDescpesasTransactions = transactions.filter(t => 
      t.type === 'saida' && 
      t.category === 'Outras despesas' &&
      t.value > 0
    );
    
    if (outrasDescpesasTransactions.length > 0) {
      const totalOutras = outrasDescpesasTransactions.reduce((sum, t) => sum + t.value, 0);
      const completedOutras = outrasDescpesasTransactions.filter(t => t.completed);
      const pendingOutras = outrasDescpesasTransactions.filter(t => !t.completed);
      
      // Determinar status geral das outras despesas
      let status = 'paid';
      if (pendingOutras.length > 0) {
        // Verificar se alguma está em atraso (simular baseado em data de vencimento)
        const hasOverdue = pendingOutras.some(t => {
          if (!t.dueDate) return false;
          const dueDate = new Date(t.dueDate);
          const today = new Date();
          return dueDate < today;
        });
        status = hasOverdue ? 'overdue' : 'pending';
      }

      accounts.push({
        label: 'Outras despesas',
        status,
        amount: formatCurrency(totalOutras),
        dueDate: ''
      });
    }

    return accounts;
  };

  const accountsStatus = getAccountsStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-400';
      case 'pending':
        return 'bg-amber-400';
      case 'overdue':
        return 'bg-red-400';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Em atraso';
      default:
        return 'Indefinido';
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const paidCount = accountsStatus.filter(item => item.status === 'paid').length;
  const totalCount = accountsStatus.length;
  const completionPercentage = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

  return (
    <div className="mb-8">
      {/* Header clicável */}
      <div 
        className={`flex items-center justify-between cursor-pointer group transition-all duration-300 ${
          isOpen 
            ? 'py-2' 
            : 'py-4 px-6 bg-white rounded-lg shadow-sm hover:shadow-md'
        }`}
        onClick={toggleOpen}
      >
        <h3 className="text-gray-700 mb-0 group-hover:text-gray-900 transition-colors flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          Ações Importantes
        </h3>
        
        <div className="flex items-center gap-4">
          {/* Indicadores de status quando fechado */}
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-4"
              >
                {/* Progress indicator */}
                {accountsStatus.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Contas pendentes</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-emerald-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${completionPercentage}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 font-medium min-w-[2rem]">
                        {paidCount}/{totalCount}
                      </span>
                    </div>
                    
                    {/* Status dots */}
                    <div className="flex items-center gap-1.5">
                      {accountsStatus.map((account, index) => (
                        <div
                          key={index}
                          className="group/dot relative"
                          onMouseEnter={(e) => e.stopPropagation()}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 hover:scale-125 ${getStatusColor(account.status)}`}
                            title={`${account.label}: ${account.amount} - ${getStatusText(account.status)}`}
                          />
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                            <div className="font-medium">{account.label}</div>
                            <div className="text-gray-300">{account.amount} • {getStatusText(account.status)}</div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Nenhuma conta pendente</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" title="Todas as contas estão em dia" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            animate={{ rotate: isOpen ? 0 : -90 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="ml-2"
          >
            <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
          </motion.div>
        </div>
      </div>

      {/* Conteúdo expandível */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ 
              opacity: 0, 
              height: 0,
              marginTop: 0
            }}
            animate={{ 
              opacity: 1, 
              height: "auto",
              marginTop: 16
            }}
            exit={{ 
              opacity: 0, 
              height: 0,
              marginTop: 0
            }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut",
              opacity: { duration: 0.2 }
            }}
            style={{ overflow: "hidden" }}
          >
            <TaxCard selectedMonth={selectedMonth} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}