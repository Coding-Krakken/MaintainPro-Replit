import { useState, useRef, useCallback } from 'react';
import { QRScanResult } from '../types';

interface UseQRScannerOptions {
  onScan: (result: QRScanResult) => void;
  onError?: (error: Error) => void;
}

export function useQRScanner({ onScan, onError }: UseQRScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScanning = useCallback(async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setHasPermission(true);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsScanning(true);

      // In a real implementation, you would use a QR code library like @zxing/library
      // For this demo, we'll simulate QR code detection
      simulateQRDetection();

    } catch (error) {
      setHasPermission(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
      onError?.(new Error(errorMessage));
    }
  }, [onError]);

  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }, []);

  const simulateQRDetection = () => {
    // Simulate QR code detection after 3 seconds
    setTimeout(() => {
      if (isScanning) {
        const mockResult: QRScanResult = {
          text: 'UAS-001',
          format: 'QR_CODE',
        };
        onScan(mockResult);
        stopScanning();
      }
    }, 3000);
  };

  // Real QR code detection would look something like this:
  // const detectQRCode = useCallback(async () => {
  //   if (!videoRef.current || !isScanning) return;
  //   
  //   try {
  //     const codeReader = new BrowserQRCodeReader();
  //     const result = await codeReader.decodeFromVideoDevice(undefined, videoRef.current);
  //     
  //     if (result) {
  //       onScan({
  //         text: result.getText(),
  //         format: result.getBarcodeFormat().toString(),
  //       });
  //       stopScanning();
  //     }
  //   } catch (error) {
  //     // Continue scanning if no QR code found
  //     if (isScanning) {
  //       setTimeout(detectQRCode, 100);
  //     }
  //   }
  // }, [isScanning, onScan]);

  return {
    isScanning,
    hasPermission,
    videoRef,
    startScanning,
    stopScanning,
  };
}

// Hook for manual QR code input as fallback
export function useQRInput() {
  const [input, setInput] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validateInput = useCallback((value: string) => {
    // Basic validation for asset tags (alphanumeric, 3-20 characters)
    const assetTagPattern = /^[A-Z0-9\-]{3,20}$/i;
    return assetTagPattern.test(value);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setIsValid(validateInput(value));
  }, [validateInput]);

  const clear = useCallback(() => {
    setInput('');
    setIsValid(false);
  }, []);

  return {
    input,
    isValid,
    handleInputChange,
    clear,
  };
}
