
import { useState } from 'react';
import { ChevronDown, Building2, Edit, Plus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { EditCompanyModal } from './EditCompanyModal';
import { CreateCompanyModal } from './CreateCompanyModal';
import { useCompanies, Company } from '../hooks/useCompanies';

// Interface para empresa (compatível com CreateCompanyModal)
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

export function CompanySelector() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { 
    companies, 
    activeCompany, 
    addCompany, 
    updateCompany, 
    setActiveCompany, 
    deleteCompany, 
    isLoading 
  } = useCompanies();

  const handleEditCompany = (company: Company, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCompany(company);
    setIsEditModalOpen(true);
  };

  const handleCreateCompany = () => {
    setIsCreateModalOpen(true);
  };

  const handleSelectCompany = (company: Company) => {
    setActiveCompany(company.id);
  };

  const handleCreateNewCompany = async (newCompanyData: CreateCompanyData) => {
    try {
      setIsCreating(true);
      
      // 1. Criar a nova empresa (que automaticamente se torna ativa)
      const newCompanyId = await addCompany({
        name: newCompanyData.name,
        cnpj: newCompanyData.cnpj,
        status: newCompanyData.status,
        startMonth: newCompanyData.startMonth,
        initialBalance: newCompanyData.initialBalance || 0,
        taxSettings: newCompanyData.taxSettings
      });

      console.log('Nova empresa criada com ID:', newCompanyId, 'Dados:', {
        startMonth: newCompanyData.startMonth,
        initialBalance: newCompanyData.initialBalance
      });
      
      // 2. Fechar o modal
      setIsCreateModalOpen(false);
      
      // 3. Aguardar um pouco para garantir que tudo foi processado
      setTimeout(() => {
        setIsCreating(false);
      }, 300);
      
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      setIsCreating(false);
    }
  };

  const handleSaveCompany = async (updatedCompany: Company) => {
    try {
      await updateCompany(updatedCompany.id, updatedCompany);
      setEditingCompany(null);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
    }
  };

  const handleDeleteCompany = async (company: Company, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (companies.length === 1) {
      alert('Não é possível deletar a última empresa.');
      return;
    }

    if (confirm(`Tem certeza que deseja deletar a empresa "${company.name}"?`)) {
      try {
        await deleteCompany(company.id);
      } catch (error) {
        console.error('Erro ao deletar empresa:', error);
      }
    }
  };

  // Mostrar loading se ainda não carregou
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-700">
        <Building2 className="w-4 h-4 text-gray-600 flex-shrink-0" />
        <span className="font-normal whitespace-nowrap">Carregando...</span>
      </div>
    );
  }

  // Se não há empresas, mostrar placeholder
  if (companies.length === 0) {
    return (
      <>
        <div 
          className="flex items-center gap-2 text-gray-700 cursor-pointer hover:text-gray-900"
          onClick={handleCreateCompany}
        >
          <Building2 className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <span className="font-normal whitespace-nowrap">Criar primeira empresa</span>
          <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>

        <CreateCompanyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateNewCompany}
        />
      </>
    );
  }

  const displayName = activeCompany?.name || 'Nenhuma empresa selecionada';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors border-0 outline-none">
          <Building2 className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <span className="font-normal whitespace-nowrap text-left">{displayName}</span>
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="min-w-[320px] w-[320px]"
        >
          <DropdownMenuLabel>Suas Empresas ({companies.length})</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {companies.map((company) => (
            <DropdownMenuItem 
              key={company.id}
              className="flex items-center gap-2 group"
              onClick={() => handleSelectCompany(company)}
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                  {company.name}
                </div>
                <div className="text-sm text-gray-500 capitalize">{company.status}</div>
                {company.cnpj && (
                  <div className="text-xs text-gray-400">{company.cnpj}</div>
                )}
              </div>
              {activeCompany?.id === company.id && (
                <Badge className="flex-shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Atual</Badge>
              )}
              <div className="flex items-center gap-1">
                <div 
                  className="w-4 h-4 flex items-center justify-center flex-shrink-0"
                  onClick={(e) => handleEditCompany(company, e)}
                >
                  <Edit className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-gray-600" />
                </div>
                {companies.length > 1 && (
                  <div 
                    className="w-4 h-4 flex items-center justify-center flex-shrink-0"
                    onClick={(e) => handleDeleteCompany(company, e)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-red-600" />
                  </div>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="flex items-center gap-2"
            onClick={handleCreateCompany}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Criando empresa...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Criar empresa
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCompany(null);
        }}
        company={editingCompany}
        onSave={handleSaveCompany}
      />

      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => !isCreating && setIsCreateModalOpen(false)}
        onSave={handleCreateNewCompany}
      />
    </>
  );
}
