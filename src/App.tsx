import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, CloudSun, Moon } from 'lucide-react';
import { Header } from './components/Header';
import { ControlBar } from './components/ControlBar';
import { ImportantActions } from './components/ImportantActions';
import { KPICards } from './components/KPICards';
import { InvoiceKPICards } from './components/InvoiceKPICards';
import { Mailroom } from './components/Mailroom';
import { PaymentManagement } from './components/PaymentManagement';
import { InvoiceManagement } from './components/InvoiceManagement';
import { MonthSelector } from './components/MonthSelector';
import { Sidebar } from './components/Sidebar';
import { SetupWizard } from './components/SetupWizard';
import { LoadingSection } from './components/LoadingSection';
import { PageLoadingAnimation } from './components/PageLoadingAnimation';
import { PaymentProvider } from './hooks/useFinancialData';
import { InvoiceProvider } from './hooks/useInvoiceData';
import { CompanySettingsProvider, useCompanySettings } from './hooks/useCompanySettings';
import { CompaniesProvider, useCompanies } from './hooks/useCompanies';

// Função para obter o mês atual no formato usado pela aplicação
const getCurrentMonth = (): string => {
  const now = new Date();
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const currentMonthName = months[now.getMonth()];
  const currentYear = now.getFullYear();
  
  return `${currentMonthName} ${currentYear}`;
};

// Função para verificar se é o primeiro acesso após setup
const isFirstTimeAfterSetup = (): boolean => {
  return localStorage.getItem('hasCompletedFirstSetup') !== 'true';
};

// Função para marcar que o primeiro setup foi concluído
const markFirstSetupCompleted = (): void => {
  localStorage.setItem('hasCompletedFirstSetup', 'true');
};

// Função para marcar que estamos no processo de setup (para evitar conflitos)
const markSetupInProgress = (): void => {
  localStorage.setItem('setupInProgress', 'true');
};

// Função para marcar que o setup foi finalizado
const clearSetupInProgress = (): void => {
  localStorage.removeItem('setupInProgress');
};

// Função para verificar se setup está em progresso
const isSetupInProgress = (): boolean => {
  return localStorage.getItem('setupInProgress') === 'true';
};

// Componente para o ícone animado
const AnimatedGreetingIcon = ({ period }: { period: 'morning' | 'afternoon' | 'night' }) => {
  const icons = {
    morning: <Sun className="w-8 h-8 text-yellow-500" />,
    afternoon: <CloudSun className="w-8 h-8 text-orange-500" />,
    night: <Moon className="w-8 h-8 text-blue-400" />
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={period}
        initial={{ 
          opacity: 0, 
          scale: 0.8,
          rotateY: -90
        }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          rotateY: 0
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.8,
          rotateY: 90
        }}
        transition={{
          duration: 0.6,
          ease: "easeInOut",
          scale: {
            type: "spring",
            stiffness: 200,
            damping: 20
          }
        }}
        className="flex items-center"
      >
        {icons[period]}
      </motion.div>
    </AnimatePresence>
  );
};

// Componente para seções com loading state
const SectionWithLoading = ({ 
  isLoading, 
  loadingType, 
  children, 
  delay = 0 
}: {
  isLoading: boolean;
  loadingType: 'kpi' | 'mailroom' | 'payments' | 'actions';
  children: React.ReactNode;
  delay?: number;
}) => {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, delay }}
        >
          <LoadingSection type={loadingType} />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, delay }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface SetupData {
  startMonth: string;
  companyName: string;
  initialBalance: number;
}

