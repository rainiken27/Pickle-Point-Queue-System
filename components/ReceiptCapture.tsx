"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { Camera, CameraOff, RotateCcw, Check, Receipt } from 'lucide-react';

interface ReceiptCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onSkip?: () => void;
  onError?: (error: string) => void;
}

export function ReceiptCapture({ onCapture, onSkip, onError }: ReceiptCaptureProps) {
  const [isActive, setIsActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    setIsActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to access camera';
      setCameraError(errorMsg);
      if (onError) onError(errorMsg);
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get the image as data URL (higher quality for receipts)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);

    // Stop the camera after capture
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmReceipt = () => {
    if (!capturedImage) return;
    onCapture(capturedImage);
    setCapturedImage(null);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Show captured image preview
  if (capturedImage) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-green-500 rounded-lg overflow-hidden">
          <img src={capturedImage} alt="Receipt" className="w-full" />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={retake}
            type="button"
            variant="secondary"
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake
          </Button>
          <Button
            onClick={confirmReceipt}
            type="button"
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            Use This Receipt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-5 h-5" />
          <span className="font-semibold">Payment Verification</span>
        </div>
        <p className="text-sm">Take a photo of the customer's receipt (physical or GCash screenshot)</p>
      </div>

      <div className="flex gap-2">
        {!isActive ? (
          <>
            <Button onClick={startCamera} type="button" className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Capture Receipt
            </Button>
            {onSkip && (
              <Button onClick={onSkip} type="button" variant="secondary" className="flex-1">
                Skip Receipt
              </Button>
            )}
          </>
        ) : (
          <div className="flex gap-2 w-full">
            <Button onClick={capturePhoto} type="button" className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
            <Button onClick={stopCamera} type="button" variant="secondary" className="flex-1">
              <CameraOff className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="text-sm font-semibold">Camera Error</p>
          <p className="text-sm">{cameraError}</p>
          <p className="text-xs mt-2">
            Please check camera permissions in your browser settings.
          </p>
        </div>
      )}

      <div className={isActive ? 'block' : 'hidden'}>
        <video
          ref={videoRef}
          className="w-full border-2 border-blue-500 rounded-lg"
          playsInline
          muted
        />
      </div>

      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
