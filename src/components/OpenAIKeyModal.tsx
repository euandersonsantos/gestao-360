import { useState } from 'react';
import { Brain, Key, Eye, EyeOff, X, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface OpenAIKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string | null;
}

export function OpenAIKeyModal({
  isOpen,
  onClose,
  onSave,
  currentKey
}: OpenAIKeyModalProps) {
  const [key, setKey] = useState(currentKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleSave = async () => {
    if (key.trim()) {
      setIsValidating(true);
      // Simular validação
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsValidating(false);
    }
    
    onSave(key.trim());
    setKey('');
    setShowKey(false);
  };

  const handleRemove = () => {
    setKey('');
    onSave('');
    setShowKey(false);
  };

  const maskKey = (apiKey: string): string => {
    if (!apiKey || apiKey.length < 10) return apiKey;
    return `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <DialogTitle className="text-gray-800">Configurar IA</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Configure sua chave da API OpenAI para usar GPT-4o Vision na extração de dados
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Status atual */}
        {currentKey && (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div className="text-sm">
                <div className="text-green-800 font-medium">IA Configurada</div>
                <div className="text-green-600 text-xs">
                  Chave: {maskKey(currentKey)}
                </div>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700 text-xs">Ativa</Badge>
          </div>
        )}

        {/* Formulário */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="apiKey" className="text-sm">
              Chave da API OpenAI
            </Label>
            <div className="relative mt-1">
              <Input
                id="apiKey"
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Informações importantes */}
          <div className="text-xs text-gray-600 bg-blue-50 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-blue-800 mb-1">Recursos utilizados:</div>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>GPT-4o com visão para análise de PDFs</li>
                  <li>Extração automática de dados do "TOMADOR DE SERVIÇOS"</li>
                  <li>Processamento em lote de múltiplos arquivos</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Link para obter chave */}
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600 hover:text-blue-700"
              onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
            >
              <Key className="w-3 h-3 mr-1" />
              Obter chave da API OpenAI
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {currentKey && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700"
              >
                Remover
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} size="sm">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              size="sm"
              disabled={isValidating || (!key.trim() && !currentKey)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {currentKey ? 'Atualizar' : 'Salvar'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}