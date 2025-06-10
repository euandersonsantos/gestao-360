import { useState, useEffect } from 'react';
import { Building2, DollarSign, Settings, Percent, Edit3 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCompanies, Company } from '../hooks/useCompanies';
import { usePaymentContext } from '../hooks/useFinancialData';

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSave: (updatedCompany: Company) => Promise<void>;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const years = ['2023', '2024', '2025', '2026', '2027'];

export function EditCompanyModal({ isOpen, onClose, company, onSave }: EditCompanyModalProps) {
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
    if (isOpen && (company || activeCompany)) {
      const targetCompany = company || activeCompany;
      if (targetCompany) {
        const [monthName, year] = targetCompany.startMonth ? targetCompany.startMonth.split(' ') : ['', ''];
        
        setFormData({
          name: targetCompany.name,
          selectedMonth: monthName,
          selectedYear: year,
          initialBalance: targetCompany.initialBalance ? formatCurrencyInput((targetCompany.initialBalance * 100).toString()) : '',
          proLaborePercentual: targetCompany.taxSettings ? formatPercentageInput(targetCompany.taxSettings.proLaborePercentual * 100) : '28',
          inssPercentual: targetCompany.taxSettings ? formatPercentageInput(targetCompany.taxSettings.inssPercentual * 100) : '11',
          dasAliquota: targetCompany.taxSettings ? formatPercentageInput(targetCompany.taxSettings.dasAliquota * 100) : '6'
        });
      }
    }
  }, [isOpen, company, activeCompany]);

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

  const formatPercentageInput = (value: number): string => {
    const rounded = Math.round(value * 100) / 100;
    
    if (rounded % 1 === 0) {
      return rounded.toString();
    } else {
      return rounded.toFixed(1).replace('.', ',');
    }
  };

  const parsePercentageInput = (formattedValue: string): number => {
    if (!formattedValue || formattedValue.trim() === '') return 0;
    
    const cleaned = formattedValue.replace(/[^0-9,]/g, '');
    if (!cleaned) return 0;
    
    const numericString = cleaned.replace(',', '.');
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatPercentageForDisplay = (value: string): string => {
    if (!value || value.trim() === '') return '';
    
    const cleaned = value.replace(/[^0-9,]/g, '');
    if (!cleaned) return '';
    
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      const integerPart = parts[0];
      const decimalPart = parts[1] ? parts[1].substring(0, 1) : '';
      
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
    const targetCompany = company || activeCompany;
    if (!targetCompany || !formData.name.trim() || !formData.selectedMonth || !formData.selectedYear) {
      return;
    }

    setIsLoading(true);
    
    try {
      const newStartMonth = `${formData.selectedMonth} ${formData.selectedYear}`;
      const newInitialBalance = parseCurrencyInput(formData.initialBalance);
      const oldStartMonth = targetCompany.startMonth;
      const oldInitialBalance = targetCompany.initialBalance || 0;

      const updatedCompany: Company = {
        ...targetCompany,
        name: formData.name,
        startMonth: newStartMonth,
        initialBalance: newInitialBalance,
        taxSettings: {
          ...targetCompany.taxSettings,
          proLaborePercentual: parsePercentageInput(formData.proLaborePercentual) / 100,
          inssPercentual: parsePercentageInput(formData.inssPercentual) / 100,
          dasAliquota: parsePercentageInput(formData.dasAliquota) / 100,
          useInvoiceControl: targetCompany.taxSettings.useInvoiceControl || false
        }
      };

      await onSave(updatedCompany);

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

  if (!company && !activeCompany) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] overflow-hidden bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl p-0">
        <div className="relative">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
          
          {/* Header */}
          <DialogHeader className="relative p-6 pb-4 border-b border-border/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold text-foreground mb-1">
                  Editar empresa
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Modifique as configurações da empresa {activeCompany?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="relative p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Company Name */}
            <div className="space-y-3">
              <Label htmlFor="company-name" className="text-sm font-medium text-foreground">
                Nome da empresa
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Minha Empresa Ltda"
                  className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200"
                />
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Mês de início</Label>
                  <Select value={formData.selectedMonth} onValueChange={(value) => setFormData(prev => ({ ...prev, selectedMonth: value }))}>
                    <SelectTrigger className="h-11 bg-background/50 border-border/50">
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
                  <Label className="text-sm font-medium text-foreground">Ano</Label>
                  <Select value={formData.selectedYear} onValueChange={(value) => setFormData(prev => ({ ...prev, selectedYear: value }))}>
                    <SelectTrigger className="h-11 bg-background/50 border-border/50">
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

              {/* Initial Balance */}
              <div className="space-y-2">
                <Label htmlFor="initial-balance" className="text-sm font-medium text-foreground">
                  Saldo inicial
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="initial-balance"
                    value={formData.initialBalance}
                    onChange={handleInitialBalanceChange}
                    placeholder="R$ 0,00"
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Alterar este valor atualizará a transação de saldo inicial automaticamente
                </p>
              </div>
            </div>

            {/* Tax Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-sm font-medium text-foreground">Configurações fiscais</h4>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Pró-labore (%)</Label>
                  <div className="relative">
                    <Input
                      value={formData.proLaborePercentual}
                      onChange={(e) => {
                        const formatted = formatPercentageForDisplay(e.target.value);
                        setFormData(prev => ({ ...prev, proLaborePercentual: formatted }));
                      }}
                      placeholder="28,1"
                      className="pr-8 h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200 text-sm"
                    />
                    <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">INSS (%)</Label>
                  <div className="relative">
                    <Input
                      value={formData.inssPercentual}
                      onChange={(e) => {
                        const formatted = formatPercentageForDisplay(e.target.value);
                        setFormData(prev => ({ ...prev, inssPercentual: formatted }));
                      }}
                      placeholder="11,0"
                      className="pr-8 h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200 text-sm"
                    />
                    <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">DAS (%)</Label>
                  <div className="relative">
                    <Input
                      value={formData.dasAliquota}
                      onChange={(e) => {
                        const formatted = formatPercentageForDisplay(e.target.value);
                        setFormData(prev => ({ ...prev, dasAliquota: formatted }));
                      }}
                      placeholder="6,0"
                      className="pr-8 h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200 text-sm"
                    />
                    <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="relative p-6 pt-4 border-t border-border/20 bg-background/20">
            <div className="flex gap-3 w-full">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 h-11 bg-background/50 border-border/50 text-foreground hover:bg-muted/50 transition-all duration-200"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isLoading}
                className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {isLoading ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
