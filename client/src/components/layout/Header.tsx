import { useState } from 'react';
import { Menu, Search, Bell, QrCode, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface HeaderProps {
  onMobileMenuToggle: () => void;
  showMobileMenuButton: boolean;
}

export default function Header({ onMobileMenuToggle, showMobileMenuButton }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications', {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'default-user-id',
          'x-warehouse-id': localStorage.getItem('warehouseId') || 'default-warehouse-id',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Search:', searchQuery);
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        {/* Mobile menu button */}
        {showMobileMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="lg:hidden"
            data-testid="mobile-menu-button"
          >
            <Menu className="w-6 h-6" />
          </Button>
        )}
        
        {/* Search Bar */}
        <div className="hidden sm:block flex-1 max-w-md mx-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search work orders, equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </form>
        </div>
        
        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* QR Scanner Button (Mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => {
              // Implement QR scanner
              console.log('Open QR scanner');
            }}
          >
            <QrCode className="w-6 h-6" />
          </Button>
          
          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="icon">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full p-0 flex items-center justify-center"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </div>
          
          {/* User Menu */}
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2"
                  data-testid="user-menu-button"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-semibold text-sm">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <span data-testid="user-name" className="hidden sm:inline">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <span className="text-sm text-gray-700">
                    {user?.email}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
