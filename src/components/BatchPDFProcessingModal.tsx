import { useState, useEffect } from 'react';
import { Brain, FileText, CheckCircle, AlertCircle, X, Building2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';

interface FileProcessingStatus {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedData?: any;
  error?: string;
  progress: number;
}

interface BatchPDFProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onProcessingComplete: (results: Array<{ file: File; data: any; success: boolean }>) => void;
  extractFunction: (file: File) => Promise<any>;
}

export function BatchPDFProcessingModal({
  isOpen,
  onClose,
  files,
  onProcessingComplete,
  extractFunction
}: BatchPDFProcessingModalProps) {
  const [filesStatus, setFilesStatus] = useState<FileProcessingStatus[]>([]);
  const [currentProcessing, setCurrentProcessing] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Inicializar status dos arquivos
  useEffect(() => {
    if (files.length > 0) {
      const initialStatus = files.map(file => ({
        file,
        status: 'pending' as const,
        progress: 0
      }));
      setFilesStatus(initialStatus);
      setCompletedCount(0);
      setOverallProgress(0);
    }
  }, [files]);

  // Processar arquivos sequencialmente
  useEffect(() => {
    if (isOpen && filesStatus.length > 0 && !isProcessing) {
      processFiles();
    }
  }, [isOpen, filesStatus.length]);

  const processFiles = async () => {
    setIsProcessing(true);
    const results: Array<{ file: File; data: any; success: boolean }> = [];
    
    for (let i = 0; i < filesStatus.length; i++) {
      const fileStatus = filesStatus[i];
      setCurrentProcessing(fileStatus.file.name);
      
      // Atualizar status para processando
      setFilesStatus(prev => prev.map((item, index) => 
        index === i ? { ...item, status: 'processing', progress: 10 } : item
      ));

      try {
        // Simular progresso gradual
        for (let progress = 20; progress <= 80; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setFilesStatus(prev => prev.map((item, index) => 
            index === i ? { ...item, progress } : item
          ));
        }

        // Processar arquivo
        const extractedData = await extractFunction(fileStatus.file);
        
        // Completar com sucesso
        setFilesStatus(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            status: 'completed', 
            progress: 100, 
            extractedData 
          } : item
        ));

        results.push({ file: fileStatus.file, data: extractedData, success: true });
        setCompletedCount(prev => prev + 1);
        
      } catch (error) {
        console.error(`Erro ao processar ${fileStatus.file.name}:`, error);
        
        // Marcar como erro
        setFilesStatus(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            status: 'error', 
            progress: 100,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          } : item
        ));

        results.push({ file: fileStatus.file, data: null, success: false });
        setCompletedCount(prev => prev + 1);
      }

      // Atualizar progresso geral
      const newOverallProgress = ((i + 1) / filesStatus.length) * 100;
      setOverallProgress(newOverallProgress);
    }

    setCurrentProcessing(null);
    setIsProcessing(false);
    
    // Chamar callback com resultados
    setTimeout(() => {
      onProcessingComplete(results);
    }, 500);
  };

  const getStatusIcon = (status: FileProcessingStatus['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-gray-300 flex-shrink-0"></div>;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    }
  };

  const getStatusBadge = (status: FileProcessingStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs flex-shrink-0">Aguardando</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 flex-shrink-0">Processando</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 flex-shrink-0">Concluído</Badge>;
      case 'error':
        return <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 flex-shrink-0">Erro</Badge>;
    }
  };

  // Função para truncar nome do arquivo
  const truncateFileName = (name: string, maxLength: number = 35): string => {
    if (name.length <= maxLength) return name;
    const extension = name.substring(name.lastIndexOf('.'));
    const baseName = name.substring(0, name.lastIndexOf('.'));
    const truncatedBase = baseName.substring(0, maxLength - extension.length - 3);
    return `${truncatedBase}...${extension}`;
  };

  const allCompleted = completedCount === filesStatus.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-gray-800">Processamento em Lote com IA</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {isProcessing 
                  ? (
                    <div className="space-y-1">
                      <div>Processando {files.length} arquivo(s) PDF com IA</div>
                      <div className="text-xs text-blue-600">
                        Extraindo dados dos clientes (tomadores) + tipo de serviço
                      </div>
                    </div>
                  )
                  : allCompleted 
                    ? `Processamento de ${files.length} arquivo(s) concluído`
                    : `Preparando ${files.length} arquivo(s) PDF para processamento`
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Progresso geral */}
        <div className="py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progresso geral</span>
            <span className="text-sm font-medium text-gray-800">
              {completedCount}/{filesStatus.length} arquivos
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Lista de arquivos - scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-3 pr-2">
            {filesStatus.map((fileStatus, index) => (
              <div key={index} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon(fileStatus.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate" title={fileStatus.file.name}>
                      {truncateFileName(fileStatus.file.name)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(fileStatus.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  {getStatusBadge(fileStatus.status)}
                </div>

                {/* Progress bar individual */}
                <div className="mb-2">
                  <Progress value={fileStatus.progress} className="h-1" />
                </div>

                {/* Dados extraídos */}
                {fileStatus.status === 'completed' && fileStatus.extractedData && (
                  <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 space-y-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        <span className="font-medium flex-shrink-0">Cliente:</span>
                        <span className="truncate" title={fileStatus.extractedData.client}>
                          {fileStatus.extractedData.client || 'Não identificado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span className="font-medium">Valor:</span>
                        <span>R$ {fileStatus.extractedData.value?.toFixed(2) || '0,00'}</span>
                      </div>
                    </div>
                    {fileStatus.extractedData.serviceType && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-medium">Tipo:</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          fileStatus.extractedData.serviceType === 'fisioterapia' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-pink-100 text-pink-700'
                        }`}>
                          {fileStatus.extractedData.serviceType === 'fisioterapia' ? 'Fisioterapia' : 'Estética'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error message */}
                {fileStatus.status === 'error' && fileStatus.error && (
                  <div className="text-xs text-red-600 bg-red-50 rounded p-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="break-words">{fileStatus.error}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status atual */}
        {currentProcessing && (
          <div className="py-3 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <span className="truncate">
                Processando: {truncateFileName(currentProcessing, 40)}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-shrink-0">
          <div className="text-xs text-gray-500 flex-1 min-w-0">
            {allCompleted ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                <span className="truncate">Todos os arquivos foram processados</span>
              </span>
            ) : isProcessing ? (
              <span>Processamento em andamento...</span>
            ) : (
              <span>Aguardando início do processamento</span>
            )}
          </div>
          
          {allCompleted && (
            <Button onClick={onClose} size="sm" className="ml-3 flex-shrink-0">
              Finalizar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}