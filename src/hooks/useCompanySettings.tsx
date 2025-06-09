import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCompanies } from './useCompanies';

interface TaxSettings {
  proLaborePercentual: number;
  inssPercentual: number;
  dasAliquota: number;
  useInvoiceControl?: boolean;
  contabilidadeValor?: number;
  distribuicaoLucros?: number;
}

export interface CompanySettings {
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  taxSettings: TaxSettings;
  startMonth: string;
  initialBalance: number; // Saldo inicial
  isFirstSetup: boolean;
}

interface CompanySettingsContextType {
  settings: CompanySettings | null;
  updateSettings: (newSettings: Partial<CompanySettings>) => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: CompanySettings = {
  companyName: 'Minha Empresa',
  cnpj: '00.000.000/0000-00',
  email: 'contato@minhaempresa.com',
  phone: '(11) 99999-9999',
  taxSettings: {
    proLaborePercentual: 0.10, // 10%
    inssPercentual: 0.11, // 11%
    dasAliquota: 0.045, // 4.5%
    useInvoiceControl: false,
    contabilidadeValor: 150,
    distribuicaoLucros: 0
  },
  startMonth: 'Junho 2025',
  initialBalance: 0, // Saldo inicial zerado
  isFirstSetup: true // Inicialmente true para detectar primeiro acesso
};

const CompanySettingsContext = createContext<CompanySettingsContextType | undefined>(undefined);

export function CompanySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar configurações do localStorage na inicialização
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('companySettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          // Garantir compatibilidade com versões antigas que não têm o campo initialBalance
          const settingsWithDefaults = {
            ...defaultSettings,
            ...parsed,
            // Se não tiver o campo initialBalance, usar valor padrão
            initialBalance: parsed.initialBalance || 0,
            // Garantir que taxSettings tenha useInvoiceControl
            taxSettings: {
              ...defaultSettings.taxSettings,
              ...parsed.taxSettings,
              useInvoiceControl: parsed.taxSettings?.useInvoiceControl || false
            }
          };
          setSettings(settingsWithDefaults);
        } else {
          // Se não há configurações salvas, é o primeiro acesso
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<CompanySettings>): Promise<void> => {
    try {
      const updatedSettings = { ...settings, ...newSettings } as CompanySettings;
      setSettings(updatedSettings);
      localStorage.setItem('companySettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      throw error;
    }
  };

  return (
    <CompanySettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

// Hook para sincronização com empresa ativa
export function useCompanySettingsSync() {
  const context = useContext(CompanySettingsContext);
  if (context === undefined) {
    throw new Error('useCompanySettingsSync must be used within a CompanySettingsProvider');
  }
  return context;
}

// Hook principal que sincroniza com o sistema de empresas
export function useCompanySettings() {
  const companiesContext = useCompanies();
  const settingsContext = useCompanySettingsSync();
  
  // Se não há contexto de empresas, usar o sistema legacy
  if (!companiesContext) {
    return settingsContext;
  }

  const { activeCompany, updateCompany } = companiesContext;
  const { settings: legacySettings, updateSettings: updateLegacySettings, isLoading } = settingsContext;

  // Criar configurações baseadas na empresa ativa
  const syncedSettings: CompanySettings | null = activeCompany ? {
    companyName: activeCompany.name,
    cnpj: activeCompany.cnpj,
    email: activeCompany.email || '',
    phone: activeCompany.phone || '',
    taxSettings: {
      proLaborePercentual: activeCompany.taxSettings.proLaborePercentual,
      inssPercentual: activeCompany.taxSettings.inssPercentual,
      dasAliquota: activeCompany.taxSettings.dasAliquota,
      useInvoiceControl: activeCompany.taxSettings.useInvoiceControl
    },
    startMonth: activeCompany.startMonth || legacySettings?.startMonth || 'Junho 2025',
    initialBalance: activeCompany.initialBalance !== undefined ? activeCompany.initialBalance : 0,
    isFirstSetup: false // Se tem empresa ativa, não é primeiro setup
  } : legacySettings;

  // Log de debug quando as configurações mudam
  React.useEffect(() => {
    if (syncedSettings) {
      console.log('useCompanySettings - Settings sincronizadas:', {
        companyName: syncedSettings.companyName,
        startMonth: syncedSettings.startMonth,
        initialBalance: syncedSettings.initialBalance,
        activeCompanyId: activeCompany?.id
      });
    }
  }, [syncedSettings?.startMonth, syncedSettings?.initialBalance, activeCompany?.id]);

  // Função para atualizar que sincroniza ambos os sistemas
  const updateSettings = async (newSettings: Partial<CompanySettings>): Promise<void> => {
    try {
      // Se há empresa ativa, atualizar ela
      if (activeCompany && updateCompany) {
        const updatedCompany = {
          ...activeCompany,
          name: newSettings.companyName || activeCompany.name,
          cnpj: newSettings.cnpj || activeCompany.cnpj,
          email: newSettings.email || activeCompany.email,
          phone: newSettings.phone || activeCompany.phone,
          startMonth: newSettings.startMonth || activeCompany.startMonth,
          initialBalance: newSettings.initialBalance !== undefined ? newSettings.initialBalance : activeCompany.initialBalance,
          taxSettings: {
            ...activeCompany.taxSettings,
            ...(newSettings.taxSettings || {})
          }
        };
        
        console.log('Sincronizando configurações da empresa:', {
          id: activeCompany.id,
          startMonth: updatedCompany.startMonth,
          initialBalance: updatedCompany.initialBalance,
          newSettingsReceived: newSettings
        });
        
        await updateCompany(activeCompany.id, updatedCompany);
      }
      
      // Também atualizar o sistema legacy para compatibilidade
      await updateLegacySettings(newSettings);
    } catch (error) {
      console.error('Erro ao sincronizar configurações:', error);
      throw error;
    }
  };

  return {
    settings: syncedSettings,
    updateSettings,
    isLoading: isLoading || companiesContext.isLoading
  };
}