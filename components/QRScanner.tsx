"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from './ui/Button';
import { Camera, CameraOff } from 'lucide-react';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = 'qr-code-scanner';

  const startScanning = async () => {
    setCameraError(null);
    setIsScanning(true); // Show the div BEFORE starting scanner

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(qrCodeRegionId);
      }

      const scanner = scannerRef.current;

      await scanner.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 20, // Increased from 10 to scan more frequently
          qrbox: function(viewfinderWidth, viewfinderHeight) {
            // Make the scan box 70% of the camera view (more forgiving)
            let minEdgePercentage = 0.7;
            let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            // Ensure minimum size of 50px (library requirement)
            return {
              width: Math.max(50, qrboxSize),
              height: Math.max(50, qrboxSize)
            };
          },
          aspectRatio: 1.0, // Square aspect ratio
        },
        (decodedText) => {
          // QR code scanned successfully
          onScan(decodedText);
          // Just hide the UI - scanner will clean up on unmount
          setIsScanning(false);
        },
        (errorMessage) => {
          // Scanning error (not a critical error, just means no QR detected in frame)
          // We don't need to show these to the user
        }
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to access camera';
      setCameraError(errorMsg);
      if (onError) onError(errorMsg);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        // Check if scanner is actually running before trying to stop
        const scannerState = scannerRef.current.getState();
        
        if (scannerState === 2) { // Html5QrcodeScannerState.SCANNING
          try {
            await scannerRef.current.stop();
          } catch (stopErr) {
            console.warn('Scanner stop error (ignored):', stopErr);
            // Scanner already stopped or not running - that's fine
          }
        }

        // Try to clear - ignore errors
        try {
          await scannerRef.current.clear();
        } catch (clearErr) {
          console.warn('Scanner clear error (ignored):', clearErr);
          // Ignore clear errors
        }
      }
    } catch (err) {
      console.warn('Scanner cleanup error (ignored):', err);
      // Ignore all scanner cleanup errors
    } finally {
      // Always update UI state no matter what
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        try {
          const scannerState = scannerRef.current.getState();
          if (scannerState === 2) { // Html5QrcodeScannerState.SCANNING
            scannerRef.current.stop().catch((err) => {
              console.warn('Scanner cleanup on unmount error (ignored):', err);
            });
          }
        } catch (err) {
          console.warn('Scanner state check error on unmount (ignored):', err);
        }
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {!isScanning ? (
          <Button onClick={startScanning} type="button" className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Start Camera Scanner
          </Button>
        ) : (
          <Button onClick={stopScanning} type="button" variant="secondary" className="w-full">
            <CameraOff className="w-4 h-4 mr-2" />
            Stop Scanner
          </Button>
        )}
      </div>

      {cameraError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="text-sm font-semibold">Camera Error</p>
          <p className="text-sm">{cameraError}</p>
          <p className="text-xs mt-2">
            Please check camera permissions in your browser settings or use manual entry below.
          </p>
        </div>
      )}

      <div
        id={qrCodeRegionId}
        className={`${
          isScanning
            ? 'border-2 border-blue-500 rounded-lg overflow-hidden'
            : 'hidden'
        }`}
      />
    </div>
  );
}
