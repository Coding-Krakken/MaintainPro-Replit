import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useQRScanner, useQRInput } from '../../hooks/useQRScanner';
import { Camera, X, Keyboard } from 'lucide-react';
import { useState } from 'react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  
  const { isScanning, hasPermission, videoRef, startScanning, stopScanning } = useQRScanner({
    onScan: (result) => {
      onScan(result.text);
    },
    onError: (error) => {
      console.error('QR Scanner error:', error);
      setMode('manual'); // Fallback to manual input
    },
  });

  const { input, isValid, handleInputChange, clear } = useQRInput();

  const handleClose = () => {
    stopScanning();
    clear();
    onClose();
  };

  const handleManualSubmit = () => {
    if (isValid) {
      onScan(input);
    }
  };

  const startCameraScanning = async () => {
    setMode('camera');
    await startScanning();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Scan QR Code</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex space-x-2">
            <Button
              variant={mode === 'camera' ? 'default' : 'outline'}
              onClick={startCameraScanning}
              className="flex-1 flex items-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              onClick={() => setMode('manual')}
              className="flex-1 flex items-center space-x-2"
            >
              <Keyboard className="w-4 h-4" />
              <span>Manual</span>
            </Button>
          </div>

          {/* Camera Mode */}
          {mode === 'camera' && (
            <div className="space-y-4">
              {hasPermission === false && (
                <div className="text-center py-8">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-4">
                    Camera access is required to scan QR codes
                  </p>
                  <Button onClick={startCameraScanning}>
                    Grant Camera Permission
                  </Button>
                </div>
              )}

              {hasPermission === true && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-64 bg-black rounded-lg object-cover"
                    autoPlay
                    playsInline
                  />
                  
                  {/* Viewfinder Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-primary-500 rounded-lg shadow-lg">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500"></div>
                    </div>
                  </div>

                  {isScanning && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-sm">
                        Position QR code within the frame
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isScanning && (
                <div className="text-center">
                  <Button onClick={stopScanning} variant="outline">
                    Stop Scanning
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Manual Input Mode */}
          {mode === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Asset Tag
                </label>
                <Input
                  placeholder="e.g., UAS-001"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className={isValid ? 'border-green-500' : ''}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the equipment asset tag manually
                </p>
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={clear}
                  variant="outline" 
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button 
                  onClick={handleManualSubmit}
                  disabled={!isValid}
                  className="flex-1"
                >
                  Submit
                </Button>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Point your camera at a QR code or enter the asset tag manually
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
