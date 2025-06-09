import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCompanies } from './useCompanies';

export interface Invoice {
  id: string;
  number: string;
  client: string;
  value: number;
  issueDate: string;
  issueDateTime?: string; // data e hora completa de emissão
  month: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue';
  serviceType: 'fisioterapia' | 'estetica';
  verified: boolean; // novo campo para marcar se a nota foi verificada
  description?: string;
  pdfFile?: File;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalValue: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  verifiedInvoices: number; // novo campo para notas verificadas
  verifiedPercentage: number; // porcentagem de notas verificadas
  averageValue: number;
  fisioterapiaCount: number;
  esteticaCount: number;
}

export interface InvoiceStatsWithComparison extends InvoiceStats {
  previousMonth: {
    totalInvoices: number;
    totalValue: number;
    verifiedPercentage: number;
    averageValue: number;
  };
  comparison: {
    totalInvoicesChange: number;
    totalValueChange: number;
    verifiedPercentageChange: number;
    averageValueChange: number;
  };
}

export interface ExtractedInvoiceData {
  number: string;
  client: string;
  value: number;
  issueDate: string;
  issueDateTime?: string; // hora de emissão completa
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

interface InvoiceContextType {
  invoices: Invoice[];
  getInvoicesForMonth: (month: string) => Invoice[];
  getInvoiceStats: (month: string) => InvoiceStats;
  getInvoiceStatsWithComparison: (month: string) => InvoiceStatsWithComparison;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  extractInvoiceDataFromPDF: (file: File) => Promise<ExtractedInvoiceData>;
  getOpenAIKey: () => string | null;
  setOpenAIKey: (key: string) => void;
  isLoading: boolean;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

// Função para obter o mês anterior
const getPreviousMonth = (currentMonth: string): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const [monthName, yearStr] = currentMonth.split(' ');
  const year = parseInt(yearStr);
  const currentMonthIndex = months.indexOf(monthName);
  
  if (currentMonthIndex === -1) return currentMonth; // fallback
  
  if (currentMonthIndex === 0) {
    // Janeiro -> Dezembro do ano anterior
    return `Dezembro ${year - 1}`;
  } else {
    // Outros meses -> mês anterior do mesmo ano
    return `${months[currentMonthIndex - 1]} ${year}`;
  }
};

// Função para calcular mudança percentual
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return current === 0 ? 0 : 100; // Se anterior for 0 e atual > 0, consideramos 100% de aumento
  }
  return Math.round(((current - previous) / previous) * 100);
};

// Funções para gerenciar API key da OpenAI
const getStoredOpenAIKey = (): string | null => {
  try {
    return localStorage.getItem('openai_api_key');
  } catch {
    return null;
  }
};

const storeOpenAIKey = (key: string): void => {
  try {
    localStorage.setItem('openai_api_key', key);
  } catch (error) {
    console.error('Erro ao salvar chave da OpenAI:', error);
  }
};

// Função para converter PDF em imagem usando PDF.js
const pdfToImageBase64 = async (file: File): Promise<string[]> => {
  // Carregar PDF.js se necessário
  if (typeof window !== 'undefined' && !(window as any).pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const pdfjsLib = (window as any).pdfjsLib;

  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    
    fileReader.onload = async function() {
      try {
        const typedArray = new Uint8Array(this.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        
        const images: string[] = [];
        
        // Converter todas as páginas em imagens de alta qualidade
        for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 3); pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 3.0 }); // Alta resolução para IA
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          // Converter canvas para base64
          const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
          images.push(imageBase64);
        }
        
        resolve(images);
      } catch (error) {
        reject(error);
      }
    };
    
    fileReader.onerror = () => reject(new Error('Erro ao ler arquivo PDF'));
    fileReader.readAsArrayBuffer(file);
  });
};

