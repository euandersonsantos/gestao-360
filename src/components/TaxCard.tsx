import { Info, ChevronRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { useFinancialData } from '../hooks/useFinancialData';
import { useCompanySettings } from '../hooks/useCompanySettings';

interface TaxCardProps {
  selectedMonth: string;
}

export function TaxCard({ selectedMonth }: TaxCardProps) {
  const { getMonthlyData } = useFinancialData();
  const { settings: companySettings } = useCompanySettings();

  // Função para obter o mês anterior
  const getPreviousMonth = (currentMonth: string) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const [monthName, year] = currentMonth.split(' ');
    const currentMonthIndex = months.indexOf(monthName);
    
    if (currentMonthIndex === 0) {
      return `Dezembro ${parseInt(year) - 1}`;
    } else {
      return `${months[currentMonthIndex - 1]} ${year}`;
    }
  };

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const previousMonth = getPreviousMonth(selectedMonth);
  
  // Buscar dados do mês atual (onde estão os impostos calculados)
  const currentMonthData = getMonthlyData(selectedMonth);
  
  // Buscar dados do mês anterior (para mostrar o faturamento base)
  const previousMonthData = getMonthlyData(previousMonth);

  // Calcular DAS e INSS que serão pagos no mês atual (referentes ao mês anterior)
  const dasValue = currentMonthData.dasCalculado || 0;
  const inssValue = currentMonthData.inssCalculado || 0;
  const totalValue = dasValue + inssValue;

  const handleCardClick = () => {
    console.log('TaxCard clicked - navegando para detalhes dos impostos');
  };

  return (
    <div 
      className="bg-[rgba(255,255,255,1)] rounded-lg p-6 m-[0px] cursor-pointer hover:shadow-sm transition-shadow"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
            <Info className="w-4 h-4 text-orange-600" />
          </div>
          <h3 className="text-gray-800">Impostos a Pagar em {selectedMonth}</h3>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            Total {formatCurrency(totalValue)}
          </Badge>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Verificar se há impostos para mostrar */}
      {totalValue > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 text-sm font-medium">Referente a</th>
                <th className="text-right py-2 text-gray-500 text-sm font-medium">DAS</th>
                <th className="text-right py-2 text-gray-500 text-sm font-medium">INSS</th>
                <th className="text-right py-2 text-gray-500 text-sm font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 last:border-b-0">
                <td className="py-3">
                  <div>
                    <div className="text-gray-800">{previousMonth}</div>
                    <div className="text-sm text-gray-500">
                      Faturamento: {formatCurrency(previousMonthData.faturamentoTotal || 0)}
                    </div>
                  </div>
                </td>
                <td className="py-3 text-right text-gray-700">{formatCurrency(dasValue)}</td>
                <td className="py-3 text-right text-gray-700">{formatCurrency(inssValue)}</td>
                <td className="py-3 text-right text-red-600 font-medium">{formatCurrency(totalValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        // Mensagem quando não há impostos
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <Info className="w-12 h-12 mx-auto opacity-30" />
          </div>
          <p className="text-gray-500 text-sm">
            Nenhum imposto pendente para {selectedMonth}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Os impostos são calculados com base no faturamento do mês anterior
          </p>
        </div>
      )}

      {/* Nota explicativa */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          * Impostos calculados automaticamente com base no faturamento e pró-labore de {previousMonth}
        </p>
        {companySettings && (
          <div className="text-xs text-gray-500 mt-1 space-y-1">
            <div>• DAS: {(companySettings.taxSettings.dasAliquota * 100).toFixed(1)}% sobre o faturamento</div>
            <div>• INSS: {(companySettings.taxSettings.inssPercentual * 100).toFixed(1)}% sobre o pró-labore</div>
          </div>
        )}
      </div>
    </div>
  );
}