import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { CompanySelector } from './CompanySelector';

interface ControlBarProps {
  onMonthChange: (month: string) => void;
  initialMonth?: string;
}

export function ControlBar({ onMonthChange, initialMonth }: ControlBarProps) {
  // Estado para o mês e ano atual
  const [currentDate, setCurrentDate] = useState(new Date(2025, 5)); // Junho 2025 (mês 5 = junho)

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatDate = (date: Date) => {
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  // Função para converter string de mês para Date
  const parseMonthString = (monthString: string): Date => {
    const [monthName, year] = monthString.split(' ');
    const monthIndex = monthNames.indexOf(monthName);
    return new Date(parseInt(year), monthIndex);
  };

  // Efeito para definir o mês inicial quando fornecido
  useEffect(() => {
    if (initialMonth) {
      const initialDate = parseMonthString(initialMonth);
      setCurrentDate(initialDate);
      console.log('Mês inicial definido para:', formatDate(initialDate));
    }
  }, [initialMonth]);

  // Efeito para notificar mudanças de mês
  useEffect(() => {
    onMonthChange(formatDate(currentDate));
  }, [currentDate, onMonthChange]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    
    setCurrentDate(newDate);
    console.log('Mês alterado para:', formatDate(newDate));
  };

  const goToCurrentMonth = () => {
    const currentMonth = new Date();
    setCurrentDate(currentMonth);
    console.log('Voltou para o mês atual:', formatDate(currentMonth));
  };

  return (
    <div className="px-6 py-4" style={{ backgroundColor: 'transparent' }}>
      <div className="flex items-center justify-start gap-2">
        {/* Seletor de Empresa */}
        <div className="bg-white rounded-full px-4 py-2 border-0 h-10 flex items-center shadow-sm px-[14px] py-[7px] w-fit">
          <CompanySelector />
        </div>
        
        {/* Navegação de Mês */}
        <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 border-0 h-10 shadow-sm px-[14px] py-[8px]">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-8 w-8 hover:bg-gray-100 transition-colors border-0"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </Button>
          
          <div className="text-center">
            <span 
              className="text-gray-700 cursor-pointer hover:text-gray-900 transition-colors"
              onClick={goToCurrentMonth}
              title="Clique para voltar ao mês atual"
            >
              {formatDate(currentDate)}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-8 w-8 hover:bg-gray-100 transition-colors border-0"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </Button>
        </div>
      </div>
    </div>
  );
}