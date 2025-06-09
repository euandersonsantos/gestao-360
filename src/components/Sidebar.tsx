import { 
  LayoutDashboard, 
  BarChart3, 
  FileText, 
  Mail, 
  Users, 
  HelpCircle,
  Star,
  Building2,
  Receipt
} from 'lucide-react';
import { useState } from 'react';

interface SidebarItem {
  icon: React.ComponentType<any>;
  label: string;
  id: string;
}

const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Receipt, label: 'Gestão de nota fiscal', id: 'invoices' },
  { icon: BarChart3, label: 'Analytics', id: 'analytics' },
  { icon: FileText, label: 'Documentos', id: 'documents' },
  { icon: Mail, label: 'Mailroom', id: 'mailroom' },
  { icon: Users, label: 'Team', id: 'team' },
  { icon: HelpCircle, label: 'Ajuda', id: 'help' },
];

interface SidebarProps {
  onNavigate: (pageId: string) => void;
  activePage: string;
}

export function Sidebar({ onNavigate, activePage }: SidebarProps) {
  const [activeItem, setActiveItem] = useState(0);

  const handleItemClick = (index: number, pageId: string) => {
    setActiveItem(index);
    onNavigate(pageId);
  };

  return (
    <div className="fixed left-0 top-0 h-full w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 z-50">
      {/* Logo */}
      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-8">
        <Building2 className="w-6 h-6 text-orange-600" />
      </div>
      
      {/* Navigation Items */}
      <div className="flex flex-col gap-2 flex-1">
        {sidebarItems.map((item, index) => {
          const IconComponent = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              key={index}
              onClick={() => handleItemClick(index, item.id)}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group
                ${isActive 
                  ? 'bg-orange-50 text-orange-600 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }
              `}
              title={item.label}
            >
              <IconComponent className="w-5 h-5" />
            </button>
          );
        })}
      </div>
      
      {/* Premium Badge */}
      <div className="mt-auto">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
          <Star className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}