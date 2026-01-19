"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { Camera, CameraOff, RotateCcw, Check } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (photoUrl: string) => void;
  onError?: (error: string) => void;
}

export function PhotoCapture({ onCapture, onError }: PhotoCaptureProps) {
  const [isActive, setIsActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    setIsActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
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

    // Get the image as data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);

    // Stop the camera after capture
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('photo', blob, `photo-${Date.now()}.jpg`);

      // Upload to our API
      const uploadResponse = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Pass the URL back to parent
      onCapture(data.url);
      setCapturedImage(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload photo';
      setCameraError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsUploading(false);
    }
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
          <img src={capturedImage} alt="Captured" className="w-full" />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={retake}
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={isUploading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake
          </Button>
          <Button
            onClick={confirmPhoto}
            type="button"
            className="flex-1"
            disabled={isUploading}
          >
            <Check className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Use This Photo'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {!isActive ? (
          <Button onClick={startCamera} type="button" className="w-full">
            <Camera className="w-4 h-4 mr-2" />
            Open Camera
          </Button>
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
            Please check camera permissions in your browser settings or use the URL option instead.
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
