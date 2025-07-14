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
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar() {
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

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-white lg:border-r lg:border-gray-200">
      <div className="flex flex-col h-full">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">MaintAInPro</h1>
            <p className="text-xs text-gray-500">Enterprise CMMS</p>
          </div>
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
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => (
            <Link key={item.name} href={item.href}>
              <a
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
            <a className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
