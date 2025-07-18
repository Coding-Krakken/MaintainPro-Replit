import { useState } from 'react';
import { useIsMobile } from '../../hooks/use-mobile';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileMenu from './MobileMenu';
import OfflineIndicator from '../OfflineIndicator';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {isMobile && (
        <MobileMenu 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main Content Area */}
      <div className={!isMobile ? "lg:pl-64" : ""}>
        <Header 
          onMobileMenuToggle={() => setMobileMenuOpen(true)} 
          showMobileMenuButton={isMobile}
        />
        
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
      
      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
