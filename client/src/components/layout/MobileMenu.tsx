import { X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Settings, 
  Package, 
  Users, 
  Clock, 
  BarChart3,
  Wrench
} from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: location === '/' || location === '/dashboard',
    },
    {
      name: 'Work Orders',
      href: '/work-orders',
      icon: ClipboardList,
      active: location.startsWith('/work-orders'),
    },
    {
      name: 'Equipment',
      href: '/equipment',
      icon: Settings,
      active: location.startsWith('/equipment'),
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: Package,
      active: location.startsWith('/inventory'),
    },
    {
      name: 'Preventive Maintenance',
      href: '/preventive',
      icon: Clock,
      active: location.startsWith('/preventive'),
    },
    {
      name: 'Vendors',
      href: '/vendors',
      icon: Users,
      active: location.startsWith('/vendors'),
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: BarChart3,
      active: location.startsWith('/reports'),
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 transform transition-transform duration-300">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">MaintAInPro</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-6 h-6" />
            </Button>
          </div>
          
          {/* User Profile Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-semibold text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <a
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                    item.active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </a>
              </Link>
            ))}
          </nav>
          
          {/* Settings */}
          <div className="p-4 border-t border-gray-200">
            <Link href="/settings">
              <a 
                onClick={onClose}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
