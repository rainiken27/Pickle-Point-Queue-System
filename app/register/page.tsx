"use client";

import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Users, Link, Camera } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    skill_level: 'beginner' as 'beginner' | 'novice' | 'intermediate' | 'advanced',
    gender: 'male' as 'male' | 'female' | 'other',
    photo_url: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoMode, setPhotoMode] = useState<'url' | 'camera'>('camera');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Call registration API
      const response = await fetch('/api/players/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle email conflict error
        if (response.status === 409) {
          setErrors({ email: data.error });
          return;
        }

        // Handle validation errors
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          data.details.forEach((err: any) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          return;
        }

        throw new Error(data.error || 'Registration failed');
      }

      // Show QR code
      setGeneratedQR(data.player.qr_uuid);
    } catch (error) {
      alert('Failed to register player: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      skill_level: 'beginner',
      gender: 'male',
      photo_url: '',
    });
    setGeneratedQR(null);
    setErrors({});
  };

  if (generatedQR) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold text-green-600">Registration Successful!</h1>
            </CardHeader>
            <CardBody>
              <div className="text-center space-y-6">
                <p className="text-lg">Player: <strong>{formData.name}</strong></p>

                <div className="bg-white p-8 inline-block rounded-lg border-4 border-gray-300">
                  <QRCode value={generatedQR} size={256} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Scan this QR code at check-in</p>
                  <p className="text-xs text-gray-500 font-mono break-all">{generatedQR}</p>
                </div>

                <div className="flex gap-4 justify-center print:hidden">
                  <Button onClick={handlePrint}>Print QR Code</Button>
                  <Button variant="secondary" onClick={handleReset}>Register Another Player</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold">Player Registration</h1>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Full Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                placeholder="Enter player name"
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                placeholder="your.email@example.com"
                required
              />

              <Select
                label="Skill Level"
                value={formData.skill_level}
                onChange={(e) => setFormData({ ...formData, skill_level: e.target.value as any })}
                options={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'novice', label: 'Novice' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
              />

              <Select
                label="Gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Photo (Optional)
                  </label>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPhotoMode('camera')}
                      className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors ${
                        photoMode === 'camera'
                          ? 'bg-white shadow text-blue-600'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoMode('url')}
                      className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md transition-colors ${
                        photoMode === 'url'
                          ? 'bg-white shadow text-blue-600'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Link className="w-4 h-4" />
                      URL
                    </button>
                  </div>
                </div>

                {photoMode === 'camera' ? (
                  <div>
                    {formData.photo_url ? (
                      <div className="space-y-2">
                        <div className="relative w-32 h-32 mx-auto">
                          <img
                            src={formData.photo_url}
                            alt="Profile preview"
                            className="w-full h-full object-cover rounded-lg border-2 border-green-500"
                          />
                        </div>
                        <p className="text-sm text-green-600 text-center">Photo captured!</p>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setFormData({ ...formData, photo_url: '' })}
                          className="w-full"
                        >
                          Remove & Retake
                        </Button>
                      </div>
                    ) : (
                      <PhotoCapture
                        onCapture={(url) => setFormData({ ...formData, photo_url: url })}
                        onError={(error) => setErrors({ ...errors, photo_url: error })}
                      />
                    )}
                  </div>
                ) : (
                  <Input
                    type="url"
                    value={formData.photo_url}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    error={errors.photo_url}
                    placeholder="https://example.com/photo.jpg"
                  />
                )}

                <p className="text-xs text-gray-500">
                  If no photo is provided, your initials will be displayed instead.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Registering...' : 'Register & Generate QR Code'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
