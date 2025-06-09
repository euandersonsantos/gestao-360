import { useState, useEffect } from 'react';
import { Building2, DollarSign, Settings, Percent, Edit3 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCompanies } from '../hooks/useCompanies';
import { usePaymentContext } from '../hooks/useFinancialData';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const years = ['2023', '2024', '2025', '2026', '2027'];

export function EditCompanyModal({ isOpen, onClose }: EditCompanyModalProps) {
  const { activeCompany, updateCompany } = useCompanies();
  const { updatePaymentTransactionsForMonth, getPaymentTransactionsForMonth } = usePaymentContext();
  
  const [formData, setFormData] = useState({
    name: '',
    selectedMonth: '',
    selectedYear: '',
    initialBalance: '',
    proLaborePercentual: '',
    inssPercentual: '',
    dasAliquota: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && activeCompany) {
      const [monthName, year] = activeCompany.startMonth ? activeCompany.startMonth.split(' ') : ['', ''];
      
      setFormData({
        name: activeCompany.name,
        selectedMonth: monthName,
        selectedYear: year,
        initialBalance: activeCompany.initialBalance ? formatCurrencyInput((activeCompany.initialBalance * 100).toString()) : '',
        proLaborePercentual: activeCompany.taxSettings ? formatPercentageInput(activeCompany.taxSettings.proLaborePercentual * 100) : '28',
        inssPercentual: activeCompany.taxSettings ? formatPercentageInput(activeCompany.taxSettings.inssPercentual * 100) : '11',
        dasAliquota: activeCompany.taxSettings ? formatPercentageInput(activeCompany.taxSettings.dasAliquota * 100) : '6'
      });
    }
  }, [isOpen, activeCompany]);

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const cents = parseInt(numericValue, 10);
    const reais = cents / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(reais);
  };

  const parseCurrencyInput = (formattedValue: string): number => {
    const numericString = formattedValue
      .replace(/R\$\s?/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(numericString) || 0;
  };

  // Funções específicas para formatação de percentuais brasileiros
  const formatPercentageInput = (value: number): string => {
    // Evita problemas de precisão de ponto flutuante arredondando para 2 casas decimais
    const rounded = Math.round(value * 100) / 100;
    
    // Formatar como string brasileira (vírgula como separador decimal)
    if (rounded % 1 === 0) {
      // Se é número inteiro, mostrar apenas o número
      return rounded.toString();
    } else {
      // Se tem decimais, formatar com vírgula
      return rounded.toFixed(1).replace('.', ',');
    }
  };

  const parsePercentageInput = (formattedValue: string): number => {
    if (!formattedValue || formattedValue.trim() === '') return 0;
    
    // Remove tudo exceto números e vírgulas
    const cleaned = formattedValue.replace(/[^0-9,]/g, '');
    if (!cleaned) return 0;
    
    // Converte vírgula para ponto e garante número válido
    const numericString = cleaned.replace(',', '.');
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Função para formatação em tempo real durante digitação
  const formatPercentageForDisplay = (value: string): string => {
    if (!value || value.trim() === '') return '';
    
    // Remove tudo exceto números e vírgulas
    const cleaned = value.replace(/[^0-9,]/g, '');
    if (!cleaned) return '';
    
    // Permitir vírgula decimal
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      const integerPart = parts[0];
      const decimalPart = parts[1] ? parts[1].substring(0, 1) : ''; // Limitar a 1 casa decimal
      
      return decimalPart ? `${integerPart},${decimalPart}` : `${integerPart},`;
    }
    
    return cleaned;
  };

  const handleInitialBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatCurrencyInput(inputValue);
    setFormData(prev => ({ ...prev, initialBalance: formattedValue }));
  };

  const updateInitialBalanceTransaction = (month: string, newValue: number, oldValue: number) => {
    const existingTransactions = getPaymentTransactionsForMonth(month);
    let updatedTransactions = [...existingTransactions];

    const initialBalanceIndex = updatedTransactions.findIndex(t => t.isInitialBalance);
    if (initialBalanceIndex !== -1) {
      updatedTransactions.splice(initialBalanceIndex, 1);
    }

    if (newValue > 0) {
      const initialBalanceTransaction = {
        id: 'initial-balance',
        label: 'Saldo inicial',
        value: newValue,
        type: 'entrada' as const,
        completed: true,
        description: `Saldo inicial da empresa definido para ${month}`,
        category: 'Saldo inicial',
        isInitialBalance: true
      };
      updatedTransactions.unshift(initialBalanceTransaction);
    }

    updatePaymentTransactionsForMonth(month, updatedTransactions);
  };

  const handleSubmit = async () => {
    if (!activeCompany || !formData.name.trim() || !formData.selectedMonth || !formData.selectedYear) {
      return;
    }

    setIsLoading(true);
    
    try {
      const newStartMonth = `${formData.selectedMonth} ${formData.selectedYear}`;
      const newInitialBalance = parseCurrencyInput(formData.initialBalance);
      const oldStartMonth = activeCompany.startMonth;
      const oldInitialBalance = activeCompany.initialBalance || 0;

      await updateCompany(activeCompany.id, {
        name: formData.name,
        startMonth: newStartMonth,
        initialBalance: newInitialBalance,
        taxSettings: {
          proLaborePercentual: parsePercentageInput(formData.proLaborePercentual) / 100,
          inssPercentual: parsePercentageInput(formData.inssPercentual) / 100,
          dasAliquota: parsePercentageInput(formData.dasAliquota) / 100,
        }
      });

      if (oldStartMonth && newStartMonth && oldStartMonth !== newStartMonth) {
        const oldTransactions = getPaymentTransactionsForMonth(oldStartMonth);
        const updatedOldTransactions = oldTransactions.filter(t => !t.isInitialBalance);
        updatePaymentTransactionsForMonth(oldStartMonth, updatedOldTransactions);

        updateInitialBalanceTransaction(newStartMonth, newInitialBalance, 0);
      } else if (newStartMonth) {
        updateInitialBalanceTransaction(newStartMonth, newInitialBalance, oldInitialBalance);
      }

      onClose();
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name.trim() && formData.selectedMonth && formData.selectedYear;

  if (!activeCompany) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-white border-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 space-y-0">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-semibold text-gray-900 m-0 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-500" />
              Editar empresa
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 m-0">
              Modifique as configurações da empresa {activeCompany.name}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="company-name" className="text-sm font-medium text-gray-900">
              Nome da empresa
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="company-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Minha Empresa Ltda"
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                style={{ height: '40px' }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">Mês de início</Label>
                <Select value={formData.selectedMonth} onValueChange={(value) => setFormData(prev => ({ ...prev, selectedMonth: value }))}>
                  <SelectTrigger className="h-10 bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">Ano</Label>
                <Select value={formData.selectedYear} onValueChange={(value) => setFormData(prev => ({ ...prev, selectedYear: value }))}>
                  <SelectTrigger className="h-10 bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial-balance" className="text-sm font-medium text-gray-900">
                Saldo inicial
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="initial-balance"
                  value={formData.initialBalance}
                  onChange={handleInitialBalanceChange}
                  placeholder="R$ 0,00"
                  className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                  style={{ height: '40px' }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Alterar este valor atualizará a transação de saldo inicial automaticamente
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-500" />
              Configurações fiscais
            </h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700">Pró-labore (%)</Label>
                <div className="relative">
                  <Input
                    value={formData.proLaborePercentual}
                    onChange={(e) => {
                      const formatted = formatPercentageForDisplay(e.target.value);
                      setFormData(prev => ({ ...prev, proLaborePercentual: formatted }));
                    }}
                    placeholder="28,1"
                    className="pr-8 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200 text-sm h-9"
                  />
                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700">INSS (%)</Label>
                <div className="relative">
                  <Input
                    value={formData.inssPercentual}
                    onChange={(e) => {
                      const formatted = formatPercentageForDisplay(e.target.value);
                      setFormData(prev => ({ ...prev, inssPercentual: formatted }));
                    }}
                    placeholder="11,0"
                    className="pr-8 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200 text-sm h-9"
                  />
                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700">DAS (%)</Label>
                <div className="relative">
                  <Input
                    value={formData.dasAliquota}
                    onChange={(e) => {
                      const formatted = formatPercentageForDisplay(e.target.value);
                      setFormData(prev => ({ ...prev, dasAliquota: formatted }));
                    }}
                    placeholder="6,0"
                    className="pr-8 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-all duration-200 text-sm h-9"
                  />
                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100">
          <div className="flex gap-3 w-full">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-200"
              style={{ height: '40px' }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
              style={{ height: '40px' }}
            >
              {isLoading ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}