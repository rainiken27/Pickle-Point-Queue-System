"use client";

import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase/client';
import { PlayerSchema } from '@/lib/utils/validation';
import { z } from 'zod';
import { Users } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate form data
      const validatedData = PlayerSchema.parse(formData);

      // Check if email already exists
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('email')
        .eq('email', validatedData.email)
        .single();

      if (existingPlayer) {
        setErrors({ email: 'This email is already registered. Please use a different email or contact staff.' });
        return;
      }

      // Insert player into database
      const { data: player, error } = await supabase
        .from('players')
        .insert({
          name: validatedData.name,
          email: validatedData.email,
          skill_level: validatedData.skill_level,
          gender: validatedData.gender,
          photo_url: validatedData.photo_url || null,
        })
        .select('qr_uuid')
        .single();

      if (error) throw error;

      // Show QR code
      setGeneratedQR(player.qr_uuid);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        alert('Failed to register player: ' + (error as Error).message);
      }
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

              <Input
                label="Photo URL (optional)"
                type="url"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                error={errors.photo_url}
                placeholder="https://example.com/photo.jpg"
              />

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