// Função principal para extrair dados usando GPT-4o (com suporte a visão)
const extractWithOpenAIVision = async (file: File, apiKey: string): Promise<ExtractedInvoiceData> => {
  console.log('🤖 Iniciando extração com GPT-4o Vision...');
  const startTime = Date.now();

  try {
    // Converter PDF para imagens
    const images = await pdfToImageBase64(file);
    console.log(`📸 PDF convertido em ${images.length} imagem(s) de alta resolução`);

    // Prompt especializado para extrair dados do TOMADOR DE SERVIÇOS em NFS-e brasileiras
    const prompt = `
Você é um assistente especializado em extrair dados de Notas Fiscais de Serviços Eletrônicas (NFS-e) brasileiras.

**IMPORTANTE: FOQUE APENAS NA SEÇÃO "TOMADOR DE SERVIÇOS"**

Analise cuidadosamente esta imagem de uma NFS-e e extraia EXATAMENTE as seguintes informações:

**SEÇÕES E LOCALIZAÇÕES:**

1. **CABEÇALHO DA NOTA (informações gerais):**
   - Número da NFS-e: "Número da NFS-e", "N° NFS-e", "Nota Fiscal Eletrônica", "Número:"
   - Data e Hora de Emissão: "Data e Hora de Emissão", "Data de Emissão", "Emitida em", "Data/Hora:"
     * CRÍTICO: Capture a data E hora COMPLETAS exatamente como aparecem na nota
     * Formatos comuns: "DD/MM/AAAA HH:MM:SS", "DD/MM/AAAA HH:MM", "DD/MM/AAAA às HH:MM"
     * Preserve o formato original encontrado na nota, incluindo separadores e texto

2. **SEÇÃO "TOMADOR DE SERVIÇOS" (dados do cliente):**
   - Nome/Razão Social: "Nome/Razão Social", "Razão Social", "Nome"
   - CNPJ/CPF: "CNPJ", "CPF"
   - IMPORTANTE: NÃO confundir com "PRESTADOR DE SERVIÇOS" (que é quem emite a nota)

3. **VALORES:**
   - Valor Total: "Valor Total dos Serviços", "Total dos Serviços", "Valor Líquido", "Total da Nota", "Valor Total"

4. **TIPO DE SERVIÇO - SEÇÃO "DISCRIMINAÇÃO DOS SERVIÇOS" (FOCO PRINCIPAL):**
   
   **LOCALIZAÇÃO PRIORITÁRIA:**
   Procure ESPECIFICAMENTE na seção "DISCRIMINAÇÃO DOS SERVIÇOS", "DESCRIÇÃO DOS SERVIÇOS", "DISCRIMINAÇÃO", ou "SERVIÇOS PRESTADOS".
   
   Esta seção geralmente contém:
   - Descrição detalhada dos serviços
   - Códigos de serviço
   - Quantidade de sessões
   - Procedimentos realizados
   
   **REGRAS DE IDENTIFICAÇÃO:**
   
   **FISIOTERAPIA** - Se encontrar na discriminação:
   - "fisioterapia", "fisioterapeuta", "sessão de fisioterapia"
   - "reabilitação", "RPG", "pilates terapêutico", "cinesioterapia"
   - "alongamento terapêutico", "fortalecimento muscular"
   - "mobilização articular", "exercícios terapêuticos"
   - "eletroterapia", "ultrassom terapêutico", "TENS", "FES"
   - "drenagem linfática manual terapêutica"
   - "massoterapia", "quiropraxia"
   - "avaliação fisioterapêutica", "reavaliação fisioterápica"
   - "tratamento de lesões", "recuperação funcional"
   - Códigos como "CREFITO", "CRM", códigos municipais de fisioterapia
   
   **ESTÉTICA** - Se encontrar na discriminação:
   - "estética", "esteticista", "procedimento estético"
   - "beleza", "cosmético", "tratamento de beleza"
   - "limpeza de pele", "peeling", "microagulhamento"
   - "radiofrequência", "laser estético", "luz pulsada"
   - "drenagem linfática estética", "drenagem modeladora"
   - "massagem relaxante", "massagem modeladora", "massagem anti-stress"
   - "depilação", "sobrancelha", "design de sobrancelhas", "henna"
   - "hidratação facial", "hidratação corporal"
   - "rejuvenescimento", "anti-aging", "antienvelhecimento"
   - "criolipólise", "carboxiterapia", "mesoterapia"
   - "botox", "preenchimento", "harmonização facial"
   - "manicure", "pedicure", "esmaltação"
   - "bronzeamento", "autobronzeador"

5. **COMPETÊNCIA/REFERÊNCIA:**
   - "Competência", "Referência", "Período", "Mês de referência"

**INSTRUÇÕES CRÍTICAS:**

- NUNCA extraia dados da seção "PRESTADOR DE SERVIÇOS" ou "EMISSOR"
- Use APENAS dados claramente identificados como do "TOMADOR"
- Para data/hora: mantenha EXATAMENTE o formato original encontrado na nota
- Para valores: use apenas números com ponto decimal (ex: 1234.56)
- Para tipo de serviço: analise PRIORITARIAMENTE a seção "DISCRIMINAÇÃO DOS SERVIÇOS"
- Se a discriminação não for clara, use "fisioterapia" como padrão
- Se não conseguir identificar algum campo do TOMADOR, use null
- Seja preciso e não invente informações

**FORMATO DE RETORNO:**

Retorne APENAS um JSON válido neste formato exato:
{
  "numero": "string ou null",
  "dataEmissaoCompleta": "exatamente como aparece na nota ou null",
  "cliente": "string ou null (APENAS do TOMADOR)",
  "valor": número ou null,
  "tipoServico": "fisioterapia" | "estetica",
  "cnpj": "string ou null (APENAS do TOMADOR)",
  "competencia": "string ou null",
  "discriminacaoServicos": "texto da seção discriminação ou null",
  "confianca": "alta" | "media" | "baixa",
  "camposEncontrados": ["array", "de", "campos", "identificados"],
  "termosIdentificacao": ["termos", "da", "discriminacao", "que", "identificaram", "o", "tipo"]
}

**EXEMPLOS DE DISCRIMINAÇÃO:**

✅ FISIOTERAPIA: "Sessão de fisioterapia - RPG", "Atendimento fisioterapêutico", "Reabilitação pós-cirúrgica"
✅ ESTÉTICA: "Limpeza de pele facial", "Drenagem linfática estética", "Procedimento de peeling químico"

FOQUE ESPECIALMENTE na seção "DISCRIMINAÇÃO DOS SERVIÇOS" para uma identificação precisa do tipo de serviço.
`;

    // Preparar mensagens para a API
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          },
          ...images.map(image => ({
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${image}`,
              detail: "high"
            }
          }))
        ]
      }
    ];

    // Fazer chamada para GPT-4o (modelo atual com suporte a visão)
    console.log('🚀 Enviando para GPT-4o Vision...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o", // Modelo atual com suporte a visão
        messages: messages,
        max_tokens: 1500,
        temperature: 0.1 // Baixa temperatura para respostas mais precisas
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Erro da API OpenAI: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('Resposta vazia da API OpenAI');
    }

    console.log('🤖 Resposta da IA:', aiResponse);

    // Parsear resposta JSON da IA
    let parsedData;
    try {
      // Limpar resposta se tiver texto extra antes/depois do JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
      parsedData = JSON.parse(jsonStr);
    } catch (error) {
      console.error('Erro ao parsear JSON da IA:', error);
      throw new Error('IA retornou formato inválido');
    }

    // Processar e validar dados extraídos
    const processingTime = Date.now() - startTime;
    
    // Processar data e hora de emissão
    let issueDate = new Date().toISOString().split('T')[0];
    let issueDateTime = '';
    
    if (parsedData.dataEmissaoCompleta) {
      try {
        const originalDateTime = parsedData.dataEmissaoCompleta;
        issueDateTime = originalDateTime; // Preservar formato original
        
        // Tentar extrair data para formato ISO (para consistência interna)
        const dateTimeMatch = originalDateTime.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateTimeMatch) {
          const [, day, month, year] = dateTimeMatch;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            issueDate = date.toISOString().split('T')[0];
          }
        }
      } catch (error) {
        console.warn('Erro ao processar data/hora:', error);
      }
    }

    // Mapear tipo de serviço com base na discriminação
    let serviceType: 'fisioterapia' | 'estetica' = 'fisioterapia'; // padrão
    if (parsedData.tipoServico) {
      if (parsedData.tipoServico.toLowerCase() === 'estetica' || parsedData.tipoServico.toLowerCase() === 'estética') {
        serviceType = 'estetica';
      }
    }

    // Mapear confiança
    const confidenceMap: { [key: string]: 'high' | 'medium' | 'low' } = {
      'alta': 'high',
      'media': 'medium',
      'baixa': 'low',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };

    // Validação adicional para garantir que pegamos dados do tomador
    let confidence = confidenceMap[parsedData.confianca] || 'medium';
    
    // Se não conseguimos distinguir claramente o tomador, reduzir confiança
    if (!parsedData.cliente || parsedData.cliente.includes('não identificado')) {
      confidence = 'low';
    }

    // Aumentar confiança se temos discriminação de serviços clara
    if (parsedData.discriminacaoServicos && parsedData.termosIdentificacao && parsedData.termosIdentificacao.length > 0) {
      if (confidence !== 'low') {
        confidence = 'high';
      }
    }

    const extractedData: ExtractedInvoiceData = {
      number: parsedData.numero || `AI-${Date.now().toString().slice(-6)}`,
      client: parsedData.cliente || 'Cliente (tomador) não identificado',
      value: typeof parsedData.valor === 'number' ? parsedData.valor : 0,
      issueDate: issueDate,
      issueDateTime: issueDateTime || undefined,
      serviceType: serviceType,
      description: `NFS-e extraída com IA - ${parsedData.numero || 'Sem número'} - Cliente: ${parsedData.cliente || 'Cliente não identificado'} - Tipo: ${serviceType === 'fisioterapia' ? 'Fisioterapia' : 'Estética'}${parsedData.discriminacaoServicos ? ` - ${parsedData.discriminacaoServicos.substring(0, 100)}...` : ''}`,
      confidence: confidence,
      extractionMethod: 'GPT-4o Vision (OpenAI) - Dados do Tomador + Discriminação de Serviços',
      cnpj: parsedData.cnpj || undefined,
      competencia: parsedData.competencia || undefined,
      additionalInfo: {
        totalPages: images.length,
        textLength: aiResponse.length,
        foundFields: parsedData.camposEncontrados || [],
        aiResponse: parsedData,
        processingTime: processingTime,
        apiCost: images.length * 0.00765 // Custo atualizado para GPT-4o: $0.00765 por imagem de alta resolução
      }
    };

    console.log('✅ Extração com IA concluída (dados do tomador + discriminação de serviços):', extractedData);
    return extractedData;

  } catch (error) {
    console.error('❌ Erro na extração com IA:', error);
    throw error;
  }
};

// Função de fallback simples (sem OCR complexo)
const extractWithFallback = async (file: File): Promise<ExtractedInvoiceData> => {
  console.log('🔄 Usando método de fallback...');
  
  const fileName = file.name.replace('.pdf', '').replace(/[_-]/g, ' ');
  
  // Gerar dados básicos baseados no nome do arquivo
  const numberMatch = fileName.match(/(\d+)/);
  const number = numberMatch ? numberMatch[1].padStart(6, '0') : Date.now().toString().slice(-6);
  
  // Tentar extrair data do nome do arquivo
  const dateMatch = fileName.match(/(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{2}[-\/]\d{2}[-\/]\d{4})/);
  let issueDate = new Date().toISOString().split('T')[0];
  let issueDateTime = '';
  
  if (dateMatch) {
    try {
      const dateStr = dateMatch[1];
      const parts = dateStr.split(/[-\/]/);
      let date: Date;
      
      if (parts[0].length === 4) {
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      
      if (!isNaN(date.getTime())) {
        issueDate = date.toISOString().split('T')[0];
        issueDateTime = date.toLocaleDateString('pt-BR');
      }
    } catch (error) {
      console.warn('Erro ao processar data do nome do arquivo:', error);
    }
  }

  // Cliente genérico (tomador de serviços)
  const clientTypes = ['Empresa', 'Cliente', 'Companhia', 'Serviços'];
  const randomType = clientTypes[Math.floor(Math.random() * clientTypes.length)];
  const randomNumber = Math.floor(Math.random() * 999) + 1;
  const client = `${randomType} ${randomNumber.toString().padStart(3, '0')} (Tomador)`;

  // Valor baseado no tamanho do arquivo
  const fileSize = file.size;
  const baseValue = Math.max(100, Math.min(10000, fileSize / 1000));
  const value = Math.round((baseValue + Math.random() * baseValue) * 100) / 100;

  // Tentar deduzir tipo de serviço pelo nome do arquivo
  let serviceType: 'fisioterapia' | 'estetica' = 'fisioterapia';
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.includes('estetica') || lowerFileName.includes('beleza') || lowerFileName.includes('peeling') || lowerFileName.includes('limpeza')) {
    serviceType = 'estetica';
  }

  return {
    number: `NF-${number}`,
    client: client,
    value: value,
    issueDate: issueDate,
    issueDateTime: issueDateTime || undefined,
    serviceType: serviceType,
    description: `Nota fiscal ${number} - ${client} - Valor: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Tipo: ${serviceType === 'fisioterapia' ? 'Fisioterapia' : 'Estética'} (Dados estimados do tomador)`,
    confidence: 'low',
    extractionMethod: 'Fallback - Nome do arquivo + estimativas (tomador + tipo)',
    additionalInfo: {
      totalPages: 1,
      textLength: 0,
      foundFields: ['Número (estimado)', 'Cliente/Tomador (estimado)', 'Valor (estimado)', 'Tipo de Serviço (estimado)'],
      processingTime: 50
    }
  };
};

// Função principal para extrair dados do PDF
const extractInvoiceDataFromPDF = async (file: File): Promise<ExtractedInvoiceData> => {
  console.log('🚀 Iniciando extração inteligente de PDF (foco no tomador + discriminação de serviços):', file.name);

  // Verificar se temos chave da OpenAI
  const apiKey = getStoredOpenAIKey();
  
  if (apiKey && apiKey.trim().length > 0) {
    try {
      console.log('🤖 Tentando extração com GPT-4o Vision (dados do tomador + discriminação de serviços)...');
      return await extractWithOpenAIVision(file, apiKey.trim());
    } catch (error) {
      console.warn('⚠️ Falha na extração com IA:', error);
      console.log('🔄 Usando método de fallback...');
      
      // Se a API falhar, usar fallback
      const fallbackData = await extractWithFallback(file);
      fallbackData.extractionMethod = 'Fallback - Erro na API OpenAI (tomador + tipo)';
      return fallbackData;
    }
  } else {
    console.log('🔑 Chave da OpenAI não configurada, usando fallback');
    const fallbackData = await extractWithFallback(file);
    fallbackData.extractionMethod = 'Fallback - API OpenAI não configurada (tomador + tipo)';
    return fallbackData;
  }
};

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { activeCompany } = useCompanies();

  // Função para obter a chave do localStorage baseada na empresa ativa
  const getStorageKey = () => {
    const companyId = activeCompany?.id || 'legacy-company';
    return `invoiceData_${companyId}`;
  };

  // Carregar dados do localStorage na inicialização ou quando empresa mudar
  useEffect(() => {
    const loadInvoiceData = () => {
      try {
        const storageKey = getStorageKey();
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
          const parsed = JSON.parse(savedData);
          // Migração: adicionar serviceType e verified para dados antigos
          const migratedData = parsed.map((invoice: any) => ({
            ...invoice,
            serviceType: invoice.serviceType || 'fisioterapia', // padrão para dados antigos
            verified: invoice.verified !== undefined ? invoice.verified : false // padrão para dados antigos
          }));
          setInvoices(migratedData);
          console.log('✅ InvoiceProvider - Dados carregados:', { storageKey, count: migratedData.length });
        } else {
          // Tentar migrar dados da versão anterior (global)
          const legacyData = localStorage.getItem('invoiceData');
          if (legacyData && (!activeCompany || activeCompany.id === 'legacy-company')) {
            try {
              const parsed = JSON.parse(legacyData);
              const migratedData = parsed.map((invoice: any) => ({
                ...invoice,
                serviceType: invoice.serviceType || 'fisioterapia',
                verified: invoice.verified !== undefined ? invoice.verified : false
              }));
              setInvoices(migratedData);
              // Salvar no novo formato
              localStorage.setItem(storageKey, JSON.stringify(migratedData));
              console.log('✅ InvoiceProvider - Dados migrados de versão anterior');
            } catch (error) {
              console.error('Erro ao migrar dados legacy:', error);
              setInvoices([]);
            }
          } else {
            // Nova empresa, começar com dados vazios
            console.log('📝 InvoiceProvider - Nova empresa, iniciando com dados vazios');
            setInvoices([]);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados de nota fiscal:', error);
        setInvoices([]);
      }
    };

    loadInvoiceData();
  }, [activeCompany?.id]);

  // Salvar dados no localStorage sempre que invoices mudar
  useEffect(() => {
    if (activeCompany) {
      try {
        const storageKey = getStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(invoices));
        console.log('💾 InvoiceProvider - Dados salvos:', { storageKey, count: invoices.length, invoices: invoices.map(inv => ({ id: inv.id, number: inv.number, client: inv.client })) });
      } catch (error) {
        console.error('❌ Erro ao salvar dados de nota fiscal:', error);
      }
    }
  }, [invoices, activeCompany?.id]);

  const getInvoicesForMonth = (month: string): Invoice[] => {
    const filtered = invoices.filter(invoice => invoice.month === month);
    console.log('🔍 getInvoicesForMonth:', { month, totalInvoices: invoices.length, filtered: filtered.length });
    return filtered;
  };

  const getInvoiceStats = (month: string): InvoiceStats => {
    const monthInvoices = getInvoicesForMonth(month);
    
    const totalInvoices = monthInvoices.length;
    const totalValue = monthInvoices.reduce((sum, invoice) => sum + invoice.value, 0);
    const pendingInvoices = monthInvoices.filter(inv => inv.status === 'pending').length;
    const paidInvoices = monthInvoices.filter(inv => inv.status === 'paid').length;
    const overdueInvoices = monthInvoices.filter(inv => inv.status === 'overdue').length;
    const verifiedInvoices = monthInvoices.filter(inv => inv.verified).length;
    const verifiedPercentage = totalInvoices > 0 ? Math.round((verifiedInvoices / totalInvoices) * 100) : 0;
    const averageValue = totalInvoices > 0 ? totalValue / totalInvoices : 0;
    const fisioterapiaCount = monthInvoices.filter(inv => inv.serviceType === 'fisioterapia').length;
    const esteticaCount = monthInvoices.filter(inv => inv.serviceType === 'estetica').length;

    return {
      totalInvoices,
      totalValue,
      pendingInvoices,
      paidInvoices,
      overdueInvoices,
      verifiedInvoices,
      verifiedPercentage,
      averageValue,
      fisioterapiaCount,
      esteticaCount
    };
  };

  const getInvoiceStatsWithComparison = (month: string): InvoiceStatsWithComparison => {
    const currentStats = getInvoiceStats(month);
    const previousMonth = getPreviousMonth(month);
    const previousStats = getInvoiceStats(previousMonth);
    
    const comparison = {
      totalInvoicesChange: calculatePercentageChange(currentStats.totalInvoices, previousStats.totalInvoices),
      totalValueChange: calculatePercentageChange(currentStats.totalValue, previousStats.totalValue),
      verifiedPercentageChange: calculatePercentageChange(currentStats.verifiedPercentage, previousStats.verifiedPercentage),
      averageValueChange: calculatePercentageChange(currentStats.averageValue, previousStats.averageValue)
    };

    return {
      ...currentStats,
      previousMonth: {
        totalInvoices: previousStats.totalInvoices,
        totalValue: previousStats.totalValue,
        verifiedPercentage: previousStats.verifiedPercentage,
        averageValue: previousStats.averageValue
      },
      comparison
    };
  };

  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newInvoice: Invoice = {
      ...invoiceData,
      verified: invoiceData.verified !== undefined ? invoiceData.verified : false, // Garantir que verified sempre existe
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };

    console.log('➕ addInvoice - Adicionando nova nota fiscal:', {
      id: newInvoice.id,
      number: newInvoice.number,
      client: newInvoice.client,
      value: newInvoice.value,
      month: newInvoice.month,
      serviceType: newInvoice.serviceType,
      verified: newInvoice.verified,
      issueDateTime: newInvoice.issueDateTime,
      company: activeCompany?.name || 'Não identificada'
    });

    setInvoices(prev => {
      const updated = [...prev, newInvoice];
      console.log('📊 addInvoice - Lista atualizada:', { 
        antes: prev.length, 
        depois: updated.length,
        nova: { 
          id: newInvoice.id,
          number: newInvoice.number,
          client: newInvoice.client,
          month: newInvoice.month,
          serviceType: newInvoice.serviceType,
          verified: newInvoice.verified
        }
      });
      return updated;
    });
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    console.log('✏️ updateInvoice - Atualizando nota fiscal:', { id, updates });
    setInvoices(prev => prev.map(invoice => 
      invoice.id === id 
        ? { ...invoice, ...updates, updatedAt: new Date().toISOString() }
        : invoice
    ));
  };

  const deleteInvoice = (id: string) => {
    console.log('🗑️ deleteInvoice - Removendo nota fiscal:', { id });
    setInvoices(prev => prev.filter(invoice => invoice.id !== id));
  };

  const getOpenAIKey = (): string | null => {
    return getStoredOpenAIKey();
  };

  const setOpenAIKey = (key: string): void => {
    storeOpenAIKey(key);
  };

  return (
    <InvoiceContext.Provider value={{
      invoices,
      getInvoicesForMonth,
      getInvoiceStats,
      getInvoiceStatsWithComparison,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      extractInvoiceDataFromPDF,
      getOpenAIKey,
      setOpenAIKey,
      isLoading
    }}>
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoiceData() {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error('useInvoiceData must be used within an InvoiceProvider');
  }
  return context;
}