function AppContent() {
  const [greeting, setGreeting] = useState('');
  const [period, setPeriod] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonth());
  const [activePage, setActivePage] = useState('dashboard');
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [initialMonth, setInitialMonth] = useState<string | undefined>(undefined);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [previousActiveCompanyId, setPreviousActiveCompanyId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState({
    kpi: false,
    mailroom: false,
    payments: false,
    actions: false
  });
  const [justCompletedSetup, setJustCompletedSetup] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);

  const { settings, isLoading } = useCompanySettings();
  const { activeCompany, companies, isLoading: companiesLoading } = useCompanies();

  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
      return 'Boa tarde';
    } else {
      return 'Boa noite';
    }
  };

  const getPeriod = (): 'morning' | 'afternoon' | 'night' => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 18) {
      return 'afternoon';
    } else {
      return 'night';
    }
  };

  useEffect(() => {
    setGreeting(getGreeting());
    setPeriod(getPeriod());
    
    // Atualiza a saudação e ícone a cada minuto
    const interval = setInterval(() => {
      setGreeting(getGreeting());
      setPeriod(getPeriod());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Função para simular loading das seções
  const triggerSectionLoading = (duration = 800) => {
    setSectionsLoading({
      kpi: true,
      mailroom: true,
      payments: true,
      actions: true
    });

    // Simular loading escalonado
    setTimeout(() => setSectionsLoading(prev => ({ ...prev, actions: false })), duration * 0.3);
    setTimeout(() => setSectionsLoading(prev => ({ ...prev, kpi: false })), duration * 0.6);
    setTimeout(() => setSectionsLoading(prev => ({ ...prev, mailroom: false })), duration * 0.8);
    setTimeout(() => setSectionsLoading(prev => ({ ...prev, payments: false })), duration);
  };

  // Verificar se deve mostrar o wizard de configuração
  useEffect(() => {
    if (!isLoading && !companiesLoading) {
      if (companies.length === 0 && settings?.isFirstSetup) {
        console.log('🎬 App.tsx - Mostrando SetupWizard');
        setShowSetupWizard(true);
      } else if (companies.length === 0) {
        setShowSetupWizard(false);
      } else {
        setShowSetupWizard(false);
      }
    }
  }, [isLoading, companiesLoading, settings?.isFirstSetup, companies.length]);

  // LÓGICA SIMPLIFICADA: Definir mês inicial com prioridade para dados do setup
  useEffect(() => {
    if (!isLoading && !companiesLoading && companies.length > 0 && activeCompany) {
      console.log('🔧 App.tsx - Definindo mês inicial:', {
        activeCompany: activeCompany.name,
        startMonth: activeCompany.startMonth,
        justCompletedSetup: justCompletedSetup,
        setupData: setupData,
        isFirstTime: isFirstTimeAfterSetup()
      });
      
      // PRIORIDADE 1: Se acabamos de completar o setup e temos dados do setup
      if (justCompletedSetup && setupData) {
        console.log('🎯 App.tsx - PRIORIDADE 1: Usando dados diretos do setup:', setupData.startMonth);
        setSelectedMonth(setupData.startMonth);
        setInitialMonth(setupData.startMonth);
        
        // Limpar flags após usar
        setJustCompletedSetup(false);
        setSetupData(null);
        return;
      }
      
      // PRIORIDADE 2: Se é primeira vez E tem startMonth configurado
      if (isFirstTimeAfterSetup() && activeCompany.startMonth) {
        console.log('🎯 App.tsx - PRIORIDADE 2: Usando mês da empresa (primeira vez):', activeCompany.startMonth);
        setSelectedMonth(activeCompany.startMonth);
        setInitialMonth(activeCompany.startMonth);
        return;
      }
      
      // PRIORIDADE 3: Sistema já configurado - usar mês atual
      const currentMonth = getCurrentMonth();
      console.log('📅 App.tsx - PRIORIDADE 3: Sistema já configurado - usando mês atual:', currentMonth);
      setSelectedMonth(currentMonth);
      setInitialMonth(currentMonth);
    }
  }, [isLoading, companiesLoading, companies.length, activeCompany?.id, activeCompany?.startMonth, justCompletedSetup, setupData]);

  // Reagir às mudanças de empresa ativa (sempre usar mês atual)
  useEffect(() => {
    if (activeCompany) {
      if (previousActiveCompanyId !== activeCompany.id) {
        console.log('🔄 App.tsx - Empresa ativa mudou:', {
          anterior: previousActiveCompanyId,
          nova: activeCompany.id,
          nome: activeCompany.name
        });
        
        // Ativar transição e loading das seções
        setIsTransitioning(true);
        triggerSectionLoading(1000);
        
        setTimeout(() => {
          setForceRefresh(prev => prev + 1);
          
          // Sempre usar mês atual quando trocar empresa (após primeiro setup)
          if (!justCompletedSetup && !isFirstTimeAfterSetup()) {
            const currentMonth = getCurrentMonth();
            console.log('📅 App.tsx - Trocando empresa - usando mês atual:', currentMonth);
            setSelectedMonth(currentMonth);
            setInitialMonth(currentMonth);
          }
          
          setPreviousActiveCompanyId(activeCompany.id);
          setIsTransitioning(false);
        }, 300);
      }
    }
  }, [activeCompany?.id, previousActiveCompanyId, justCompletedSetup]);

  // Detectar primeira empresa criada
  useEffect(() => {
    if (companies.length > 0 && activeCompany) {
      if (!previousActiveCompanyId) {
        console.log('🎯 App.tsx - Inicializando tracking da empresa ativa:', activeCompany.id);
        setPreviousActiveCompanyId(activeCompany.id);
        triggerSectionLoading(600);
        setForceRefresh(prev => prev + 1);
      }
    }
  }, [companies.length, activeCompany?.id, previousActiveCompanyId]);

  const handleSetupComplete = (setupInfo: SetupData) => {
    console.log('🎉 App.tsx - Setup completo com dados recebidos:', setupInfo);
    
    // Marcar que o setup está em progresso
    markSetupInProgress();
    
    setShowSetupWizard(false);
    setJustCompletedSetup(true);
    
    // CRÍTICO: Armazenar os dados do setup e definir o mês IMEDIATAMENTE
    setSetupData(setupInfo);
    setSelectedMonth(setupInfo.startMonth);
    setInitialMonth(setupInfo.startMonth);
    
    console.log('📌 App.tsx - Mês definido imediatamente:', setupInfo.startMonth);
    
    setForceRefresh(prev => prev + 1);
    
    // SEQUÊNCIA CONTROLADA: Marcar como concluído após sincronização
    setTimeout(() => {
      console.log('🔄 App.tsx - Iniciando sincronização pós-setup');
      
      // Confirmar que o mês está correto
      setSelectedMonth(setupInfo.startMonth);
      setInitialMonth(setupInfo.startMonth);
      
      setTimeout(() => {
        console.log('✅ App.tsx - Finalizando setup e marcando como concluído');
        markFirstSetupCompleted();
        clearSetupInProgress();
        triggerSectionLoading(1000);
      }, 300);
    }, 100); // Delay muito pequeno apenas para garantir ordem
  };

  // Trigger loading when month changes
  const handleMonthChange = (month: string) => {
    if (month !== selectedMonth) {
      console.log('📅 App.tsx - Mudança de mês manual:', { de: selectedMonth, para: month });
      setSectionsLoading(prev => ({ ...prev, kpi: true, mailroom: true, actions: true }));
      setSelectedMonth(month);
      
      setTimeout(() => {
        setSectionsLoading(prev => ({ ...prev, actions: false }));
      }, 200);
      setTimeout(() => {
        setSectionsLoading(prev => ({ ...prev, kpi: false }));
      }, 400);
      setTimeout(() => {
        setSectionsLoading(prev => ({ ...prev, mailroom: false }));
      }, 600);
    }
  };

  // Handler para navegação entre páginas
  const handleNavigate = (pageId: string) => {
    setActivePage(pageId);
  };

  // Função para renderizar o conteúdo da página ativa
  const renderPageContent = () => {
    switch (activePage) {
      case 'invoices':
        return (
          <>
            {/* MonthSelector para notas fiscais */}
            <div className="mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <MonthSelector selectedMonth={selectedMonth} />
              </motion.div>
              
              {/* Invoice KPI Cards */}
              <SectionWithLoading 
                isLoading={sectionsLoading.kpi} 
                loadingType="kpi"
                delay={0.1}
              >
                <InvoiceKPICards 
                  selectedMonth={selectedMonth}
                  key={`invoice-kpi-${activeCompany?.id}-${selectedMonth}-${forceRefresh}`}
                />
              </SectionWithLoading>
            </div>

            {/* Invoice Management */}
            <div className="mb-8">
              <InvoiceManagement 
                selectedMonth={selectedMonth}
                key={`invoices-${activeCompany?.id}-${selectedMonth}-${forceRefresh}`}
              />
            </div>
          </>
        );
      
      case 'dashboard':
      default:
        return (
          <>
            {/* Important Actions */}
            <SectionWithLoading 
              isLoading={sectionsLoading.actions} 
              loadingType="actions"
              delay={0}
            >
              <ImportantActions 
                selectedMonth={selectedMonth} 
                key={`actions-${activeCompany?.id}-${selectedMonth}-${forceRefresh}-${justCompletedSetup ? 'setup' : 'normal'}-${setupData?.startMonth || 'no-setup'}`}
              />
            </SectionWithLoading>

            {/* KPI Overview Section */}
            <div className="mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <MonthSelector selectedMonth={selectedMonth} />
              </motion.div>
              
              <SectionWithLoading 
                isLoading={sectionsLoading.kpi} 
                loadingType="kpi"
                delay={0.1}
              >
                <KPICards 
                  selectedMonth={selectedMonth} 
                  key={`kpi-${activeCompany?.id}-${selectedMonth}-${forceRefresh}-${justCompletedSetup ? 'setup' : 'normal'}-${setupData?.startMonth || 'no-setup'}`}
                />
              </SectionWithLoading>
            </div>

            {/* Mailroom */}
            <div className="mb-8">
              <SectionWithLoading 
                isLoading={sectionsLoading.mailroom} 
                loadingType="mailroom"
                delay={0.2}
              >
                <Mailroom 
                  selectedMonth={selectedMonth} 
                  key={`mailroom-${activeCompany?.id}-${selectedMonth}-${forceRefresh}-${justCompletedSetup ? 'setup' : 'normal'}-${setupData?.startMonth || 'no-setup'}`}
                />
              </SectionWithLoading>
            </div>

            {/* Payment Management */}
            <div className="mb-8">
              <SectionWithLoading 
                isLoading={sectionsLoading.payments} 
                loadingType="payments"
                delay={0.3}
              >
                <PaymentManagement 
                  selectedMonth={selectedMonth} 
                  key={`payments-${activeCompany?.id}-${selectedMonth}-${forceRefresh}-${justCompletedSetup ? 'setup' : 'normal'}-${setupData?.startMonth || 'no-setup'}`}
                />
              </SectionWithLoading>
            </div>
          </>
        );
    }
  };

  // Mostrar loading personalizado enquanto carrega as configurações
  if (isLoading || companiesLoading) {
    return <PageLoadingAnimation message="Carregando suas empresas..." />;
  }

  // Nome da empresa para exibição
  const companyDisplayName = activeCompany?.name || settings?.companyName || 'Ray';
  const firstName = companyDisplayName.split(' ')[0];

  // Unique key para forçar re-render após mudanças importantes
  const appKey = `app-${activeCompany?.id || 'no-company'}-${forceRefresh}-${justCompletedSetup ? 'setup' : 'normal'}-${setupData?.startMonth || 'no-setup'}`;

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div 
          className="min-h-screen" 
          key={appKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Sidebar */}
          <Sidebar onNavigate={handleNavigate} activePage={activePage} />
          
          {/* Main Content */}
          <div 
            className="ml-16 min-h-screen"
            style={{
              backgroundColor: '#F6F6F6',
              backgroundImage: `
                radial-gradient(ellipse 800px 400px at 80% 10%, rgba(255, 237, 213, 0.15) 0%, rgba(254, 215, 170, 0.08) 35%, transparent 70%),
                radial-gradient(ellipse 600px 300px at 75% 5%, rgba(255, 228, 196, 0.1) 0%, transparent 50%)
              `
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Header />
            </motion.div>
            
            {/* ControlBar para dashboard e invoices */}
            {(activePage === 'dashboard' || activePage === 'invoices') && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <ControlBar 
                  onMonthChange={handleMonthChange} 
                  initialMonth={initialMonth}
                  key={`controlbar-${activeCompany?.id}-${initialMonth}-${forceRefresh}-${justCompletedSetup ? 'setup' : 'normal'}-${setupData?.startMonth || 'no-setup'}`}
                />
              </motion.div>
            )}
            
            <main className="px-6 py-8 px-[21px] py-[0px] pt-[16px] pr-[21px] pb-[28px] pl-[21px]">
              {/* Hero Section - apenas no dashboard */}
              {activePage === 'dashboard' && (
                <motion.div 
                  className="mb-12 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <motion.h2 
                    className="text-3xl text-gray-800 mb-2 flex items-center gap-3"
                    key={`greeting-${activeCompany?.id}-${firstName}-${forceRefresh}`}
                  >
                    <motion.span
                      key={`${greeting}-${firstName}-${activeCompany?.id}-${forceRefresh}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      {greeting}, {firstName}!
                    </motion.span>
                    <AnimatedGreetingIcon period={period} />
                  </motion.h2>
                  <motion.p 
                    className="text-gray-600"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    Dê uma olhada na sua empresa
                  </motion.p>
                </motion.div>
              )}

              {/* Page Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePage}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderPageContent()}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Setup Wizard */}
      <SetupWizard 
        isOpen={showSetupWizard} 
        onComplete={handleSetupComplete}
      />
    </>
  );
}

export default function App() {
  return (
    <CompanySettingsProvider>
      <CompaniesProvider>
        <PaymentProvider>
          <InvoiceProvider>
            <AppContent />
          </InvoiceProvider>
        </PaymentProvider>
      </CompaniesProvider>
    </CompanySettingsProvider>
  );
}