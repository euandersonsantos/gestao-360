import { useState } from 'react';
import { Button } from './ui/button';
import { Settings, Plus, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useFinancialData, usePaymentContext } from '../hooks/useFinancialData';
import { useCompanySettings } from '../hooks/useCompanySettings';

interface MailroomProps {
  selectedMonth: string;
}

type DetailType = 'faturamento' | 'proLabore' | 'lucro' | 'outrasDescpesas' | 'inss' | 'das' | 'contabilidade';

export function Mailroom({ selectedMonth }: MailroomProps) {
  const { getMonthlyData } = useFinancialData();
  const { getPaymentTransactionsForMonth } = usePaymentContext();
  const { settings: companySettings } = useCompanySettings();
  const monthlyData = getMonthlyData(selectedMonth);
  const paymentTransactions = getPaymentTransactionsForMonth(selectedMonth);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<DetailType | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar valores mostrando "-" quando zerado
  const formatValueOrDash = (value: number) => {
    if (value === 0) {
      return "-";
    }
    return formatCurrency(value);
  };

  const handleAddEntry = () => {
    console.log('Adicionar novo lançamento');
  };

  const handleSettings = () => {
    console.log('Abrir configurações');
  };

  const handleShowDetails = (type: DetailType) => {
    setSelectedDetail(type);
    setIsDetailModalOpen(true);
  };

  // Calcular DAS e INSS que serão GERADOS no mês atual (baseados no faturamento e pró-labore do mês atual)
  const dasGeradoMesAtual = companySettings && monthlyData.faturamentoTotal > 0
    ? monthlyData.faturamentoTotal * companySettings.taxSettings.dasAliquota
    : 0;

  const inssGeradoMesAtual = companySettings && monthlyData.proLaboreTotal > 0
    ? monthlyData.proLaboreTotal * companySettings.taxSettings.inssPercentual
    : 0;

  // Calcular valor real das "Outras despesas" da gestão de pagamentos
  const outrasDescpesasReal = paymentTransactions
    .filter(transaction => 
      transaction.type === 'saida' && 
      transaction.category === 'Outras despesas' &&
      transaction.completed // Considerar apenas transações completadas
    )
    .reduce((total, transaction) => total + transaction.value, 0);

  // Dados consolidados para exibição na tabela
  const financialSummary = {
    id: '1',
    faturamento: monthlyData.faturamentoTotal,
    proLabore: monthlyData.proLaboreTotal,
    lucroDisponivel: monthlyData.lucroTotal,
    outrasDescpesas: outrasDescpesasReal, // Usando valor real da gestão de pagamentos
    inss: inssGeradoMesAtual, // INSS gerado no mês atual (será pago no próximo)
    das: dasGeradoMesAtual,   // DAS gerado no mês atual (será pago no próximo)
    taxaContabil: monthlyData.contabilidadeTotal
  };

  // Função para obter o próximo mês
  const getNextMonth = (currentMonth: string): string => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const [monthName, year] = currentMonth.split(' ');
    const currentMonthIndex = months.indexOf(monthName);
    
    if (currentMonthIndex === 11) {
      return `Janeiro ${parseInt(year) + 1}`;
    } else {
      return `${months[currentMonthIndex + 1]} ${year}`;
    }
  };

  const nextMonth = getNextMonth(selectedMonth);

  // Contar quantas transações de "Outras despesas" estão completadas
  const outrasDescpesasCompletedCount = paymentTransactions
    .filter(transaction => 
      transaction.type === 'saida' && 
      transaction.category === 'Outras despesas' &&
      transaction.completed
    ).length;

  // Obter transações de entrada completadas
  const entradasCompletadas = paymentTransactions.filter(t => 
    t.type === 'entrada' && t.completed
  );

  // Obter transações de outras despesas completadas
  const outrasDescpesasTransacoes = paymentTransactions.filter(t => 
    t.type === 'saida' && t.category === 'Outras despesas' && t.completed
  );

  // Função para renderizar conteúdo do modal de detalhes
  const renderDetailContent = () => {
    if (!selectedDetail) return null;

    switch (selectedDetail) {
      case 'faturamento':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              O faturamento total é calculado com base nas transações de entrada marcadas como realizadas na gestão de pagamentos.
            </p>
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Transações incluídas:</h4>
              {entradasCompletadas.length > 0 ? (
                <div className="space-y-2">
                  {entradasCompletadas.map((transacao, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-blue-800">{transacao.label}</span>
                      <span className="font-medium text-blue-900">{formatCurrency(transacao.value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-blue-900">
                      <span>Total:</span>
                      <span>{formatCurrency(financialSummary.faturamento)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-amber-600 text-sm">Nenhuma transação de entrada realizada</p>
              )}
            </div>
          </div>
        );

      case 'proLabore':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              O pró-labore é calculado automaticamente com base no faturamento e na taxa configurada da empresa.
            </p>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Cálculo:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-800">Faturamento:</span>
                  <span className="font-medium">{formatCurrency(financialSummary.faturamento)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-800">Taxa de pró-labore:</span>
                  <span className="font-medium">
                    {companySettings ? (companySettings.taxSettings.proLaborePercentual * 100).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="border-t border-green-200 pt-2">
                  <div className="flex justify-between font-semibold text-green-900">
                    <span>Pró-labore calculado:</span>
                    <span>{formatCurrency(financialSummary.proLabore)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'lucro':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              A retirada de lucros é baseada nos dados mockados do sistema.
            </p>
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">Valor:</h4>
              <div className="text-sm">
                <div className="flex justify-between font-semibold text-purple-900">
                  <span>Lucro disponível:</span>
                  <span>{formatCurrency(financialSummary.lucroDisponivel)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'outrasDescpesas':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Outras despesas são calculadas com base nas transações de saída com categoria "Outras despesas" marcadas como realizadas.
            </p>
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-medium text-orange-900 mb-2">Transações incluídas:</h4>
              {outrasDescpesasTransacoes.length > 0 ? (
                <div className="space-y-2">
                  {outrasDescpesasTransacoes.map((transacao, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-orange-800">{transacao.label}</span>
                      <span className="font-medium text-orange-900">{formatCurrency(transacao.value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-orange-200 pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-orange-900">
                      <span>Total:</span>
                      <span>{formatCurrency(financialSummary.outrasDescpesas)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-amber-600 text-sm">Nenhuma transação de outras despesas realizada</p>
              )}
            </div>
          </div>
        );

      case 'inss':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              O INSS é calculado com base no pró-labore do mês atual e será pago no próximo mês.
            </p>
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">Cálculo:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-red-800">Pró-labore de {selectedMonth}:</span>
                  <span className="font-medium">{formatCurrency(financialSummary.proLabore)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-800">Taxa INSS:</span>
                  <span className="font-medium">
                    {companySettings ? (companySettings.taxSettings.inssPercentual * 100).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="border-t border-red-200 pt-2">
                  <div className="flex justify-between font-semibold text-red-900">
                    <span>INSS a pagar em {nextMonth}:</span>
                    <span>{formatCurrency(financialSummary.inss)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'das':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              O DAS é calculado com base no faturamento do mês atual e será pago no próximo mês.
            </p>
            <div className="bg-red-50 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">Cálculo:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-red-800">Faturamento de {selectedMonth}:</span>
                  <span className="font-medium">{formatCurrency(financialSummary.faturamento)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-800">Alíquota DAS:</span>
                  <span className="font-medium">
                    {companySettings ? (companySettings.taxSettings.dasAliquota * 100).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="border-t border-red-200 pt-2">
                  <div className="flex justify-between font-semibold text-red-900">
                    <span>DAS a pagar em {nextMonth}:</span>
                    <span>{formatCurrency(financialSummary.das)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'contabilidade':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              A taxa de contabilidade é um valor fixo mensal configurado na gestão de pagamentos.
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Valor fixo mensal:</h4>
              <div className="text-sm">
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>Contabilidade:</span>
                  <span>{formatCurrency(financialSummary.taxaContabil)}</span>
                </div>
                <p className="text-gray-600 text-xs mt-2">
                  Este valor pode ser editado na gestão de pagamentos
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getDetailTitle = () => {
    switch (selectedDetail) {
      case 'faturamento': return 'Detalhes do Faturamento';
      case 'proLabore': return 'Detalhes do Pró-labore';
      case 'lucro': return 'Detalhes da Retirada de Lucros';
      case 'outrasDescpesas': return 'Detalhes das Outras Despesas';
      case 'inss': return 'Detalhes do INSS';
      case 'das': return 'Detalhes do DAS';
      case 'contabilidade': return 'Detalhes da Contabilidade';
      default: return 'Detalhes';
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header moderno */}
        <div className="flex items-center justify-between px-6 py-5 bg-gray-50/50 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Calculadora</h2>
            <p className="text-sm text-gray-600 mt-0.5">{selectedMonth}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-9 h-9 p-0 hover:bg-gray-100 rounded-lg"
            onClick={handleSettings}
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </Button>
        </div>

        {/* Tabela moderna */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {/* Linha de agrupamento */}
              <tr className="bg-gray-50">
                <th className="py-3 px-6"></th>
                <th className="py-3 px-4 text-center text-gray-700 text-xs font-medium uppercase tracking-wide border-r border-gray-200" colSpan={3}>
                  Referente a {selectedMonth}
                </th>
                <th className="py-3 px-4 text-center text-gray-700 text-xs font-medium uppercase tracking-wide" colSpan={3}>
                  Vai ser pago em {nextMonth}
                </th>
              </tr>
              {/* Linha de colunas individuais */}
              <tr className="border-b border-gray-100">
                <th className="text-left py-4 px-6 font-medium text-gray-800 bg-white border-r border-gray-100">Faturamento</th>
                <th className="text-center py-4 px-4 font-medium text-gray-700 text-sm bg-gray-50/30 border-r border-gray-100">Pró-labore</th>
                <th className="text-center py-4 px-4 font-medium text-gray-700 text-sm bg-gray-50/30 border-r border-gray-100">Retirada de lucros</th>
                <th className="text-center py-4 px-4 font-medium text-gray-700 text-sm bg-gray-50/30 border-r border-gray-100">Outras despesas</th>
                <th className="text-center py-4 px-4 font-medium text-gray-700 text-sm bg-gray-50/30 border-r border-gray-100">INSS</th>
                <th className="text-center py-4 px-4 font-medium text-gray-700 text-sm bg-gray-50/30 border-r border-gray-100">DAS</th>
                <th className="text-center py-4 px-4 font-medium text-gray-700 text-sm bg-gray-50/30">Contabilidade</th>
              </tr>
            </thead>
            <tbody>
              <tr className="group hover:bg-blue-50/30 transition-all duration-200">
                <td className="py-5 px-6 border-r border-gray-100 bg-white">
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${financialSummary.faturamento === 0 ? "text-gray-400" : "text-gray-900"}`}>
                      {formatValueOrDash(financialSummary.faturamento)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded-md transition-all duration-200"
                      onClick={() => handleShowDetails('faturamento')}
                    >
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                  </div>
                </td>
                <td className="py-5 px-4 text-center border-r border-gray-100">
                  <div className="flex items-center justify-center gap-3">
                    <span className={`font-medium ${financialSummary.proLabore === 0 ? "text-gray-400" : "text-gray-800"}`}>
                      {formatValueOrDash(financialSummary.proLabore)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded-md transition-all duration-200"
                      onClick={() => handleShowDetails('proLabore')}
                    >
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                  </div>
                </td>
                <td className="py-5 px-4 text-center border-r border-gray-100">
                  <div className="flex items-center justify-center gap-3">
                    <span className={`font-medium ${financialSummary.lucroDisponivel === 0 ? "text-gray-400" : "text-gray-800"}`}>
                      {formatValueOrDash(financialSummary.lucroDisponivel)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded-md transition-all duration-200"
                      onClick={() => handleShowDetails('lucro')}
                    >
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                  </div>
                </td>
                <td className="py-5 px-4 text-center border-r border-gray-100">
                  <div className="flex items-center justify-center gap-3">
                    <span className={`font-medium ${financialSummary.outrasDescpesas === 0 ? "text-gray-400" : "text-gray-800"}`}>
                      {formatValueOrDash(financialSummary.outrasDescpesas)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded-md transition-all duration-200"
                      onClick={() => handleShowDetails('outrasDescpesas')}
                    >
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                  </div>
                </td>
                <td className="py-5 px-4 text-center border-r border-gray-100">
                  <div className="flex items-center justify-center gap-3">
                    <span className={`font-medium ${financialSummary.inss === 0 ? "text-gray-400" : "text-gray-800"}`}>
                      {formatValueOrDash(financialSummary.inss)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded-md transition-all duration-200"
                      onClick={() => handleShowDetails('inss')}
                    >
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                  </div>
                </td>
                <td className="py-5 px-4 text-center border-r border-gray-100">
                  <div className="flex items-center justify-center gap-3">
                    <span className={`font-medium ${financialSummary.das === 0 ? "text-gray-400" : "text-gray-800"}`}>
                      {formatValueOrDash(financialSummary.das)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded-md transition-all duration-200"
                      onClick={() => handleShowDetails('das')}
                    >
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                  </div>
                </td>
                <td className="py-5 px-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <span className={`font-medium ${financialSummary.taxaContabil === 0 ? "text-gray-400" : "text-gray-800"}`}>
                      {formatValueOrDash(financialSummary.taxaContabil)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded-md transition-all duration-200"
                      onClick={() => handleShowDetails('contabilidade')}
                    >
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{getDetailTitle()}</DialogTitle>
            <DialogDescription className="text-gray-600">
              Veja como este valor foi calculado e quais dados foram utilizados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {renderDetailContent()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}