import { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Plus, 
  Search, 
  MoreVertical, 
  Download, 
  Edit3, 
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Brain,
  Zap,
  Settings,
  Key,
  User,
  Files,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Heart,
  Sparkles
} from 'lucide-react';
import { useInvoiceData, Invoice, ExtractedInvoiceData } from '../hooks/useInvoiceData';
import { PDFExtractionModal } from './PDFExtractionModal';
import { BatchPDFProcessingModal } from './BatchPDFProcessingModal';
import { OpenAIKeyModal } from './OpenAIKeyModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';

interface InvoiceManagementProps {
  selectedMonth: string;
}

type SortField = 'number' | 'client' | 'value' | 'issueDate' | 'serviceType' | 'verified';
type SortDirection = 'asc' | 'desc';

export function InvoiceManagement({ selectedMonth }: InvoiceManagementProps) {
  const { 
    getInvoicesForMonth, 
    addInvoice, 
    updateInvoice, 
    deleteInvoice, 
    extractInvoiceDataFromPDF,
    getOpenAIKey,
    setOpenAIKey,
    isLoading 
  } = useInvoiceData();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('issueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPDFExtractionModalOpen, setIsPDFExtractionModalOpen] = useState(false);
  const [isBatchProcessingModalOpen, setIsBatchProcessingModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [currentPDFFile, setCurrentPDFFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false); // New state for controlling drop zone visibility
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createForm, setCreateForm] = useState({
    number: '',
    client: '',
    value: '',
    issueDate: new Date().toISOString().split('T')[0],
    status: 'pending' as Invoice['status'],
    serviceType: 'fisioterapia' as Invoice['serviceType'],
    verified: false,
    description: ''
  });

  const currentKey = getOpenAIKey();
  const invoices = getInvoicesForMonth(selectedMonth);
  
  // Filtrar e ordenar notas fiscais
  const filteredAndSortedInvoices = invoices
    .filter(invoice => 
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'number':
          aValue = a.number.toLowerCase();
          bValue = b.number.toLowerCase();
          break;
        case 'client':
          aValue = a.client.toLowerCase();
          bValue = b.client.toLowerCase();
          break;
        case 'value':
          aValue = a.value;
          bValue = b.value;
          break;
        case 'issueDate':
          aValue = new Date(a.issueDate);
          bValue = new Date(b.issueDate);
          break;
        case 'serviceType':
          aValue = a.serviceType;
          bValue = b.serviceType;
          break;
        case 'verified':
          aValue = a.verified ? 1 : 0;
          bValue = b.verified ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

  console.log('🔍 InvoiceManagement - Estado atual:', {
    selectedMonth,
    totalInvoices: invoices.length,
    filteredInvoices: filteredAndSortedInvoices.length,
    sortField,
    sortDirection
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Função melhorada para formatar data e hora
  const formatDateTime = (dateString: string, dateTimeString?: string): string => {
    // Se temos data/hora completa extraída, usar ela
    if (dateTimeString && dateTimeString.trim()) {
      return dateTimeString;
    }
    
    // Caso contrário, formatar apenas a data
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getServiceTypeBadge = (serviceType: Invoice['serviceType']) => {
    switch (serviceType) {
      case 'fisioterapia':
        return (
          <Badge variant="secondary" className="bg-blue-50 text-[rgba(43,127,255,1)] border-blue-200 px-2.5 py-1 rounded-full">
            <Heart className="w-3 h-3 mr-1.5" />
            Fisioterapia
          </Badge>
        );
      case 'estetica':
        return (
          <Badge variant="secondary" className="bg-pink-50 text-pink-700 border-pink-200 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Estética
          </Badge>
        );
    }
  };

  const handleVerifiedChange = (invoiceId: string, checked: boolean) => {
    updateInvoice(invoiceId, { verified: checked });
    const action = checked ? 'verificada' : 'desmarcada como verificada';
    toast.success(`Nota fiscal ${action} com sucesso!`);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Filtrar apenas PDFs
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      toast.error('Apenas arquivos PDF são suportados.');
    }

    if (pdfFiles.length === 0) return;

    if (pdfFiles.length === 1) {
      // Upload único
      await handleSinglePDFUpload(pdfFiles[0]);
    } else {
      // Upload múltiplo
      handleMultiplePDFUpload(pdfFiles);
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSinglePDFUpload = async (file: File) => {
    setCurrentPDFFile(file);
    setIsExtractingPDF(true);
    setIsPDFExtractionModalOpen(true);

    try {
      console.log('🚀 Iniciando extração de dados do TOMADOR no PDF:', file.name);
      const data = await extractInvoiceDataFromPDF(file);
      console.log('✅ Dados do tomador extraídos com sucesso:', data);
      setExtractedData(data);
    } catch (error) {
      console.error('❌ Erro na extração:', error);
      toast.error('Erro ao processar PDF. Tente novamente.');
      setIsPDFExtractionModalOpen(false);
    } finally {
      setIsExtractingPDF(false);
    }
  };

  const handleMultiplePDFUpload = (files: File[]) => {
    console.log('📁 Iniciando processamento em lote:', files.length, 'arquivos');
    setBatchFiles(files);
    setIsBatchProcessingModalOpen(true);
  };

  // Enhanced drag handlers for global drag detection
  const handleGlobalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if files are being dragged
    if (e.dataTransfer.types.includes('Files')) {
      setShowDropZone(true);
    }
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('Files')) {
      setShowDropZone(true);
      setIsDragOver(true);
    }
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're leaving the main container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setShowDropZone(false);
      setIsDragOver(false);
    }
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setShowDropZone(false);
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      toast.error('Apenas arquivos PDF são suportados.');
    }

    if (pdfFiles.length === 0) return;

    if (pdfFiles.length === 1) {
      handleSinglePDFUpload(pdfFiles[0]);
    } else {
      handleMultiplePDFUpload(pdfFiles);
    }
  };

  const handleConfirmExtractedData = (data: {
    number: string;
    client: string;
    value: number;
    issueDate: string;
    issueDateTime?: string;
    status: Invoice['status'];
    serviceType: Invoice['serviceType'];
    description: string;
  }) => {
    console.log('💾 handleConfirmExtractedData - Dados recebidos:', data);
    
    const month = selectedMonth;

    // Criar URL do arquivo PDF
    let pdfUrl = '';
    if (currentPDFFile) {
      pdfUrl = URL.createObjectURL(currentPDFFile);
    }

    const invoiceData = {
      number: data.number,
      client: data.client,
      value: data.value,
      issueDate: data.issueDate,
      issueDateTime: data.issueDateTime, // Incluir data/hora completa
      status: data.status,
      serviceType: data.serviceType,
      verified: false, // Nova nota sempre começa como não verificada
      description: data.description,
      month: month,
      pdfFile: currentPDFFile || undefined,
      pdfUrl: pdfUrl || undefined
    };

    addInvoice(invoiceData);
    
    // Toast com informação do tipo de serviço detectado
    const serviceTypeLabel = data.serviceType === 'fisioterapia' ? 'Fisioterapia' : 'Estética';
    toast.success(`Nota fiscal de ${serviceTypeLabel} adicionada ao mês ${month}!`);
    
    // Reset modal state
    setIsPDFExtractionModalOpen(false);
    setExtractedData(null);
    setCurrentPDFFile(null);
  };

  const handleBatchProcessingComplete = (results: Array<{ file: File; data: any; success: boolean }>) => {
    console.log('📦 Processamento em lote concluído:', results);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    // Contadores por tipo de serviço
    let fisioterapiaCount = 0;
    let esteticaCount = 0;

    // Salvar todas as notas com sucesso
    results.forEach(result => {
      if (result.success && result.data) {
        const pdfUrl = URL.createObjectURL(result.file);
        
        // Usar serviceType extraído ou padrão
        const serviceType = result.data.serviceType || 'fisioterapia';
        if (serviceType === 'fisioterapia') {
          fisioterapiaCount++;
        } else {
          esteticaCount++;
        }
        
        const invoiceData = {
          number: result.data.number || `AI-${Date.now().toString().slice(-6)}`,
          client: result.data.client || 'Cliente não identificado',
          value: result.data.value || 0,
          issueDate: result.data.issueDate || new Date().toISOString().split('T')[0],
          issueDateTime: result.data.issueDateTime, // Incluir data/hora completa
          status: 'pending' as Invoice['status'],
          serviceType: serviceType,
          verified: false, // Novas notas sempre começam como não verificadas
          description: result.data.description || `Extraído de ${result.file.name}`,
          month: selectedMonth,
          pdfFile: result.file,
          pdfUrl: pdfUrl
        };

        addInvoice(invoiceData);
      }
    });

    // Mostrar resultado detalhado
    if (successCount > 0) {
      let message = `${successCount} nota(s) fiscal(is) adicionada(s) com sucesso!`;
      if (fisioterapiaCount > 0 && esteticaCount > 0) {
        message += ` (${fisioterapiaCount} Fisioterapia, ${esteticaCount} Estética)`;
      } else if (fisioterapiaCount > 0) {
        message += ` (${fisioterapiaCount} Fisioterapia)`;
      } else if (esteticaCount > 0) {
        message += ` (${esteticaCount} Estética)`;
      }
      toast.success(message);
    }
    
    if (failCount > 0) {
      toast.error(`${failCount} arquivo(s) não puderam ser processados.`);
    }

    // Reset modal state
    setIsBatchProcessingModalOpen(false);
    setBatchFiles([]);
  };

  const handleCreateInvoice = () => {
    if (!createForm.number || !createForm.client || !createForm.value) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const valueAsNumber = parseFloat(createForm.value.replace(',', '.'));
    if (isNaN(valueAsNumber)) {
      toast.error('Por favor, insira um valor válido.');
      return;
    }

    const invoiceData = {
      ...createForm,
      value: valueAsNumber,
      month: selectedMonth
    };

    addInvoice(invoiceData);
    
    const serviceTypeLabel = createForm.serviceType === 'fisioterapia' ? 'Fisioterapia' : 'Estética';
    toast.success(`Nota fiscal de ${serviceTypeLabel} criada com sucesso!`);
    
    setIsCreateModalOpen(false);
    setCreateForm({
      number: '',
      client: '',
      value: '',
      issueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      serviceType: 'fisioterapia',
      verified: false,
      description: ''
    });
  };

  const handleUpdateStatus = (id: string, status: Invoice['status']) => {
    updateInvoice(id, { status });
    toast.success('Status atualizado com sucesso!');
  };

  const handleDeleteInvoice = (id: string) => {
    deleteInvoice(id);
    toast.success('Nota fiscal excluída com sucesso!');
  };

  const handleKeyModalSave = (key: string) => {
    setOpenAIKey(key);
    setIsKeyModalOpen(false);
    if (key) {
      toast.success('IA configurada com sucesso!');
    } else {
      toast.success('Chave da IA removida');
    }
  };

  return (
    <div 
      className="bg-white rounded-lg p-6 relative"
      onDragEnter={handleGlobalDragEnter}
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h3 className="text-gray-800">Gestão de nota fiscal</h3>
          <p className="text-sm text-gray-600">Mês: {selectedMonth}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsKeyModalOpen(true)}
            className={`${currentKey ? 'text-purple-600 border-purple-300' : 'text-gray-600 border-gray-300'}`}
          >
            <Brain className="w-4 h-4 mr-2" />
            {currentKey ? 'IA Configurada' : 'Configurar IA'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isExtractingPDF}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload PDF
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Nota
          </Button>
        </div>
      </div>

      {/* Hidden Drop Zone - only shows when dragging files */}
      {showDropZone && (
        <div
          className={`absolute inset-4 border-2 border-dashed rounded-xl p-6 z-10 transition-all duration-200 ${
            isDragOver
              ? 'border-blue-400 bg-blue-50/90 backdrop-blur-sm'
              : 'border-blue-300 bg-blue-50/80 backdrop-blur-sm'
          }`}
          style={{
            animation: showDropZone ? 'fadeInScale 0.2s ease-out' : undefined
          }}
        >
          <div className="text-center h-full flex flex-col items-center justify-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Upload className={`w-12 h-12 transition-colors ${isDragOver ? 'text-blue-500' : 'text-blue-400'}`} />
                {isDragOver && (
                  <Files className="w-6 h-6 text-blue-600 absolute -top-1 -right-1 animate-bounce" />
                )}
              </div>
            </div>
            
            <h4 className={`text-xl mb-2 transition-colors ${isDragOver ? 'text-blue-700' : 'text-blue-600'}`}>
              {isDragOver ? 'Solte os PDFs aqui' : 'Arraste PDFs aqui'}
            </h4>
            
            <p className="text-blue-600/80 mb-4 max-w-md">
              Detecção automática via "Discriminação dos Serviços" • Extração de data/hora completa
            </p>

            {/* Indicadores visuais para múltiplos arquivos */}
            <div className="flex items-center justify-center gap-6 text-sm text-blue-600/70 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>1 arquivo</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Files className="w-4 h-4" />
                <span>Vários arquivos</span>
              </div>
            </div>
            
            {/* Status da IA */}
            <div className="flex items-center justify-center gap-3 pt-4 border-t border-blue-200/50">
              {currentKey ? (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-blue-700">IA ativa</span>
                  </div>
                  <span className="text-blue-400">•</span>
                  <span className="text-blue-600/80">Análise de discriminação</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-blue-700">IA não configurada</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsKeyModalOpen(true)}
                    className="h-auto p-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
                  >
                    Configurar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra de Pesquisa */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Pesquisar por número da nota ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {invoices.length > 0 && (
          <div className="text-sm text-gray-600">
            {filteredAndSortedInvoices.length} de {invoices.length} notas
          </div>
        )}
      </div>

      {/* Tabela Clean de Notas Fiscais */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 border-b border-gray-200">
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100/80 select-none transition-colors py-4 px-6"
                  onClick={() => handleSort('number')}
                >
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    Número
                    {getSortIcon('number')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100/80 select-none transition-colors py-4 px-6"
                  onClick={() => handleSort('client')}
                >
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    Cliente
                    {getSortIcon('client')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100/80 select-none transition-colors py-4 px-6"
                  onClick={() => handleSort('serviceType')}
                >
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    Tipo de Serviço
                    {getSortIcon('serviceType')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100/80 select-none transition-colors py-4 px-6"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    Valor
                    {getSortIcon('value')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100/80 select-none transition-colors py-4 px-6"
                  onClick={() => handleSort('issueDate')}
                >
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    Data e Hora de Emissão
                    {getSortIcon('issueDate')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100/80 select-none transition-colors py-4 px-6"
                  onClick={() => handleSort('verified')}
                >
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    Verificado
                    {getSortIcon('verified')}
                  </div>
                </TableHead>
                <TableHead className="py-4 px-6 text-gray-700 font-medium w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-500 font-medium">
                          {searchTerm 
                            ? 'Nenhuma nota fiscal encontrada'
                            : `Nenhuma nota fiscal em ${selectedMonth}`
                          }
                        </p>
                        {!searchTerm && (
                          <p className="text-sm text-gray-400">
                            Arraste PDFs para a tela ou clique em Upload PDF para extrair automaticamente os dados
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedInvoices.map((invoice, index) => (
                  <TableRow 
                    key={invoice.id} 
                    className="hover:bg-blue-50/30 transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-gray-800">{invoice.number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-800 truncate font-medium">
                            {invoice.client}
                          </div>
                          <div className="text-xs text-gray-500">
                            Tomador de Serviços
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {getServiceTypeBadge(invoice.serviceType)}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(invoice.value)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Valor total
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-col">
                          <span className="text-gray-800 font-medium">
                            {formatDateTime(invoice.issueDate, invoice.issueDateTime)}
                          </span>
                          {invoice.issueDateTime && invoice.issueDateTime !== new Date(invoice.issueDate).toLocaleDateString('pt-BR') && (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              Extraído da NFS-e
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={invoice.verified}
                          onCheckedChange={(checked) => handleVerifiedChange(invoice.id, checked as boolean)}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                        {invoice.verified && (
                          <span className="text-xs text-green-600 font-medium">
                            Verificada
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="w-8 h-8 p-0 hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {invoice.pdfUrl && (
                            <DropdownMenuItem onClick={() => window.open(invoice.pdfUrl, '_blank')}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar PDF
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Input de arquivo oculto - agora suporta múltiplos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Modal de Extração de PDF Individual */}
      <PDFExtractionModal
        isOpen={isPDFExtractionModalOpen}
        onClose={() => {
          setIsPDFExtractionModalOpen(false);
          setExtractedData(null);
          setCurrentPDFFile(null);
        }}
        onConfirm={handleConfirmExtractedData}
        extractedData={extractedData}
        fileName={currentPDFFile?.name || ''}
        isLoading={isExtractingPDF}
      />

      {/* Modal de Processamento em Lote */}
      <BatchPDFProcessingModal
        isOpen={isBatchProcessingModalOpen}
        onClose={() => {
          setIsBatchProcessingModalOpen(false);
          setBatchFiles([]);
        }}
        files={batchFiles}
        onProcessingComplete={handleBatchProcessingComplete}
        extractFunction={extractInvoiceDataFromPDF}
      />

      {/* Modal de configuração da chave OpenAI */}
      <OpenAIKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onSave={handleKeyModalSave}
        currentKey={currentKey}
      />

      {/* Modal de Criação Manual */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Nota Fiscal</DialogTitle>
            <DialogDescription>
              Cadastre uma nova nota fiscal manualmente para <strong>{selectedMonth}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number">Número da Nota *</Label>
                <Input
                  id="number"
                  value={createForm.number}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="Ex: NF-001"
                />
              </div>
              <div>
                <Label htmlFor="issueDate">Data de Emissão *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={createForm.issueDate}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, issueDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="client" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Cliente (Tomador de Serviços) *
              </Label>
              <Input
                id="client"
                value={createForm.client}
                onChange={(e) => setCreateForm(prev => ({ ...prev, client: e.target.value }))}
                placeholder="Nome do cliente que contrata o serviço"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="value">Valor *</Label>
                <Input
                  id="value"
                  value={createForm.value}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <Label htmlFor="serviceType">Tipo de Serviço *</Label>
                <Select
                  value={createForm.serviceType}
                  onValueChange={(value: Invoice['serviceType']) => 
                    setCreateForm(prev => ({ ...prev, serviceType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisioterapia">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-blue-500" />
                        Fisioterapia
                      </div>
                    </SelectItem>
                    <SelectItem value="estetica">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-pink-500" />
                        Estética
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={createForm.verified}
                onCheckedChange={(checked) => setCreateForm(prev => ({ ...prev, verified: checked as boolean }))}
                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <Label htmlFor="verified" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Marcar como verificada
              </Label>
            </div>

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição da nota fiscal"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateInvoice}>
              Criar Nota Fiscal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}