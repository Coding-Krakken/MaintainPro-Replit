import { QrCode, ClipboardList, Package } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useState } from 'react';
import QRScanner from '../qr/QRScanner';
import WorkOrderModal from '../work-orders/WorkOrderModal';
import { useLocation } from 'wouter';

export default function QuickActions() {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [, setLocation] = useLocation();

  const handleQRScan = (result: string) => {
    setShowQRScanner(false);
    // Navigate to equipment detail or create work order with scanned asset
    setLocation(`/equipment?asset=${result}`);
  };

  return (
    <>
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => setShowQRScanner(true)}
            className="w-full flex items-center justify-center space-x-3 bg-primary-50 text-primary-700 hover:bg-primary-100 border-0"
            variant="outline"
          >
            <QrCode className="w-5 h-5" />
            <span className="font-medium">Scan QR Code</span>
          </Button>
          
          <Button
            onClick={() => setShowWorkOrderModal(true)}
            className="w-full flex items-center justify-center space-x-3"
            variant="outline"
          >
            <ClipboardList className="w-5 h-5" />
            <span className="font-medium">Create Work Order</span>
          </Button>
          
          <Button
            onClick={() => setLocation('/inventory')}
            className="w-full flex items-center justify-center space-x-3"
            variant="outline"
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">Check Inventory</span>
          </Button>
        </CardContent>
      </Card>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
        />
      )}

      {/* Work Order Creation Modal */}
      {showWorkOrderModal && (
        <WorkOrderModal
          isOpen={showWorkOrderModal}
          onClose={() => setShowWorkOrderModal(false)}
        />
      )}
    </>
  );
}
