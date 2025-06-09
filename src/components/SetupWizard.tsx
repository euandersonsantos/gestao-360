import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Calendar, DollarSign, Percent, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { useCompanies } from '../hooks/useCompanies';
import { useCompanySettings } from '../hooks/useCompanySettings';

interface SetupWizardProps {
  isOpen: boolean;
  onComplete: (setupData: { startMonth: string; companyName: string; initialBalance: number }) => void;
}

interface SetupData {
  companyName: string;
  startMonth: string;
  initialBalance: number;
  proLaborePercentual: number;
  dasAliquota: number;
  inssPercentual: number;
  contabilidadeValor: number;
  distribuicaoLucros: number;
}

// Estados para campos de entrada em formato de string (para permitir digitação natural)
interface SetupInputs {
  companyName: string;
  startMonth: string;
  initialBalance: string;
  proLaborePercentual: string;
  dasAliquota: string;
  inssPercentual: string;
  contabilidadeValor: string;
  distribuicaoLucros: string;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const years = [2024, 2025, 2026, 2027];

export function SetupWizard({ isOpen, onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addCompany } = useCompanies();
  const { updateSettings } = useCompanySettings();

  // Estados para entrada de dados (strings para permitir digitação natural)
  const [inputs, setInputs] = useState<SetupInputs>({
    companyName: '',
    startMonth: 'Janeiro 2025',
    initialBalance: '',
    proLaborePercentual: '28,0',
    dasAliquota: '6,0',
    inssPercentual: '11,0',
    contabilidadeValor: '150',
    distribuicaoLucros: ''
  });

  // Reset wizard when it opens
  useEffect(() => {
    if (isOpen) {
      console.log('🎬 SetupWizard - Abrindo wizard, resetando dados');
      setCurrentStep(0);
      setIsSubmitting(false);
      setInputs({
        companyName: '',
        startMonth: 'Janeiro 2025',
        initialBalance: '',
        proLaborePercentual: '28,0',
        dasAliquota: '6,0',
        inssPercentual: '11,0',
        contabilidadeValor: '150',
        distribuicaoLucros: ''
      });
    }
  }, [isOpen]);

  // Função para formatar valor como moeda brasileira
  const formatCurrency = (value: string): string => {
    if (!value || value.trim() === '') return '';
    
    // Remove tudo exceto números, vírgulas e pontos
    const cleaned = value.replace(/[^\d,]/g, '');
    
    if (!cleaned) return '';
    
    // Se tem vírgula, trata como decimal brasileiro
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      const integerPart = parts[0];
      const decimalPart = parts[1] ? parts[1].substring(0, 2) : '';
      
      // Formatar parte inteira com pontos de milhares
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      
      return decimalPart ? `${formattedInteger},${decimalPart}` : `${formattedInteger},`;
    }
    
    // Se não tem vírgula, assumir como centavos e converter
    const number = parseInt(cleaned);
    if (isNaN(number)) return '';
    
    if (number === 0) return '0';
    
    // Se número < 100, tratar como reais
    if (number < 100) {
      return number.toString();
    }
    
    // Se número >= 100, formatar com separadores
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Função para formatar porcentagem
  const formatPercent = (value: string): string => {
    if (!value || value.trim() === '') return '';
    
    // Remove tudo exceto números e vírgulas
    const cleaned = value.replace(/[^\d,]/g, '');
    
    if (!cleaned) return '';
    
    // Permitir vírgula decimal
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      const integerPart = parts[0];
      const decimalPart = parts[1] ? parts[1].substring(0, 2) : '';
      
      return decimalPart ? `${integerPart},${decimalPart}` : `${integerPart},`;
    }
    
    return cleaned;
  };

