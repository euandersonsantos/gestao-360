import { useState } from 'react';
import { Search, Bell, Settings, Users, FileText, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';

export function Header() {
  const handleSearch = () => {
    console.log('Pesquisar');
  };

  const handleSettings = () => {
    console.log('Configurações');
  };

  return (
    <header className="border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Título */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl text-gray-900 font-semibold">
              Gestão empresarial
            </h1>
          </div>

          {/* Ícones e Avatar */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 relative"
              onClick={handleSearch}
            >
              <Search className="w-4 h-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 relative">
                  <Bell className="w-4 h-4" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                    3
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <div className="font-medium">Nova mensagem na Central de Mensagens</div>
                  <div className="text-sm text-gray-500">Notificação do estado recebida há 2 horas</div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <div className="font-medium">Pedido EIN - Ação necessária</div>
                  <div className="text-sm text-gray-500">Resolver problema urgente</div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                  <div className="font-medium">Relatório Anual vencendo</div>
                  <div className="text-sm text-gray-500">Prazo em 15 dias</div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              onClick={handleSettings}
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
                <span className="text-sm">DR</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documentos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2 text-red-600">
                  <LogOut className="w-4 h-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}