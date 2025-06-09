import { useState, useEffect } from 'react';
import { Brain, User, FileText, Eye, EyeOff, CheckCircle, AlertCircle, X, Edit3, Loader2, Heart, Sparkles, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface ExtractedInvoiceData {
  number: string;
  client: string;
  value: number;
  issueDate: string;
  issueDateTime?: string;
  serviceType: 'fisioterapia' | 'estetica';
  description: string;
  confidence: 'high' | 'medium' | 'low';
  extractionMethod: string;
  cnpj?: string;
  competencia?: string;
  additionalInfo?: {
    totalPages: number;
    textLength: number;
    foundFields: string[];
    aiResponse?: any;
    processingTime?: number;
    apiCost?: number;
  };
}

interface PDFExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    number: string;
    client: string;
    value: number;
    issueDate: string;
    issueDateTime?: string;
    status: 'pending' | 'sent' | 'paid' | 'overdue';
    serviceType: 'fisioterapia' | 'estetica';
    description: string;
  }) => void;
  extractedData: ExtractedInvoiceData | null;
  fileName: string;
  isLoading: boolean;
}

export function PDFExtractionModal({
  isOpen,
  onClose,
  onConfirm,
  extractedData,
  fileName,
  isLoading
}: PDFExtractionModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    number: '',
    client: '',
    value: '',
    issueDate: new Date().toISOString().split('T')[0],
    issueDateTime: '',
    status: 'pending' as const,
    serviceType: 'fisioterapia' as 'fisioterapia' | 'estetica',
    description: ''
  });

  // Simular progresso durante loading
  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);
      
      return () => clearInterval(interval);
    } else if (extractedData) {
      setProgress(100);
    }
  }, [isLoading, extractedData]);

  // Atualizar form quando dados são extraídos
  useEffect(() => {
    if (extractedData && !isLoading) {
      setFormData({
        number: extractedData.number || '',
        client: extractedData.client || '',
        value: extractedData.value?.toString() || '',
        issueDate: extractedData.issueDate || new Date().toISOString().split('T')[0],
        issueDateTime: extractedData.issueDateTime || '',
        status: 'pending',
        serviceType: extractedData.serviceType || 'fisioterapia',
        description: extractedData.description || ''
      });
      setEditMode(false);
    }
  }, [extractedData, isLoading]);

  const handleConfirm = () => {
    const valueAsNumber = parseFloat(formData.value);
    if (isNaN(valueAsNumber)) {
      return;
    }

    onConfirm({
      number: formData.number,
      client: formData.client,
      value: valueAsNumber,
      issueDate: formData.issueDate,
      issueDateTime: formData.issueDateTime || undefined,
      status: formData.status,
      serviceType: formData.serviceType,
      description: formData.description
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-100 text-green-700 text-xs">Alta Precisão</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700 text-xs">Média Precisão</Badge>;
      case 'low':
        return <Badge className="bg-red-100 text-red-700 text-xs">Baixa Precisão</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Desconhecida</Badge>;
    }
  };

  const formatCurrency = (value: string): string => {
    const number = parseFloat(value);
    return isNaN(number) ? 'R$ 0,00' : number.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getServiceTypeBadge = (serviceType: 'fisioterapia' | 'estetica') => {
    switch (serviceType) {
      case 'fisioterapia':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <Heart className="w-3 h-3 mr-1" />
            Fisioterapia
          </Badge>
        );
      case 'estetica':
        return (
          <Badge variant="secondary" className="bg-pink-100 text-pink-700">
            <Sparkles className="w-3 h-3 mr-1" />
            Estética
          </Badge>
        );
    }
  };

  // Função para formatar data/hora para exibição
  const formatDateTimeDisplay = (date: string, dateTime?: string): string => {
    if (dateTime && dateTime.trim()) {
      return dateTime;
    }
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Função para truncar nome do arquivo para exibição
  const truncateFileName = (name: string, maxLength: number = 30): string => {
    if (name.length <= maxLength) return name;
    const extension = name.substring(name.lastIndexOf('.'));
    const baseName = name.substring(0, name.lastIndexOf('.'));
    const truncatedBase = baseName.substring(0, maxLength - extension.length - 3);
    return `${truncatedBase}...${extension}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              ) : (
                <Brain className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-gray-800">
                {isLoading ? 'Analisando PDF' : 'Dados Extraídos'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {isLoading ? (
                  <>
                    Extraindo dados da "Discriminação dos Serviços" de{' '}
                    <span className="font-mono bg-gray-100 rounded px-2 py-1">
                      {truncateFileName(fileName)}
                    </span>
                  </>
                ) : (
                  <>
                    Confirme os dados extraídos de{' '}
                    <span className="font-mono bg-gray-100 rounded px-2 py-1">
                      {truncateFileName(fileName)}
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="py-6">
            <div className="text-center mb-4">
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <Brain className="w-12 h-12 text-purple-400" />
                  <div className="absolute inset-0 border-2 border-purple-200 rounded-full animate-ping"></div>
                </div>
              </div>
              <h4 className="text-gray-700 mb-1">Extraindo dados do cliente</h4>
              <div className="text-sm text-gray-600 max-w-md mx-auto">
                <div className="mb-2">Analisando seções:</div>
                <div className="text-xs space-y-1">
                  <div className="bg-gray-100 rounded px-2 py-1">"TOMADOR DE SERVIÇOS"</div>
                  <div className="bg-gray-100 rounded px-2 py-1">"DISCRIMINAÇÃO DOS SERVIÇOS"</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-gray-500 text-center">
                {progress < 30 && "Convertendo PDF..."}
                {progress >= 30 && progress < 60 && "Analisando com IA..."}
                {progress >= 60 && progress < 90 && "Extraindo dados do tomador..."}
                {progress >= 90 && "Finalizando..."}
              </div>
            </div>
          </div>
        )}

        {/* Dados extraídos */}
        {!isLoading && extractedData && (
          <div className="space-y-4">
            {/* Status da extração */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Dados extraídos com sucesso</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getConfidenceBadge(extractedData.confidence)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-auto p-1"
                >
                  {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Detalhes técnicos (colapsível) */}
            {showDetails && extractedData.additionalInfo && (
              <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><strong>Método:</strong> {extractedData.extractionMethod}</div>
                  <div><strong>Páginas:</strong> {extractedData.additionalInfo.totalPages}</div>
                  <div><strong>Tempo:</strong> {extractedData.additionalInfo.processingTime}ms</div>
                  <div><strong>Confiança:</strong> {extractedData.confidence}</div>
                </div>
                {extractedData.additionalInfo.foundFields && (
                  <div>
                    <strong>Campos encontrados:</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {extractedData.additionalInfo.foundFields.map((field, index) => (
                        <span key={index} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {extractedData.additionalInfo.aiResponse?.discriminacaoServicos && (
                  <div>
                    <strong>Discriminação dos Serviços:</strong>
                    <div className="mt-1 p-2 bg-white rounded border text-xs max-h-20 overflow-y-auto">
                      {extractedData.additionalInfo.aiResponse.discriminacaoServicos.substring(0, 200)}
                      {extractedData.additionalInfo.aiResponse.discriminacaoServicos.length > 200 && '...'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Formulário */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Dados do Cliente (Tomador)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className="h-auto p-1 text-xs"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  {editMode ? 'Visualizar' : 'Editar'}
                </Button>
              </div>

              {editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="number" className="text-xs">Número</Label>
                      <Input
                        id="number"
                        value={formData.number}
                        onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                        placeholder="NF-000001"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="issueDate" className="text-xs">Data</Label>
                      <Input
                        id="issueDate"
                        type="date"
                        value={formData.issueDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Campo para data/hora completa se disponível */}
                  {formData.issueDateTime && (
                    <div>
                      <Label htmlFor="issueDateTime" className="text-xs">Data e Hora Completa (da NFS-e)</Label>
                      <Input
                        id="issueDateTime"
                        value={formData.issueDateTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, issueDateTime: e.target.value }))}
                        placeholder="DD/MM/AAAA HH:MM:SS"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="client" className="text-xs">Cliente (Tomador)</Label>
                    <Input
                      id="client"
                      value={formData.client}
                      onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
                      placeholder="Nome do cliente que contrata o serviço"
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="value" className="text-xs">Valor</Label>
                      <Input
                        id="value"
                        value={formData.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="serviceType" className="text-xs">Tipo de Serviço</Label>
                      <Select
                        value={formData.serviceType}
                        onValueChange={(value: 'fisioterapia' | 'estetica') => setFormData(prev => ({ ...prev, serviceType: value }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fisioterapia">
                            <div className="flex items-center gap-2">
                              <Heart className="w-3 h-3 text-blue-500" />
                              Fisioterapia
                            </div>
                          </SelectItem>
                          <SelectItem value="estetica">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-pink-500" />
                              Estética
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Número</div>
                      <div className="font-medium break-words">{formData.number || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Data e Hora de Emissão
                      </div>
                      <div className="font-medium break-words">
                        {formatDateTimeDisplay(formData.issueDate, formData.issueDateTime)}
                      </div>
                      {formData.issueDateTime && (
                        <div className="text-xs text-blue-600 mt-1">
                          Extraído da NFS-e
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Cliente (Tomador de Serviços)
                    </div>
                    <div className="font-medium break-words">{formData.client || 'Não identificado'}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Valor</div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(formData.value)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Tipo de Serviço</div>
                      <div className="flex flex-col gap-1">
                        {getServiceTypeBadge(formData.serviceType)}
                        {extractedData.additionalInfo?.aiResponse?.discriminacaoServicos && (
                          <div className="text-xs text-gray-500">
                            Da discriminação dos serviços
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!isLoading && extractedData && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 gap-3">
            <Button variant="outline" onClick={onClose} size="sm">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Salvar Nota Fiscal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
