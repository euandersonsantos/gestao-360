import { useState, useEffect } from 'react';
import { Building2, Calendar, DollarSign, Settings, Users, Percent, FileText, Building, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCompanies } from '../hooks/useCompanies';
import { usePaymentContext } from '../hooks/useFinancialData';

interface CreateCompanyData {
  id: string;
  name: string;
  cnpj: string;
  status: 'ativa' | 'inativa';
  startMonth?: string;
  initialBalance?: number;
  taxSettings: {
    dasAliquota: number;
    proLaborePercentual: number;
    inssPercentual: number;
    useInvoiceControl: boolean;
  };
}

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCompanyData: CreateCompanyData) => Promise<void>;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const years = ['2023', '2024', '2025', '2026', '2027'];

export function CreateCompanyModal({ isOpen, onClose, onSave }: CreateCompanyModalProps) {
  const { addCompany } = useCompanies();
  const { updatePaymentTransactionsForMonth, getPaymentTransactionsForMonth } = usePaymentContext();
  
  const [formData, setFormData] = useState({
    name: '',
    selectedMonth: '',
    selectedYear: '',
    initialBalance: '',
    proLaborePercentual: '28',
    inssPercentual: '11',
    dasAliquota: '6'
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        selectedMonth: '',
        selectedYear: '',
        initialBalance: '',
        proLaborePercentual: '28',
        inssPercentual: '11',
        dasAliquota: '6'
      });
    }
  }, [isOpen]);

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

  const handleInitialBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatCurrencyInput(inputValue);
    setFormData(prev => ({ ...prev, initialBalance: formattedValue }));
  };

  // Função para criar transação de saldo inicial usando o hook correto
  const createInitialBalanceTransaction = (month: string, value: number) => {
    if (value <= 0) return;

    console.log('CreateCompanyModal - Criando transação de saldo inicial:', { month, value });

    const initialBalanceTransaction = {
      id: 'initial-balance',
      label: 'Saldo inicial',
      value: value,
      type: 'entrada' as const,
      completed: true,
      description: `Saldo inicial da empresa definido para ${month}`,
      category: 'Saldo inicial',
      isInitialBalance: true
    };

    // Usar o hook para obter transações existentes e adicionar a nova
    const existingTransactions = getPaymentTransactionsForMonth(month);
    
    // Verificar se já existe uma transação de saldo inicial
    const hasInitialBalance = existingTransactions.some(t => t.isInitialBalance);
    
    if (!hasInitialBalance) {
      const updatedTransactions = [initialBalanceTransaction, ...existingTransactions];
      updatePaymentTransactionsForMonth(month, updatedTransactions);
      console.log('CreateCompanyModal - Transação de saldo inicial criada com sucesso');
    } else {
      console.log('CreateCompanyModal - Transação de saldo inicial já existe, pulando criação');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.selectedMonth || !formData.selectedYear) {
      return;
    }

    setIsLoading(true);
    
    try {
      const startMonth = `${formData.selectedMonth} ${formData.selectedYear}`;
      const initialBalanceValue = parseCurrencyInput(formData.initialBalance);

      const newCompanyData: CreateCompanyData = {
        id: Date.now().toString(),
        name: formData.name,
        cnpj: '',
        status: 'ativa',
        startMonth: startMonth,
        initialBalance: initialBalanceValue,
        taxSettings: {
          proLaborePercentual: parseFloat(formData.proLaborePercentual) / 100,
          inssPercentual: parseFloat(formData.inssPercentual) / 100,
          dasAliquota: parseFloat(formData.dasAliquota) / 100,
          useInvoiceControl: false,
        }
      };

      await onSave(newCompanyData);

    } catch (error) {
      console.error('Erro ao criar empresa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.name.trim() && formData.selectedMonth && formData.selectedYear;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] overflow-hidden bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl p-0">
        <div className="relative">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
          
          {/* Header */}
          <DialogHeader className="relative p-6 pb-4 border-b border-border/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold text-foreground mb-1">
                  Nova empresa
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Crie uma nova empresa para gerenciar suas finanças
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
                  Uma transação de saldo inicial será criada automaticamente no mês escolhido
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
                      onChange={(e) => setFormData(prev => ({ ...prev, proLaborePercentual: e.target.value }))}
                      placeholder="28"
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
                      onChange={(e) => setFormData(prev => ({ ...prev, inssPercentual: e.target.value }))}
                      placeholder="11"
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
                      onChange={(e) => setFormData(prev => ({ ...prev, dasAliquota: e.target.value }))}
                      placeholder="6"
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
                className="flex-1 h-11 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {isLoading ? 'Criando...' : 'Criar empresa'}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
