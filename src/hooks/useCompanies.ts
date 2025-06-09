import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  email?: string;
  phone?: string;
  status: 'ativa' | 'inativa';
  taxSettings: {
    dasAliquota: number;
    proLaborePercentual: number;
    inssPercentual: number;
    useInvoiceControl: boolean;
    contabilidadeValor?: number;
    distribuicaoLucros?: number;
  };
  startMonth?: string;
  initialBalance?: number;
  createdAt: string;
}

interface CompaniesContextType {
  companies: Company[];
  activeCompanyId: string | null;
  activeCompany: Company | null;
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => Promise<string>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  setActiveCompany: (id: string) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  isLoading: boolean;
}

const CompaniesContext = createContext<CompaniesContextType | undefined>(undefined);

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar empresas do localStorage na inicialização
  useEffect(() => {
    const loadCompanies = () => {
      try {
        const savedCompanies = localStorage.getItem('companies');
        const savedActiveId = localStorage.getItem('activeCompanyId');
        
        if (savedCompanies) {
          const parsed = JSON.parse(savedCompanies);
          setCompanies(parsed);
          if (savedActiveId && parsed.find((c: Company) => c.id === savedActiveId)) {
            setActiveCompanyId(savedActiveId);
          } else if (parsed.length > 0) {
            // Se não há empresa ativa válida, usar a primeira
            setActiveCompanyId(parsed[0].id);
          }
        } else {
          // Migrar empresa do useCompanySettings se existir
          const legacySettings = localStorage.getItem('companySettings');
          if (legacySettings) {
            try {
              const settings = JSON.parse(legacySettings);
              const migratedCompany: Company = {
                id: 'legacy-company',
                name: settings.companyName || 'Minha Empresa',
                cnpj: settings.cnpj || '',
                email: settings.email || '',
                phone: settings.phone || '',
                status: 'ativa' as const,
                taxSettings: {
                  dasAliquota: settings.taxSettings?.dasAliquota || 0,
                  proLaborePercentual: settings.taxSettings?.proLaborePercentual || 0,
                  inssPercentual: settings.taxSettings?.inssPercentual || 0.11,
                  useInvoiceControl: false,
                  contabilidadeValor: settings.taxSettings?.contabilidadeValor || 150,
                  distribuicaoLucros: settings.taxSettings?.distribuicaoLucros || 0
                },
                startMonth: settings.startMonth,
                initialBalance: settings.initialBalance || 0,
                createdAt: new Date().toISOString()
              };
              setCompanies([migratedCompany]);
              setActiveCompanyId(migratedCompany.id);
            } catch (error) {
              console.error('Erro ao migrar empresa legacy:', error);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar empresas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompanies();
  }, []);

  // Salvar no localStorage sempre que companies ou activeCompanyId mudar
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('companies', JSON.stringify(companies));
      if (activeCompanyId) {
        localStorage.setItem('activeCompanyId', activeCompanyId);
      }
    }
  }, [companies, activeCompanyId, isLoading]);

  const addCompany = async (companyData: Omit<Company, 'id' | 'createdAt'>): Promise<string> => {
    const newCompany: Company = {
      ...companyData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    setCompanies(prev => [...prev, newCompany]);
    
    // Sempre definir a nova empresa como ativa quando criada
    setActiveCompanyId(newCompany.id);

    return newCompany.id;
  };

  const updateCompany = async (id: string, updates: Partial<Company>): Promise<void> => {
    console.log('Atualizando empresa:', {
      id,
      updates,
      currentCompany: companies.find(c => c.id === id)
    });
    
    setCompanies(prev => 
      prev.map(company => 
        company.id === id ? { ...company, ...updates } : company
      )
    );
  };

  const setActiveCompany = async (id: string): Promise<void> => {
    const company = companies.find(c => c.id === id);
    if (company) {
      const previousCompanyId = activeCompanyId;
      setActiveCompanyId(id);
      
      // Trigger para componentes reagirem à mudança de empresa
      // Os dados serão carregados automaticamente pelo useFinancialData
      console.log(`Empresa ativa alterada de ${previousCompanyId} para ${id}`);
    }
  };

  const deleteCompany = async (id: string): Promise<void> => {
    // Remover dados específicos da empresa antes de deletá-la
    try {
      localStorage.removeItem(`paymentData_${id}`);
    } catch (error) {
      console.error('Erro ao remover dados da empresa:', error);
    }

    setCompanies(prev => prev.filter(company => company.id !== id));
    
    // Se a empresa deletada era a ativa, escolher outra
    if (activeCompanyId === id) {
      const remainingCompanies = companies.filter(c => c.id !== id);
      setActiveCompanyId(remainingCompanies.length > 0 ? remainingCompanies[0].id : null);
    }
  };

  const activeCompany = activeCompanyId 
    ? companies.find(c => c.id === activeCompanyId) || null
    : null;

  return (
    <CompaniesContext.Provider value={{
      companies,
      activeCompanyId,
      activeCompany,
      addCompany,
      updateCompany,
      setActiveCompany,
      deleteCompany,
      isLoading
    }}>
      {children}
    </CompaniesContext.Provider>
  );
}

export function useCompanies() {
  const context = useContext(CompaniesContext);
  if (context === undefined) {
    throw new Error('useCompanies must be used within a CompaniesProvider');
  }
  return context;
}