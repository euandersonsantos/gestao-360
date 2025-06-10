import { useState, useEffect, useRef } from 'react';
import { ArrowUpCircle, ArrowDownCircle, DollarSign, Plus, TrendingUp, TrendingDown, ChevronRight, Trash2, X, Calendar, CreditCard, Tag, Briefcase, Wallet, Building, FileText, Wrench, Settings, CalendarIcon, Type, Repeat, Lock, Edit3, RefreshCw, RotateCcw, IconWithTooltip } from 'lucide-react';
import { usePaymentContext, useFinancialData } from '../hooks/useFinancialData';
import { useCompanySettings } from '../hooks/useCompanySettings';
import { Button } from './ui/button';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentManagementProps {
  selectedMonth: string;
}

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
  isInitialBalance?: boolean; // Nova propriedade para identificar saldo inicial
}

export function PaymentManagement({ selectedMonth }: PaymentManagementProps) {
  const { getPaymentTransactionsForMonth, updatePaymentTransactionsForMonth, ensureDefaultTransactions } = usePaymentContext();
  const { getMonthlyData } = useFinancialData();
  const { settings: companySettings } = useCompanySettings();
  
  // Ref para evitar chamadas múltiplas do ensureDefaultTransactions
  const hasTriedEnsureTransactions = useRef(false);
  // Ref para tracking do mês anterior para detectar mudanças
  const previousSelectedMonth = useRef<string>('');
  // Ref para tracking de empresa anterior
  const previousCompanyId = useRef<string>('');
  // Ref para tracking do processamento inicial
  const initialProcessingDone = useRef(false);

  // Lista de transações fixas (apenas valor pode ser editado)
  const fixedTransactions = [
    'Pró-labore',
    'Distribuição de lucros',
    'INSS - Referente a',
    'DAS - Simples nacional - Referente a',
    'Contabilidade - Referente a'
  ];

  // Lista de categorias que são bloqueadas para edição
  const lockedCategories = [
    'Outras receitas',
    'Outras despesas',
    'Retiradas'
  ];

  // Função para verificar se uma transação é fixa
  const isFixedTransaction = (label: string): boolean => {
    return fixedTransactions.some(fixedLabel => label.startsWith(fixedLabel));
  };

  // Função para verificar se uma transação da categoria Renda (permite edição de nome)
  const isRendaTransaction = (category: string): boolean => {
    return category === 'Renda';
  };

  // Função para verificar se a categoria é bloqueada para edição
  const isCategoryLocked = (category: string): boolean => {
    return lockedCategories.includes(category);
  };

  // Função para comparar meses (retorna -1 se month1 < month2, 0 se iguais, 1 se month1 > month2)
  const compareMonths = (month1: string, month2: string): number => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const [monthName1, year1] = month1.split(' ');
    const [monthName2, year2] = month2.split(' ');
    
    const yearNum1 = parseInt(year1);
    const yearNum2 = parseInt(year2);
    
    if (yearNum1 !== yearNum2) {
      return yearNum1 < yearNum2 ? -1 : 1;
    }
    
    const monthIndex1 = months.indexOf(monthName1);
    const monthIndex2 = months.indexOf(monthName2);
    
    if (monthIndex1 === monthIndex2) return 0;
    return monthIndex1 < monthIndex2 ? -1 : 1;
  };

  // Função para verificar se um mês é anterior ao mês de início da empresa
  const isBeforeCompanyStartMonth = (month: string): boolean => {
    if (!companySettings?.startMonth) return false;
    return compareMonths(month, companySettings.startMonth) < 0;
  };

  // Função para verificar se é o mês de início da empresa
  const isCompanyStartMonth = (month: string): boolean => {
    if (!companySettings?.startMonth) return false;
    return month === companySettings.startMonth;
  };

  // Função melhorada para verificar se é primeira vez após setup
  const isFirstTimeAfterSetup = (): boolean => {
    return localStorage.getItem('hasCompletedFirstSetup') !== 'true';
  };

  // Função para verificar se o setup está em progresso
  const isSetupInProgress = (): boolean => {
    return localStorage.getItem('setupInProgress') === 'true';
  };

  // Função para criar transação de saldo inicial
  const createInitialBalanceTransaction = (value: number): Transaction => {
    return {
      id: 'initial-balance',
      label: 'Saldo inicial',
      value: value,
      type: 'entrada',
      completed: true, // Saldo inicial sempre é "realizado"
      description: `Saldo inicial da empresa definido para ${companySettings?.startMonth || selectedMonth}`,
      category: 'Saldo inicial',
      isInitialBalance: true
    };
  };

  // Função para obter o mês anterior
  const getPreviousMonth = (currentMonth: string) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Extrai o mês e ano da string (ex: "Junho 2025")
    const [monthName, year] = currentMonth.split(' ');
    const currentMonthIndex = months.indexOf(monthName);
    
    if (currentMonthIndex === 0) {
      // Se é Janeiro, o mês anterior é Dezembro do ano anterior
      return `Dezembro ${parseInt(year) - 1}`;
    } else {
      // Caso contrário, é o mês anterior do mesmo ano
      return `${months[currentMonthIndex - 1]} ${year}`;
    }
  };

  // Função para obter o próximo mês
  const getNextMonth = (currentMonth: string) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Extrai o mês e ano da string (ex: "Junho 2025")
    const [monthName, year] = currentMonth.split(' ');
    const currentMonthIndex = months.indexOf(monthName);
    
    if (currentMonthIndex === 11) {
      // Se é Dezembro, o próximo mês é Janeiro do ano seguinte
      return `Janeiro ${parseInt(year) + 1}`;
    } else {
      // Caso contrário, é o próximo mês do mesmo ano
      return `${months[currentMonthIndex + 1]} ${year}`;
    }
  };

  // Função para replicar transação para os próximos meses
  const replicateTransactionToNextMonths = (transaction: Transaction, currentMonth: string) => {
    let monthToProcess = currentMonth;
    
    // Replicar para os próximos 12 meses
    for (let i = 0; i < 12; i++) {
      monthToProcess = getNextMonth(monthToProcess);
      
      // Obter dados do mês de destino
      const targetMonthData = getPaymentTransactionsForMonth(monthToProcess);
      
      // Verificar se já existe uma transação com o mesmo ID
      const existingTransaction = targetMonthData.find(t => t.id === transaction.id);
      
      if (existingTransaction) {
        // Atualizar transação existente (não replicar saldo inicial)
        if (!transaction.isInitialBalance) {
          const updatedTargetMonthData = targetMonthData.map(t =>
            t.id === transaction.id 
              ? { 
                  ...transaction, 
                  // Manter campos específicos da transação original
                  completed: t.completed,
                  // Para transações de "Renda", manter o nome personalizado se existir
                  label: isRendaTransaction(transaction.category || '') && t.label !== 'Renda mensal' 
                    ? t.label 
                    : transaction.label
                }
              : t
          );
          updatePaymentTransactionsForMonth(monthToProcess, updatedTargetMonthData);
        }
      } else {
        // Criar nova transação (apenas se for uma nova transação criada e não saldo inicial)
        if (!transaction.isInitialBalance) {
          const newTransaction = {
            ...transaction,
            completed: false, // Nova transação sempre não concluída
            // Gerar novo ID para evitar conflitos
            id: `${transaction.type === 'entrada' ? 'e' : 's'}${Date.now()}-${i}`
          };
          
          const updatedTargetMonthData = [...targetMonthData, newTransaction];
          updatePaymentTransactionsForMonth(monthToProcess, updatedTargetMonthData);
        }
      }
    }
  };

  // Saldos históricos como fallback
  const getHistoricalBalance = (month: string): number => {
    // Se o mês é anterior ao mês de início da empresa, retornar 0
    if (isBeforeCompanyStartMonth(month)) {
      return 0;
    }
    
    // Saldos históricos apenas para casos específicos (sistema legacy)
    const historicalBalances: Record<string, number> = {
      'Dezembro 2024': 18420.00,
      'Janeiro 2025': 19850.00,
      'Fevereiro 2025': 17320.00,
      'Março 2025': 21450.00,
      'Abril 2025': 18750.00,
      'Maio 2025': 15650.00,
      'Junho 2025': 22100.00,
      'Julho 2025': 19900.00,
      'Agosto 2025': 23450.00,
      'Setembro 2025': 20800.00,
      'Outubro 2025': 25200.00,
      'Novembro 2025': 22750.00
    };
    
    return historicalBalances[month] || 0;
  };

  // Função para calcular o saldo final de um mês específico
  const calculateFinalBalance = (month: string, depth: number = 0): number => {
    // Proteção contra recursão infinita
    if (depth > 24) {
      return getHistoricalBalance(month);
    }
    
    // Se o mês é anterior ao mês de início da empresa, retornar 0
    if (isBeforeCompanyStartMonth(month)) {
      return 0;
    }
    
    // Para o mês de início da empresa, calcular baseado apenas nas transações do próprio mês
    if (isCompanyStartMonth(month)) {
      const transactions = getPaymentTransactionsForMonth(month);
      
      // Calcular apenas transações realizadas (completed)
      const completedEntries = transactions
        .filter(t => t.type === 'entrada' && t.completed)
        .reduce((sum, t) => sum + t.value, 0);
      const completedExits = transactions
        .filter(t => t.type === 'saida' && t.completed)
        .reduce((sum, t) => sum + t.value, 0);
      
      return completedEntries - completedExits;
    }
    
    // Para meses muito antigos ou quando não temos configurações, usar valores históricos
    const [monthName, year] = month.split(' ');
    const yearNumber = parseInt(year);
    
    if (yearNumber < 2024 || !companySettings) {
      return getHistoricalBalance(month);
    }
    
    // Para outros meses, calcular recursivamente baseado no mês anterior
    const previousMonth = getPreviousMonth(month);
    const previousFinalBalance = calculateFinalBalance(previousMonth, depth + 1);
    const transactions = getPaymentTransactionsForMonth(month);
    
    // Calcular apenas transações realizadas (completed)
    const completedEntries = transactions
      .filter(t => t.type === 'entrada' && t.completed)
      .reduce((sum, t) => sum + t.value, 0);
    const completedExits = transactions
      .filter(t => t.type === 'saida' && t.completed)
      .reduce((sum, t) => sum + t.value, 0);
    
    return previousFinalBalance + completedEntries - completedExits;
  };

  // Função para calcular o saldo inicial (transportado do mês anterior)
  const getInitialBalance = (currentMonth: string): number => {
    // Se o mês é anterior ao mês de início da empresa, retornar 0
    if (isBeforeCompanyStartMonth(currentMonth)) {
      return 0;
    }
    
    // Se é o mês de início da empresa, retornar 0 (não há transporte)
    if (isCompanyStartMonth(currentMonth)) {
      return 0;
    }
    
    // Para outros meses, usar o saldo final do mês anterior
    const previousMonth = getPreviousMonth(currentMonth);
    return calculateFinalBalance(previousMonth);
  };

  // Verificar e criar transação de saldo inicial se necessário
  useEffect(() => {
    if (companySettings && isCompanyStartMonth(selectedMonth)) {
      const currentTransactions = getPaymentTransactionsForMonth(selectedMonth);
      const hasInitialBalanceTransaction = currentTransactions.some(t => t.isInitialBalance);
      
      // Se não tem transação de saldo inicial e existe um saldo inicial configurado
      if (!hasInitialBalanceTransaction && companySettings.initialBalance !== undefined && companySettings.initialBalance > 0) {
        console.log('🔵 PaymentManagement - Criando transação de saldo inicial:', {
          month: selectedMonth,
          value: companySettings.initialBalance,
          isStartMonth: isCompanyStartMonth(selectedMonth)
        });
        
        const initialBalanceTransaction = createInitialBalanceTransaction(companySettings.initialBalance);
        const updatedTransactions = [initialBalanceTransaction, ...currentTransactions];
        updatePaymentTransactionsForMonth(selectedMonth, updatedTransactions);
      }
    }
  }, [companySettings?.startMonth, companySettings?.initialBalance, selectedMonth]);

  const previousMonth = getPreviousMonth(selectedMonth);
  const saldoInicial = getInitialBalance(selectedMonth);

  // Estados para o modal de edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Estados para o modal de criação
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateDatePickerOpen, setIsCreateDatePickerOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    label: '',
    value: '',
    type: 'entrada' as 'entrada' | 'saida',
    description: '',
    category: '',
    dueDate: '',
    replicateToNextMonths: false
  });

  const [createForm, setCreateForm] = useState({
    label: '',
    value: '',
    type: 'entrada' as 'entrada' | 'saida',
    description: '',
    category: '',
    dueDate: '',
    replicateToNextMonths: false
  });

  // Estados específicos para ajuste manual (pró-labore, DAS e INSS)
  const [isManualAdjustment, setIsManualAdjustment] = useState(false);
  const [manualValue, setManualValue] = useState('');

  // Obter dados específicos do mês
  const monthlyData = getMonthlyData(selectedMonth);
  const paymentData = getPaymentTransactionsForMonth(selectedMonth);
  
  // LÓGICA CORRIGIDA: Reset e tracking robusto com foco no mês correto
  useEffect(() => {
    const companyChanged = companySettings && previousCompanyId.current !== companySettings.companyName;
    const monthChanged = previousSelectedMonth.current !== selectedMonth;
    
    if (companyChanged || monthChanged || !initialProcessingDone.current) {
      console.log('🔄 PaymentManagement - Mudança detectada:', {
        companyChanged,
        monthChanged,
        initialProcessingDone: initialProcessingDone.current,
        anteriorCompany: previousCompanyId.current,
        novaCompany: companySettings?.companyName,
        anteriorMonth: previousSelectedMonth.current,
        novoMonth: selectedMonth
      });
      
      hasTriedEnsureTransactions.current = false;
      
      if (companyChanged && companySettings) {
        previousCompanyId.current = companySettings.companyName;
      }
      
      if (monthChanged) {
        previousSelectedMonth.current = selectedMonth;
      }
      
      if (!initialProcessingDone.current) {
        initialProcessingDone.current = true;
      }
    }
  }, [selectedMonth, companySettings?.companyName]);
  
  // LÓGICA PRINCIPAL: Ensure transactions com detecção melhorada do setup
  useEffect(() => {
    console.log('🔍 PaymentManagement - Debug detalhado:', {
      selectedMonth,
      paymentDataLength: paymentData.length,
      hasCompanySettings: !!companySettings,
      companyName: companySettings?.companyName,
      startMonth: companySettings?.startMonth,
      isStartMonth: isCompanyStartMonth(selectedMonth),
      isFirstTime: isFirstTimeAfterSetup(),
      isSetupInProgress: isSetupInProgress(),
      hasTriedEnsure: hasTriedEnsureTransactions.current,
      paymentDataIds: paymentData.map(t => t.id),
      monthEqualsStartMonth: selectedMonth === companySettings?.startMonth
    });
    
    // CONDIÇÃO CRÍTICA SIMPLIFICADA: Detectar quando devemos criar transações
    const shouldCreateTransactions = (
      paymentData.length === 0 && 
      companySettings && 
      !hasTriedEnsureTransactions.current &&
      companySettings.companyName && 
      companySettings.startMonth &&
      // CONDIÇÃO ÚNICA: O mês selecionado deve ser EXATAMENTE o startMonth
      selectedMonth === companySettings.startMonth
    );
    
    if (shouldCreateTransactions) {
      console.log('🚀 PaymentManagement - CRIANDO TRANSAÇÕES NO MÊS EXATO:', {
        selectedMonth,
        startMonth: companySettings.startMonth,
        companyName: companySettings.companyName,
        contexto: isSetupInProgress() ? 'Setup em progresso' : 
                  isFirstTimeAfterSetup() ? 'Primeira vez' : 'Normal'
      });
      
      hasTriedEnsureTransactions.current = true;
      
      // DELAY MÍNIMO para garantir contexto carregado
      const delay = isSetupInProgress() ? 50 : 100;
      
      setTimeout(() => {
        console.log('🔧 PaymentManagement - EXECUTANDO ensureDefaultTransactions para o mês:', selectedMonth);
        ensureDefaultTransactions();
        
        // Verificação imediata e adicional se necessário
        setTimeout(() => {
          const updatedPaymentData = getPaymentTransactionsForMonth(selectedMonth);
          console.log('✅ PaymentManagement - Verificação pós-criação:', {
            selectedMonth,
            transactionsCreated: updatedPaymentData.length,
            transactionIds: updatedPaymentData.map(t => t.id),
            success: updatedPaymentData.length > 0
          });
          
          // TENTATIVA FINAL apenas se ainda não há transações no mês correto
          if (updatedPaymentData.length === 0 && selectedMonth === companySettings.startMonth) {
            console.log('⚠️ PaymentManagement - TENTATIVA FINAL para o mês correto:', selectedMonth);
            setTimeout(() => {
              ensureDefaultTransactions();
              
              // Log final
              setTimeout(() => {
                const finalCheck = getPaymentTransactionsForMonth(selectedMonth);
                console.log(finalCheck.length > 0 ? '🎉' : '❌', 'PaymentManagement - Resultado final:', {
                  selectedMonth,
                  finalTransactions: finalCheck.length,
                  finalIds: finalCheck.map(t => t.id),
                  success: finalCheck.length > 0 ? 'SUCESSO' : 'FALHOU'
                });
              }, 300);
            }, 200);
          }
        }, 300);
      }, delay);
    }
    
    // Log especial para o mês de início
    if (selectedMonth === companySettings?.startMonth) {
      console.log('🎯 PaymentManagement - ESTE É O MÊS DE INÍCIO DA EMPRESA:', {
        selectedMonth,
        startMonth: companySettings.startMonth,
        hasTransactions: paymentData.length > 0,
        isSetupInProgress: isSetupInProgress(),
        isFirstTime: isFirstTimeAfterSetup(),
        transactionsList: paymentData
      });
    }
  }, [selectedMonth, paymentData.length, companySettings?.companyName, companySettings?.startMonth]);
  
  // Obter dados do mês anterior para exibir no modal
  const { getFaturamentoRealizadoForMonth, getProLaboreForMonth } = usePaymentContext();
  const previousMonthFaturamento = getFaturamentoRealizadoForMonth(previousMonth);
  const previousMonthProLabore = getProLaboreForMonth(previousMonth);

  // Obter dados do mês anterior para comparação
  const previousMonthPaymentData = getPaymentTransactionsForMonth(previousMonth);

  // Separar transações (incluindo saldo inicial)
  const entradas = paymentData.filter(t => t.type === 'entrada');
  const saidas = paymentData.filter(t => t.type === 'saida');

  // Separar entradas e saídas do mês anterior
  const entradasMesAnterior = previousMonthPaymentData.filter(t => t.type === 'entrada');
  const saidasMesAnterior = previousMonthPaymentData.filter(t => t.type === 'saida');

  // Atualizar valor do pró-labore quando necessário (apenas se não foi ajustado manualmente)
  useEffect(() => {
    const proLaboreTransaction = saidas.find(s => s.id === 's1');
    
    // Só atualiza automaticamente se não foi ajustado manualmente
    if (proLaboreTransaction && !proLaboreTransaction.isManuallyAdjusted && proLaboreTransaction.value !== monthlyData.proLaboreTotal) {
      const updatedSaidas = saidas.map(saida => 
        saida.id === 's1' ? { ...saida, value: monthlyData.proLaboreTotal } : saida
      );
      const updatedPaymentData = [...entradas, ...updatedSaidas];
      updatePaymentTransactionsForMonth(selectedMonth, updatedPaymentData);
    }
  }, [monthlyData.proLaboreTotal, selectedMonth, saidas, entradas, updatePaymentTransactionsForMonth]);

  // Atualizar valor do DAS quando necessário (apenas se não foi ajustado manualmente)
  useEffect(() => {
    const dasTransaction = saidas.find(s => s.id === 's3');
    
    // Só atualiza automaticamente se não foi ajustado manualmente
    if (dasTransaction && !dasTransaction.isManuallyAdjusted && dasTransaction.value !== monthlyData.dasCalculado) {
      const updatedSaidas = saidas.map(saida => 
        saida.id === 's3' ? { ...saida, value: monthlyData.dasCalculado } : saida
      );
      const updatedPaymentData = [...entradas, ...updatedSaidas];
      updatePaymentTransactionsForMonth(selectedMonth, updatedPaymentData);
    }
  }, [monthlyData.dasCalculado, selectedMonth, saidas, entradas, updatePaymentTransactionsForMonth]);

  // Atualizar valor do INSS quando necessário (apenas se não foi ajustado manualmente)
  useEffect(() => {
    const inssTransaction = saidas.find(s => s.id === 's2');
    
    // Só atualiza automaticamente se não foi ajustado manualmente
    if (inssTransaction && !inssTransaction.isManuallyAdjusted && inssTransaction.value !== monthlyData.inssCalculado) {
      const updatedSaidas = saidas.map(saida => 
        saida.id === 's2' ? { ...saida, value: monthlyData.inssCalculado } : saida
      );
      const updatedPaymentData = [...entradas, ...updatedSaidas];
      updatePaymentTransactionsForMonth(selectedMonth, updatedPaymentData);
    }
  }, [monthlyData.inssCalculado, selectedMonth, saidas, entradas, updatePaymentTransactionsForMonth]);

  // Função para automaticamente definir categoria baseada no tipo
  const getDefaultCategory = (type: 'entrada' | 'saida'): string => {
    return type === 'entrada' ? 'Outras receitas' : 'Outras despesas';
  };

  // Funções para formatação de moeda brasileira
  const formatCurrencyInput = (value: string) => {
    // Remove tudo que não é dígito
    const numericValue = value.replace(/\D/g, '');
    
    // Se está vazio, retorna vazio
    if (!numericValue) return '';
    
    // Converte para centavos
    const cents = parseInt(numericValue, 10);
    
    // Converte centavos para reais
    const reais = cents / 100;
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(reais);
  };

  const parseCurrencyInput = (formattedValue: string): number => {
    // Remove R$, espaços, pontos e substitui vírgula por ponto
    const numericString = formattedValue
      .replace(/R\$\s?/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    
    return parseFloat(numericString) || 0;
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatCurrencyInput(inputValue);
    setEditForm(prev => ({ ...prev, value: formattedValue }));
  };

  const handleCreateValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatCurrencyInput(inputValue);
    setCreateForm(prev => ({ ...prev, value: formattedValue }));
  };

  const handleManualValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatCurrencyInput(inputValue);
    setManualValue(formattedValue);
  };

  // Função para lidar com mudança de tipo na criação (atualiza categoria automaticamente)
  const handleCreateTypeChange = (newType: 'entrada' | 'saida') => {
    const defaultCategory = getDefaultCategory(newType);
    setCreateForm(prev => ({ 
      ...prev, 
      type: newType,
      category: defaultCategory
    }));
  };

  // Função para lidar com seleção de data
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setEditForm(prev => ({ ...prev, dueDate: formattedDate }));
      setIsDatePickerOpen(false);
    }
  };

  const handleCreateDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setCreateForm(prev => ({ ...prev, dueDate: formattedDate }));
      setIsCreateDatePickerOpen(false);
    }
  };

  const totalEntradas = entradas.reduce((sum, item) => sum + item.value, 0);
  const totalSaidas = saidas.reduce((sum, item) => sum + item.value, 0);
  
  // Calcular totais do mês anterior para comparação (excluindo saldo inicial)
  const totalEntradasMesAnterior = entradasMesAnterior
    .filter(t => !t.isInitialBalance)
    .reduce((sum, item) => sum + item.value, 0);
  const totalSaidasMesAnterior = saidasMesAnterior.reduce((sum, item) => sum + item.value, 0);
  
  // Para cálculos de variação, excluir saldo inicial das entradas do mês atual
  const totalEntradasSemSaldoInicial = entradas
    .filter(t => !t.isInitialBalance)
    .reduce((sum, item) => sum + item.value, 0);
  
  // Calcular variações percentuais (sem considerar saldo inicial)
  const variacaoEntradas = totalEntradasMesAnterior > 0 
    ? ((totalEntradasSemSaldoInicial - totalEntradasMesAnterior) / totalEntradasMesAnterior) * 100
    : 0;
    
  const variacaoSaidas = totalSaidasMesAnterior > 0 
    ? ((totalSaidas - totalSaidasMesAnterior) / totalSaidasMesAnterior) * 100
    : 0;
  
  // Calcular apenas transações realizadas (completed) para o saldo final
  const entradasRealizadas = entradas.reduce((sum, item) => 
    item.completed ? sum + item.value : sum, 0);
  const saidasRealizadas = saidas.reduce((sum, item) => 
    item.completed ? sum + item.value : sum, 0);
  const saldoFinal = saldoInicial + entradasRealizadas - saidasRealizadas;

  // Calcular saldo previsto (todas as transações, independente de estarem realizadas)
  const saldoPrevisto = saldoInicial + totalEntradas - totalSaidas;

  // Calcular saldo final do mês anterior para comparação
  const saldoFinalMesAnterior = calculateFinalBalance(previousMonth);
  const diferenca = saldoFinal - saldoFinalMesAnterior;
  const percentualVariacao = saldoFinalMesAnterior > 0 ? ((diferenca / saldoFinalMesAnterior) * 100) : 0;
  const isPositive = diferenca >= 0;

  // Função para formatar valores sem o símbolo da moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Função específica para saldo inicial e final (mantém R$)
  const formatCurrencyWithSymbol = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para toggle do status da transação
  const toggleTransactionStatus = (id: string, type: 'entrada' | 'saida') => {
    console.log('Toggling transaction:', id, type); // Debug log
    const updatedPaymentData = paymentData.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    updatePaymentTransactionsForMonth(selectedMonth, updatedPaymentData);
  };

  // Função para abrir modal de edição
  const openEditModal = (transaction: Transaction) => {
    console.log('Opening edit modal for:', transaction); // Debug log
    setEditingTransaction(transaction);
    setEditForm({
      label: transaction.label,
      value: formatCurrencyWithSymbol(transaction.value), // Formata o valor como moeda
      type: transaction.type,
      description: transaction.description || '',
      category: transaction.category || '',
      dueDate: transaction.dueDate || '',
      replicateToNextMonths: false
    });

    // Se é pró-labore, DAS ou INSS, configurar estados específicos para ajuste manual
    if (transaction.id === 's1' || transaction.id === 's2' || transaction.id === 's3') {
      setIsManualAdjustment(transaction.isManuallyAdjusted || false);
      setManualValue(transaction.isManuallyAdjusted ? formatCurrencyWithSymbol(transaction.value) : '');
    }

    setIsEditModalOpen(true);
  };

  // Função para abrir modal de criação
  const openCreateModal = () => {
    const defaultType = 'entrada';
    const defaultCategory = getDefaultCategory(defaultType);
    
    setCreateForm({
      label: '',
      value: '',
      type: defaultType,
      description: '',
      category: defaultCategory,
      dueDate: '',
      replicateToNextMonths: false
    });
    setIsCreateModalOpen(true);
  };

  // Função para salvar edição
  const saveTransaction = () => {
    if (!editingTransaction) return;

    const updatedTransaction = {
      ...editingTransaction,
      label: editForm.label,
      value: parseCurrencyInput(editForm.value), // Converte valor formatado para número
      type: editForm.type,
      description: editForm.description,
      category: editForm.category,
      dueDate: editForm.dueDate
    };

    // Para pró-labore, lidar com ajuste manual
    if (editingTransaction.id === 's1' && editingTransaction.label === 'Pró-labore') {
      if (isManualAdjustment && manualValue) {
        // Usar valor manual
        updatedTransaction.value = parseCurrencyInput(manualValue);
        updatedTransaction.isManuallyAdjusted = true;
        updatedTransaction.description = `Retirada mensal do sócio - ajustado manualmente para ${selectedMonth}`;
      } else {
        // Voltar para cálculo automático
        updatedTransaction.value = monthlyData.proLaboreTotal;
        updatedTransaction.isManuallyAdjusted = false;
        updatedTransaction.description = 'Retirada mensal do sócio - calculado automaticamente';
      }
    }

    // Para DAS, lidar com ajuste manual
    if (editingTransaction.id === 's3' && editingTransaction.label.startsWith('DAS - Simples nacional')) {
      if (isManualAdjustment && manualValue) {
        // Usar valor manual
        updatedTransaction.value = parseCurrencyInput(manualValue);
        updatedTransaction.isManuallyAdjusted = true;
        updatedTransaction.description = `Documento de Arrecadação do Simples Nacional referente a ${monthlyData.previousMonth} - ajustado manualmente para ${selectedMonth}`;
      } else {
        // Voltar para cálculo automático
        updatedTransaction.value = monthlyData.dasCalculado;
        updatedTransaction.isManuallyAdjusted = false;
        updatedTransaction.description = `Documento de Arrecadação do Simples Nacional referente a ${monthlyData.previousMonth} - calculado automaticamente`;
      }
    }

    // Para INSS, lidar com ajuste manual
    if (editingTransaction.id === 's2' && editingTransaction.label.startsWith('INSS - Referente a')) {
      if (isManualAdjustment && manualValue) {
        // Usar valor manual
        updatedTransaction.value = parseCurrencyInput(manualValue);
        updatedTransaction.isManuallyAdjusted = true;
        updatedTransaction.description = `Contribuição previdenciária referente a ${monthlyData.previousMonth} - ajustado manualmente para ${selectedMonth}`;
      } else {
        // Voltar para cálculo automático
        updatedTransaction.value = monthlyData.inssCalculado;
        updatedTransaction.isManuallyAdjusted = false;
        updatedTransaction.description = `Contribuição previdenciária referente a ${monthlyData.previousMonth} - calculado automaticamente`;
      }
    }

    // Aplicar mudanças apenas no mês selecionado
    const updatedPaymentData = paymentData.map(item =>
      item.id === editingTransaction.id ? updatedTransaction : item
    );
    updatePaymentTransactionsForMonth(selectedMonth, updatedPaymentData);

    // Se a opção de replicar está marcada, aplicar aos próximos meses
    if (editForm.replicateToNextMonths) {
      replicateTransactionToNextMonths(updatedTransaction, selectedMonth);
    }

    setIsEditModalOpen(false);
    setEditingTransaction(null);
    setIsManualAdjustment(false);
    setManualValue('');
  };

  // Função para resetar para cálculo automático
  const resetToAutomatic = () => {
    setIsManualAdjustment(false);
    setManualValue('');
  };

  // Função para salvar nova transação
  const saveNewTransaction = () => {
    const newTransaction: Transaction = {
      id: `${createForm.type === 'entrada' ? 'e' : 's'}${Date.now()}`, // ID único baseado no timestamp
      label: createForm.label,
      value: parseCurrencyInput(createForm.value),
      type: createForm.type,
      completed: false,
      description: createForm.description,
      category: createForm.category,
      dueDate: createForm.dueDate
    };

    // Adicionar nova transação apenas ao mês selecionado
    const updatedPaymentData = [...paymentData, newTransaction];
    updatePaymentTransactionsForMonth(selectedMonth, updatedPaymentData);

    // Se a opção de replicar está marcada, aplicar aos próximos meses
    if (createForm.replicateToNextMonths) {
      replicateTransactionToNextMonths(newTransaction, selectedMonth);
    }

    setIsCreateModalOpen(false);
  };

  // Função para excluir transação
  const deleteTransaction = () => {
    if (!editingTransaction) return;
    
    // Remover transação apenas do mês selecionado
    const updatedPaymentData = paymentData.filter(item => item.id !== editingTransaction.id);
    updatePaymentTransactionsForMonth(selectedMonth, updatedPaymentData);

    setIsEditModalOpen(false);
    setEditingTransaction(null);
  };

  // Função para obter ícone da categoria
  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Renda': <Briefcase className="h-4 w-4" />,
      'Outras receitas': <Wallet className="h-4 w-4" />,
      'Retiradas': <Building className="h-4 w-4" />,
      'Impostos': <FileText className="h-4 w-4" />,
      'Serviços': <Wrench className="h-4 w-4" />,
      'Outras despesas': <Wallet className="h-4 w-4" />,
      'Saldo inicial': <RotateCcw className="h-4 w-4" />
    };
    return iconMap[category] || <Tag className="h-4 w-4" />;
  };

  // Função para formatar data no formato (DD/MM)
  const formatTransactionDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `(${day}/${month})`;
    } catch {
      return '';
    }
  };

  // Mini sparkline component
  const MiniSparkline = ({ color, trend }: { color: string, trend: 'up' | 'down' }) => {
    const points = trend === 'up' 
      ? "M2,18 L6,15 L10,12 L14,8 L18,5 L22,3" 
      : "M2,8 L6,10 L10,13 L14,15 L18,17 L22,18";
    
    return (
      <div className="w-16 h-8 opacity-60">
        <svg width="100%" height="100%" viewBox="0 0 24 20" className="overflow-visible">
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={color} stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          <path
            d={`${points} L22,20 L2,20 Z`}
            fill={`url(#gradient-${color})`}
          />
          <path
            d={points}
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-lg p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-gray-800">Gestão de pagamento - {selectedMonth}</h3>
          </div>
          <Button 
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white border-0 w-8 h-8 p-0 flex items-center justify-center"
            onClick={openCreateModal}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Payment Lines */}
        <div className="space-y-0">
          {/* Saldo Inicial */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-700 font-medium text-[12px]">Saldo inicial</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                Transportado de {previousMonth}
              </span>
            </div>
            <span className={`text-gray-900 font-semibold text-[12px] ${saldoInicial === 0 ? 'text-gray-400' : ''}`}>
              {formatCurrencyWithSymbol(saldoInicial)}
            </span>
          </div>

          {/* Entradas */}
          <div className="py-2">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-semibold text-[rgba(30,41,57,1)] text-[14px]">Entradas</span>
            </div>
            {entradas.map((entrada) => (
              <div 
                key={entrada.id} 
                className="group flex items-center py-3 pl-6 border-b border-gray-50 transition-all duration-200 bg-white hover:bg-gray-50/80 cursor-pointer"
                onClick={() => openEditModal(entrada)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    entrada.isInitialBalance 
                      ? 'bg-blue-400' 
                      : entrada.completed 
                        ? 'bg-green-400' 
                        : 'bg-gray-400'
                  }`}></div>
                  {getCategoryIcon(entrada.category || '')}
                  <span className="transition-all duration-200 text-gray-600 flex items-center gap-2 truncate">
                    {entrada.label}
                    {entrada.dueDate && (
                      <span className="text-xs text-gray-400 font-normal">
                        {formatTransactionDate(entrada.dueDate)}
                      </span>
                    )}
                    {entrada.isInitialBalance && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        Configuração inicial
                      </span>
                    )}
                    {isRendaTransaction(entrada.category || '') && !entrada.isInitialBalance && (
                      <Repeat className="w-3 h-3 text-blue-500 flex-shrink-0" title="Transação recorrente - Nome editável" />
                    )}
                    {isFixedTransaction(entrada.label) && !isRendaTransaction(entrada.category || '') && !entrada.isInitialBalance && (
                      <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    )}
                  </span>
                </div>
                
                {/* Categoria centralizada */}
                <div className="flex items-center justify-center flex-shrink-0 mx-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 p-[0px]">
                    <span>{entrada.category}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`font-medium transition-all duration-200 ${entrada.value === 0 ? 'text-gray-400' : ''}`} style={{ color: entrada.value === 0 ? undefined : '#2E312D', fontSize: '14px' }}>
                    +{formatCurrency(entrada.value)}
                  </span>
                  
                  {/* Checkbox movido para a direita - Saldo inicial sempre marcado */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={entrada.completed}
                      onCheckedChange={() => !entrada.isInitialBalance && toggleTransactionStatus(entrada.id, 'entrada')}
                      disabled={entrada.isInitialBalance}
                      className={`border-gray-300 ${
                        entrada.isInitialBalance
                          ? 'bg-blue-100 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500'
                          : 'bg-gray-100 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 data-[state=unchecked]:bg-gray-100 data-[state=unchecked]:border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Saídas */}
          <div className="py-2">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-semibold text-[rgba(30,41,57,1)] text-[14px]">Saídas</span>
            </div>
            {saidas.map((saida) => (
              <div 
                key={saida.id} 
                className="group flex items-center py-3 pl-6 border-b border-gray-50 transition-all duration-200 bg-white hover:bg-gray-50/80 cursor-pointer"
                onClick={() => openEditModal(saida)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${saida.completed ? 'bg-red-400' : 'bg-gray-400'}`}></div>
                  {getCategoryIcon(saida.category || '')}
                  <span className="transition-all duration-200 text-gray-600 flex items-center gap-2 truncate">
                    {saida.label}
                    {saida.dueDate && (
                      <span className="text-xs text-gray-400 font-normal">
                        {formatTransactionDate(saida.dueDate)}
                      </span>
                    )}
                    {/* Transações automáticas: pró-labore, INSS e DAS */}
                    {(saida.id === 's1' || saida.id === 's2' || saida.id === 's3') && (
                      <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    )}
                    {/* Transações fixas editáveis: contabilidade e distribuição de lucros */}
                    {(saida.id === 's4' || saida.id === 's1b') && (
                      <Repeat className="w-3 h-3 text-blue-500 flex-shrink-0" title="Transação recorrente - Valor editável" />
                    )}
                    {/* Outras transações fixas */}
                    {isFixedTransaction(saida.label) && saida.id !== 's1' && saida.id !== 's2' && saida.id !== 's3' && saida.id !== 's4' && saida.id !== 's1b' && (
                      <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    )}
                    {(saida.id === 's1' || saida.id === 's2' || saida.id === 's3') && saida.isManuallyAdjusted && (
                      <Edit3 className="w-3 h-3 text-orange-500 flex-shrink-0" title="Valor ajustado manualmente" />
                    )}
                  </span>
                </div>
                
                {/* Categoria centralizada */}
                <div className="flex items-center justify-center flex-shrink-0 mx-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>{saida.category}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`font-medium transition-all duration-200 ${saida.value === 0 ? 'text-gray-400' : ''}`} style={{ color: saida.value === 0 ? undefined : '#2E312D', fontSize: '14px' }}>
                    -{formatCurrency(saida.value)}
                  </span>
                  
                  {/* Checkbox movido para a direita */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={saida.completed}
                      onCheckedChange={() => toggleTransactionStatus(saida.id, 'saida')}
                      className="border-gray-300 bg-gray-100 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 data-[state=unchecked]:bg-gray-100 data-[state=unchecked]:border-gray-300"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Saldo Previsto */}
          <div className="flex items-center justify-between py-3 mt-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span className="text-gray-500 font-medium text-[12px]">Saldo previsto</span>
            </div>
            <span className="text-gray-500 font-medium" style={{ fontSize: '12px' }}>
              {formatCurrencyWithSymbol(saldoPrevisto)}
            </span>
          </div>

          {/* Saldo Final */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[rgba(30,41,57,1)] rounded-full"></div>
              <span className="text-gray-700 font-medium text-[12px]">Saldo final</span>
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{percentualVariacao.toFixed(1)}% vs mês anterior
                </span>
              </div>
            </div>
            <span className={`font-semibold ${saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ fontSize: '12px' }}>
              {formatCurrencyWithSymbol(saldoFinal)}
            </span>
          </div>
        </div>

        {/* Summary Stats - New Design */}
        <div className="mt-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Total Income Card */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Total Entradas</div>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  </div>
                  <div className={`text-2xl font-semibold mb-1 ${totalEntradas === 0 ? 'text-gray-400' : 'text-[rgba(0,166,62,1)]'}`}>
                    {formatCurrencyWithSymbol(totalEntradas)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      totalEntradasSemSaldoInicial === 0 || Math.abs(variacaoEntradas) < 0.1
                        ? 'bg-gray-300' 
                        : variacaoEntradas > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-xs font-medium ${
                      totalEntradasSemSaldoInicial === 0 || Math.abs(variacaoEntradas) < 0.1
                        ? 'text-gray-400' 
                        : variacaoEntradas > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {variacaoEntradas >= 0 ? '+' : ''}{variacaoEntradas.toFixed(1)}% vs {previousMonth}
                    </span>
                  </div>
                </div>
                <div className="flex items-end">
                  <MiniSparkline 
                    color={totalEntradasSemSaldoInicial === 0 || Math.abs(variacaoEntradas) < 0.1 ? "#9ca3af" : (variacaoEntradas > 0 ? "#10b981" : "#ef4444")} 
                    trend={variacaoEntradas > 0 ? "up" : "down"} 
                  />
                </div>
              </div>
            </div>

            {/* Total Expense Card */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Total Saídas</div>
                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  </div>
                  <div className={`text-2xl font-semibold mb-1 ${totalSaidas === 0 ? 'text-gray-400' : 'text-[rgba(194,48,37,1)]'}`}>
                    {formatCurrencyWithSymbol(totalSaidas)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      totalSaidas === 0 || Math.abs(variacaoSaidas) < 0.1
                        ? 'bg-gray-300' 
                        : variacaoSaidas < 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-xs font-medium ${
                      totalSaidas === 0 || Math.abs(variacaoSaidas) < 0.1
                        ? 'text-gray-400' 
                        : variacaoSaidas < 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {variacaoSaidas >= 0 ? '+' : ''}{variacaoSaidas.toFixed(1)}% vs {previousMonth}
                    </span>
                  </div>
                </div>
                <div className="flex items-end">
                  <MiniSparkline 
                    color={totalSaidas === 0 || Math.abs(variacaoSaidas) < 0.1 ? "#9ca3af" : (variacaoSaidas < 0 ? "#10b981" : "#ef4444")} 
                    trend={variacaoSaidas < 0 ? "down" : "up"} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-white border-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 space-y-0">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-semibold text-gray-900 m-0 flex items-center gap-2">
                {editingTransaction?.isInitialBalance ? (
                  <>
                    <RotateCcw className="w-5 h-5 text-blue-500" />
                    Saldo inicial da empresa
                  </>
                ) : editingTransaction && (isFixedTransaction(editingTransaction.label) || editingTransaction.id === 's1' || editingTransaction.id === 's2' || editingTransaction.id === 's3') ? (
                  (editingTransaction.id === 's4' || editingTransaction.id === 's1b') ? (
                    <>
                      <Repeat className="w-5 h-5 text-blue-500" />
                      {editingTransaction.id === 's4' ? 'Contabilidade - Transação recorrente' : 'Distribuição de lucros - Transação recorrente'}
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 text-amber-500" />
                      {editingTransaction.id === 's1' ? 'Pró-labore - Ajustar valor' : 
                       editingTransaction.id === 's2' ? 'INSS - Ajustar valor' :
                       editingTransaction.id === 's3' ? 'DAS - Ajustar valor' : 'Editar transação fixa'}
                    </>
                  )
                ) : (
                  "Editar transação"
                )}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 m-0">
                {editingTransaction?.isInitialBalance
                  ? `Este é o saldo inicial da empresa em ${companySettings?.startMonth}. Edite o valor para ajustar o ponto de partida financeiro da empresa.`
                  : editingTransaction && editingTransaction.id === 's1'
                    ? `Configure o pró-labore para ${selectedMonth}. Você pode usar o cálculo automático ou definir um valor manual.`
                    : editingTransaction && editingTransaction.id === 's2'
                      ? `Configure o INSS referente a ${monthlyData.previousMonth} para pagamento em ${selectedMonth}. Você pode usar o cálculo automático ou definir um valor manual.`
                      : editingTransaction && editingTransaction.id === 's3'
                        ? `Configure o DAS referente a ${monthlyData.previousMonth} para pagamento em ${selectedMonth}. Você pode usar o cálculo automático ou definir um valor manual.`
                        : editingTransaction && editingTransaction.id === 's4'
                          ? `Edite o valor da contabilidade para ${selectedMonth}. Este é um valor fixo mensal que pode ser ajustado conforme reajustes contratuais.`
                          : editingTransaction && editingTransaction.id === 's1b'
                            ? `Edite o valor da distribuição de lucros para ${selectedMonth}. Este é um valor fixo mensal que pode ser ajustado conforme a distribuição desejada.`
                            : editingTransaction && isFixedTransaction(editingTransaction.label) 
                            ? isRendaTransaction(editingTransaction.category || '')
                            ? `Esta é uma transação da categoria Renda. A categoria é fixa, mas o nome pode ser personalizado para ${selectedMonth}.`
                            : `Esta é uma transação fixa do sistema. Apenas o valor pode ser alterado para ${selectedMonth}.`
                            : `Modifique os detalhes da transação para ${selectedMonth}`
                }
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Conteúdo do modal */}
          <div className="px-6 pb-6 space-y-6">
            {editingTransaction?.isInitialBalance ? (
              // Modal específico para saldo inicial
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <RotateCcw className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-medium text-blue-900">Saldo inicial da empresa</h4>
                  </div>
                  <p className="text-sm text-blue-800">
                    Este valor representa o dinheiro que a empresa possuía quando começou suas operações em {companySettings?.startMonth}.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="initial-balance-value" className="text-sm font-medium text-gray-900">
                    Valor do saldo inicial
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="initial-balance-value"
                      value={editForm.value}
                      onChange={handleValueChange}
                      placeholder="R$ 0,00"
                      className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                      style={{ height: '40px' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Este valor impacta todos os cálculos de saldo a partir de {companySettings?.startMonth}
                  </p>
                </div>
              </div>
            ) : editingTransaction && (editingTransaction.id === 's1' || editingTransaction.id === 's2' || editingTransaction.id === 's3') ? (
              // Modal especial para pró-labore, INSS e DAS com opção de ajuste manual
              <div className="space-y-6">
                {/* Cálculo automático */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-blue-900">Cálculo Automático</h4>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <span className="text-xs text-blue-700">Atualizado automaticamente</span>
                    </div>
                  </div>
                  {editingTransaction.id === 's1' && (
                    <div className="text-sm text-blue-800 space-y-1">
                      <div>Faturamento: {formatCurrencyWithSymbol(monthlyData.faturamentoTotal)}</div>
                      <div>Taxa: {companySettings ? (companySettings.taxSettings.proLaborePercentual * 100).toFixed(1) : '0'}%</div>
                      <div className="font-semibold border-t border-blue-200 mt-2 pt-2">
                        Valor calculado: {formatCurrencyWithSymbol(monthlyData.proLaboreTotal)}
                      </div>
                    </div>
                  )}
                  {editingTransaction.id === 's2' && (
                    <div className="text-sm text-blue-800 space-y-1">
                      <div>Pró-labore de {monthlyData.previousMonth}: {formatCurrencyWithSymbol(previousMonthProLabore)}</div>
                      <div>Taxa INSS: {companySettings ? (companySettings.taxSettings.inssPercentual * 100).toFixed(1) : '0'}%</div>
                      <div className="font-semibold border-t border-blue-200 mt-2 pt-2">
                        Valor calculado: {formatCurrencyWithSymbol(monthlyData.inssCalculado)}
                      </div>
                    </div>
                  )}
                  {editingTransaction.id === 's3' && (
                    <div className="text-sm text-blue-800 space-y-1">
                      <div>Faturamento de {monthlyData.previousMonth}: {formatCurrencyWithSymbol(previousMonthFaturamento)}</div>
                      <div>Taxa de imposto: {companySettings ? (companySettings.taxSettings.dasAliquota * 100).toFixed(1) : '0'}%</div>
                      <div className="font-semibold border-t border-blue-200 mt-2 pt-2">
                        Valor calculado: {formatCurrencyWithSymbol(monthlyData.dasCalculado)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Opção de ajuste manual */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-900">Ajuste manual</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Habilite para definir um valor específico (útil para pequenos ajustes de centavos)
                      </p>
                    </div>
                    <Switch
                      checked={isManualAdjustment}
                      onCheckedChange={setIsManualAdjustment}
                    />
                  </div>

                  {isManualAdjustment && (
                    <div className="space-y-3">
                      <Label htmlFor="manual-value" className="text-sm font-medium text-gray-900">
                        Valor manual
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="manual-value"
                          value={manualValue}
                          onChange={handleManualValueChange}
                          placeholder="R$ 0,00"
                          className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-orange-500 transition-all duration-200"
                          style={{ height: '40px' }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          Diferença: {manualValue ? formatCurrencyWithSymbol(
                              parseCurrencyInput(manualValue) - 
                              (editingTransaction.id === 's1' ? monthlyData.proLaboreTotal : 
                               editingTransaction.id === 's2' ? monthlyData.inssCalculado : 
                               monthlyData.dasCalculado)
                            ) : 'R$ 0,00'}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={resetToAutomatic}
                          className="text-xs h-6 px-2"
                        >
                          Resetar para automático
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Valor final */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      Valor final {editingTransaction.id === 's1' ? 'do pró-labore' : 
                                   editingTransaction.id === 's2' ? 'do INSS' : 'do DAS'}:
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      {isManualAdjustment && manualValue ? 
                        formatCurrencyWithSymbol(parseCurrencyInput(manualValue)) :
                        formatCurrencyWithSymbol(
                          editingTransaction.id === 's1' ? monthlyData.proLaboreTotal : 
                          editingTransaction.id === 's2' ? monthlyData.inssCalculado : 
                          monthlyData.dasCalculado
                        )
                      }
                    </span>
                  </div>
                  {isManualAdjustment && manualValue && (
                    <div className="mt-2 flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-orange-500" />
                      <span className="text-xs text-orange-700">Valor ajustado manualmente</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Modal normal de edição para outras transações
              <>
                {/* Nome da transação */}
                <div className="space-y-3">
                  <Label htmlFor="label" className="text-sm font-medium text-gray-900">
                    Nome da transação
                  </Label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="label"
                      value={editForm.label}
                      onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="Ex: Salário, INSS, Pró-labore"
                      className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                      style={{ height: '40px' }}
                      disabled={editingTransaction && isFixedTransaction(editingTransaction.label) && !isRendaTransaction(editingTransaction.category || '')}
                    />
                  </div>
                </div>

                {/* Valor e Tipo lado a lado */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="value" className="text-sm font-medium text-gray-900">
                      Valor
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="value"
                        value={editForm.value}
                        onChange={handleValueChange}
                        placeholder="R$ 0,00"
                        className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                        style={{ height: '40px' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="type" className="text-sm font-medium text-gray-900">
                      Tipo
                    </Label>
                    <Select 
                      value={editForm.type} 
                      onValueChange={(value: 'entrada' | 'saida') => setEditForm(prev => ({ ...prev, type: value }))}
                      disabled={editingTransaction && isFixedTransaction(editingTransaction.label) && !isRendaTransaction(editingTransaction.category || '')}
                    >
                      <SelectTrigger 
                        className="transition-all duration-200"
                        style={{
                          height: '40px',
                          backgroundColor: '#f9fafb',
                          borderColor: '#e5e7eb',
                          borderWidth: '1px'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#3b82f6';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="h-4 w-4 text-green-500" />
                            <span>Entrada</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="saida">
                          <div className="flex items-center gap-2">
                            <ArrowDownCircle className="h-4 w-4 text-red-500" />
                            <span>Saída</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Categoria e Data lado a lado */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="category" className="text-sm font-medium text-gray-900">
                      Categoria
                    </Label>
                    {editingTransaction && (isCategoryLocked(editingTransaction.category || '') || isRendaTransaction(editingTransaction.category || '')) ? (
                      // Campo bloqueado para "Outras receitas", "Outras despesas" e "Renda"
                      <>
                        <div className="relative">
                          <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="category"
                            value={editForm.category}
                            className="pl-10 bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
                            style={{ height: '40px' }}
                            disabled
                            readOnly
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <Lock className="w-3 h-3 text-gray-400" />
                          <span>Categoria protegida</span>
                        </div>
                      </>
                    ) : (
                      // Campo editável para outras categorias
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="category"
                          value={editForm.category}
                          onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                          placeholder="Ex: Impostos, Salários"
                          className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                          style={{ height: '40px' }}
                          disabled={editingTransaction && isFixedTransaction(editingTransaction.label) && !isRendaTransaction(editingTransaction.category || '')}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">
                      Data de vencimento
                    </Label>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-white hover:border-blue-500 transition-all duration-200"
                          style={{ height: '40px' }}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                          {editForm.dueDate ? (
                            format(new Date(editForm.dueDate), "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span className="text-gray-500">Selecionar data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={editForm.dueDate ? new Date(editForm.dueDate) : undefined}
                          onSelect={handleDateSelect}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Descrição */}
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-900">
                    Descrição (opcional)
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <textarea
                      id="description"
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Adicione detalhes sobre esta transação..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none transition-all duration-200 resize-none"
                      style={{ height: '40px' }}
                      rows={1}
                      disabled={editingTransaction && isFixedTransaction(editingTransaction.label) && !isRendaTransaction(editingTransaction.category || '')}
                    />
                  </div>
                </div>

                {/* Opção de replicar (apenas para transações não fixas, transações de Renda, Contabilidade ou Distribuição de lucros) */}
                {editingTransaction && (!isFixedTransaction(editingTransaction.label) || isRendaTransaction(editingTransaction.category || '') || (editingTransaction.label && editingTransaction.label.startsWith('Contabilidade - Referente a')) || editingTransaction.id === 's1b') && (
                  <div className="flex items-center justify-between bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Repeat className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-sm font-medium text-blue-900">Replicar para próximos meses</div>
                        <div className="text-xs text-blue-700">Aplicar as mesmas alterações nos próximos 12 meses</div>
                      </div>
                    </div>
                    <Switch
                      checked={editForm.replicateToNextMonths}
                      onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, replicateToNextMonths: checked }))}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-gray-100">
            <div className="flex gap-3 w-full">
              {editingTransaction && !isFixedTransaction(editingTransaction.label) && !isRendaTransaction(editingTransaction.category || '') && !editingTransaction.isInitialBalance && editingTransaction.id !== 's1' && editingTransaction.id !== 's2' && editingTransaction.id !== 's3' && (
                <Button
                  onClick={deleteTransaction}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                  style={{ height: '40px' }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
              <Button
                onClick={saveTransaction}
                disabled={(editingTransaction?.id === 's1' || editingTransaction?.id === 's2' || editingTransaction?.id === 's3') && isManualAdjustment && !manualValue.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                style={{ height: '40px' }}
              >
                {editingTransaction?.isInitialBalance ? 'Salvar saldo inicial' : 
                 (editingTransaction?.id === 's1' || editingTransaction?.id === 's2' || editingTransaction?.id === 's3') ? 'Salvar configuração' : 'Salvar alterações'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-white border-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 space-y-0">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-semibold text-gray-900 m-0">
                Nova transação
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 m-0">
                Adicione uma nova entrada ou saída ao fluxo de caixa para {selectedMonth}. 
                Apenas transações da categoria "Outras receitas" ou "Outras despesas" podem ser criadas.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Conteúdo do modal */}
          <div className="px-6 pb-6 space-y-6">
            {/* Nome da transação */}
            <div className="space-y-3">
              <Label htmlFor="create-label" className="text-sm font-medium text-gray-900">
                Nome da transação
              </Label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="create-label"
                  value={createForm.label}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="Ex: Venda adicional, Despesa extra"
                  className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                  style={{ height: '40px' }}
                />
              </div>
            </div>

            {/* Valor e Tipo lado a lado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="create-value" className="text-sm font-medium text-gray-900">
                  Valor
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="create-value"
                    value={createForm.value}
                    onChange={handleCreateValueChange}
                    placeholder="R$ 0,00"
                    className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    style={{ height: '40px' }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="create-type" className="text-sm font-medium text-gray-900">
                  Tipo
                </Label>
                <Select 
                  value={createForm.type} 
                  onValueChange={handleCreateTypeChange}
                >
                  <SelectTrigger 
                    className="transition-all duration-200"
                    style={{
                      height: '40px',
                      backgroundColor: '#f9fafb',
                      borderColor: '#e5e7eb',
                      borderWidth: '1px'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-green-500" />
                        <span>Entrada</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="saida">
                      <div className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                        <span>Saída</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Categoria (bloqueada) e Data lado a lado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="create-category" className="text-sm font-medium text-gray-900">
                  Categoria
                </Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="create-category"
                    value={createForm.category}
                    className="pl-10 bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
                    style={{ height: '40px' }}
                    disabled
                    readOnly
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <RefreshCw className="w-3 h-3 text-gray-400" />
                  <span>Categoria definida automaticamente</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">
                  Data de vencimento
                </Label>
                <Popover open={isCreateDatePickerOpen} onOpenChange={setIsCreateDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-gray-50 border-gray-200 hover:bg-white hover:border-blue-500 transition-all duration-200"
                      style={{ height: '40px' }}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                      {createForm.dueDate ? (
                        format(new Date(createForm.dueDate), "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span className="text-gray-500">Selecionar data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={createForm.dueDate ? new Date(createForm.dueDate) : undefined}
                      onSelect={handleCreateDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-3">
              <Label htmlFor="create-description" className="text-sm font-medium text-gray-900">
                Descrição (opcional)
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  id="create-description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Adicione detalhes sobre esta transação..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none transition-all duration-200 resize-none"
                  style={{ height: '40px' }}
                  rows={1}
                />
              </div>
            </div>

            {/* Opção de replicar */}
            <div className="flex items-center justify-between bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Repeat className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-blue-900">Replicar para próximos meses</div>
                  <div className="text-xs text-blue-700">Criar a mesma transação nos próximos 12 meses</div>
                </div>
              </div>
              <Switch
                checked={createForm.replicateToNextMonths}
                onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, replicateToNextMonths: checked }))}
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-gray-100">
            <Button
              onClick={saveNewTransaction}
              disabled={!createForm.label.trim() || !createForm.value.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white border-0 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
              style={{ height: '40px' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar transação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