  // Função para converter string para número (moeda)
  const parseCurrency = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    
    // Remove pontos de milhares e substitui vírgula por ponto
    const normalized = value
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.]/g, '');
    
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Função para converter string para número (porcentagem)
  const parsePercent = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    
    const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed / 100;
  };

  // Handlers para mudanças nos campos
  const handleCurrencyChange = (field: keyof SetupInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputs(prev => ({ ...prev, [field]: rawValue }));
  };

  const handleCurrencyBlur = (field: keyof SetupInputs) => () => {
    const currentValue = inputs[field];
    const formatted = formatCurrency(currentValue);
    setInputs(prev => ({ ...prev, [field]: formatted }));
  };

  const handlePercentChange = (field: keyof SetupInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputs(prev => ({ ...prev, [field]: rawValue }));
  };

  const handlePercentBlur = (field: keyof SetupInputs) => () => {
    const currentValue = inputs[field];
    const formatted = formatPercent(currentValue);
    setInputs(prev => ({ ...prev, [field]: formatted }));
  };

  // Função para converter inputs em SetupData
  const getSetupData = (): SetupData => {
    return {
      companyName: inputs.companyName,
      startMonth: inputs.startMonth,
      initialBalance: parseCurrency(inputs.initialBalance),
      proLaborePercentual: parsePercent(inputs.proLaborePercentual),
      dasAliquota: parsePercent(inputs.dasAliquota),
      inssPercentual: parsePercent(inputs.inssPercentual),
      contabilidadeValor: parseCurrency(inputs.contabilidadeValor),
      distribuicaoLucros: parseCurrency(inputs.distribuicaoLucros)
    };
  };

  const steps = [
    {
      title: "Informações da Empresa",
      subtitle: "Vamos começar com o básico da sua empresa",
      content: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nome da sua empresa</h3>
            <p className="text-sm text-gray-600">Como sua empresa aparecerá no sistema</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da empresa</Label>
            <Input
              id="companyName"
              value={inputs.companyName}
              onChange={(e) => setInputs(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="Ex: Minha Empresa LTDA"
              className="text-center"
            />
          </div>
        </div>
      )
    },
    {
      title: "Período de Controle",
      subtitle: "Escolha quando começar a controlar as finanças",
      content: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mês de início</h3>
            <p className="text-sm text-gray-600">A partir de qual mês você quer começar a usar o sistema</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <select
                value={inputs.startMonth.split(' ')[0]}
                onChange={(e) => {
                  const year = inputs.startMonth.split(' ')[1];
                  setInputs(prev => ({ ...prev, startMonth: `${e.target.value} ${year}` }));
                }}
                className="w-full p-2 border border-gray-200 rounded-lg bg-white"
              >
                {months.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Ano</Label>
              <select
                value={inputs.startMonth.split(' ')[1]}
                onChange={(e) => {
                  const month = inputs.startMonth.split(' ')[0];
                  setInputs(prev => ({ ...prev, startMonth: `${month} ${e.target.value}` }));
                }}
                className="w-full p-2 border border-gray-200 rounded-lg bg-white"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Período selecionado:</strong> {inputs.startMonth}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              As transações e relatórios começarão a partir deste mês
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Saldo Inicial",
      subtitle: "Quanto a empresa possui atualmente em caixa",
      content: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Saldo inicial</h3>
            <p className="text-sm text-gray-600">Valor que a empresa possui em {inputs.startMonth}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="initialBalance">Valor em caixa</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                R$
              </span>
              <Input
                id="initialBalance"
                value={inputs.initialBalance}
                onChange={handleCurrencyChange('initialBalance')}
                onBlur={handleCurrencyBlur('initialBalance')}
                placeholder="5.000,00"
                className="text-center text-lg pl-10"
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Digite valores como: 5000, 5.000, 5.000,00 ou 5000,50
            </p>
            <p className="text-xs text-gray-500 text-center">
              Se não souber o valor exato, você pode ajustar depois
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Configurações Fiscais",
      subtitle: "Defina as alíquotas e percentuais da sua empresa",
      content: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Percent className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurações fiscais</h3>
            <p className="text-sm text-gray-600">Percentuais para cálculo automático de impostos</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proLabore">Pró-labore (%)</Label>
              <div className="relative">
                <Input
                  id="proLabore"
                  value={inputs.proLaborePercentual}
                  onChange={handlePercentChange('proLaborePercentual')}
                  onBlur={handlePercentBlur('proLaborePercentual')}
                  placeholder="28,0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-gray-500">Ex: 28 ou 28,5</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="das">DAS - Simples Nacional (%)</Label>
              <div className="relative">
                <Input
                  id="das"
                  value={inputs.dasAliquota}
                  onChange={handlePercentChange('dasAliquota')}
                  onBlur={handlePercentBlur('dasAliquota')}
                  placeholder="6,0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-gray-500">Ex: 6 ou 6,5</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="inss">INSS (%)</Label>
              <div className="relative">
                <Input
                  id="inss"
                  value={inputs.inssPercentual}
                  onChange={handlePercentChange('inssPercentual')}
                  onBlur={handlePercentBlur('inssPercentual')}
                  placeholder="11,0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-gray-500">Ex: 11 ou 11,5</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contabilidade">Contabilidade (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  R$
                </span>
                <Input
                  id="contabilidade"
                  value={inputs.contabilidadeValor}
                  onChange={handleCurrencyChange('contabilidadeValor')}
                  onBlur={handleCurrencyBlur('contabilidadeValor')}
                  placeholder="150,00"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">Valor mensal</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="distribuicao">Distribuição de lucros (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                R$
              </span>
              <Input
                id="distribuicao"
                value={inputs.distribuicaoLucros}
                onChange={handleCurrencyChange('distribuicaoLucros')}
                onBlur={handleCurrencyBlur('distribuicaoLucros')}
                placeholder="0,00"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500">Valor mensal fixo para distribuição de lucros (opcional)</p>
          </div>
        </div>
      )
    },
    {
      title: "Finalização",
      subtitle: "Revise as informações e finalize a configuração",
      content: (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quase pronto!</h3>
            <p className="text-sm text-gray-600">Revise as informações abaixo</p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Empresa</p>
                <p className="text-gray-900">{inputs.companyName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Início do controle</p>
                <p className="text-gray-900">{inputs.startMonth}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Saldo inicial</p>
                <p className="text-gray-900">
                  R$ {inputs.initialBalance || '0,00'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Pró-labore</p>
                <p className="text-gray-900">{inputs.proLaborePercentual}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">DAS</p>
                <p className="text-gray-900">{inputs.dasAliquota}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">INSS</p>
                <p className="text-gray-900">{inputs.inssPercentual}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Tudo configurado!</p>
                <p className="text-xs text-blue-700 mt-1">
                  Seu sistema estará pronto para uso a partir de {inputs.startMonth}
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return inputs.companyName.trim().length > 0;
      case 1: return inputs.startMonth.length > 0;
      case 2: return true; // Saldo inicial pode ser 0
      case 3: return parsePercent(inputs.proLaborePercentual) > 0 && parsePercent(inputs.dasAliquota) > 0;
      case 4: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    if (isSubmitting) return;
    
    const setupData = getSetupData();
    
    console.log('🚀 SetupWizard - Iniciando criação da empresa:', {
      companyName: setupData.companyName,
      startMonth: setupData.startMonth,
      initialBalance: setupData.initialBalance
    });
    
    setIsSubmitting(true);
    
    try {
      // Criar empresa com addCompany
      const newCompanyId = await addCompany({
        name: setupData.companyName,
        cnpj: '',
        email: '',
        phone: '',
        status: 'ativa',
        startMonth: setupData.startMonth,
        initialBalance: setupData.initialBalance,
        taxSettings: {
          proLaborePercentual: setupData.proLaborePercentual,
          dasAliquota: setupData.dasAliquota,
          inssPercentual: setupData.inssPercentual,
          useInvoiceControl: false,
          contabilidadeValor: setupData.contabilidadeValor,
          distribuicaoLucros: setupData.distribuicaoLucros
        }
      });

      console.log('✅ SetupWizard - Empresa criada com sucesso:', newCompanyId);

      // Atualizar configurações globais
      await updateSettings({
        companyName: setupData.companyName,
        startMonth: setupData.startMonth,
        initialBalance: setupData.initialBalance,
        taxSettings: {
          proLaborePercentual: setupData.proLaborePercentual,
          dasAliquota: setupData.dasAliquota,
          inssPercentual: setupData.inssPercentual,
          contabilidadeValor: setupData.contabilidadeValor,
          distribuicaoLucros: setupData.distribuicaoLucros
        },
        isFirstSetup: false
      });

      console.log('📤 SetupWizard - Chamando onComplete com dados:', {
        startMonth: setupData.startMonth,
        companyName: setupData.companyName,
        initialBalance: setupData.initialBalance
      });

      // CRÍTICO: Passar os dados diretamente para o callback
      onComplete({
        startMonth: setupData.startMonth,
        companyName: setupData.companyName,
        initialBalance: setupData.initialBalance
      });
      
    } catch (error) {
      console.error('❌ SetupWizard - Erro ao criar empresa:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[600px] p-0 gap-0 bg-white border-0 shadow-2xl" 
        hideCloseButton
        aria-describedby="setup-wizard-description"
      >
        {/* Hidden but accessible title and description for screen readers */}
        <DialogTitle className="sr-only">
          Configuração inicial da empresa - Passo {currentStep + 1} de {steps.length}
        </DialogTitle>
        <DialogDescription id="setup-wizard-description" className="sr-only">
          Assistente de configuração para criar sua primeira empresa no sistema. 
          Você está no passo {currentStep + 1} de {steps.length}: {steps[currentStep].title}
        </DialogDescription>
        
        <div className="p-8">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              Passo {currentStep + 1} de {steps.length}
            </span>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {steps[currentStep].title}
                </h2>
                <p className="text-gray-600">
                  {steps[currentStep].subtitle}
                </p>
              </div>
              
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleFinish}
                disabled={!isStepValid() || isSubmitting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Criando empresa...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Finalizar configuração
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!isStepValid()}
                className="flex items-center gap-2"
              >
                Próximo
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}