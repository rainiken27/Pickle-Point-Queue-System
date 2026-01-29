"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', email);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Login response:', { data, error: signInError });

      if (signInError) throw signInError;

      if (!data.user) {
        throw new Error('Login failed - no user returned');
      }

      console.log('User logged in:', data.user.id);

      // Check user role
      const { data: staffRole, error: roleError } = await supabase
        .from('staff_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      console.log('Staff role response:', { staffRole, roleError });

      if (roleError || !staffRole) {
        // In development, default to court_officer if no role exists
        if (process.env.NODE_ENV === 'development') {
          console.log('Dev mode: No staff role found, defaulting to court_officer');
          window.location.href = '/admin';
          return;
        }
        await supabase.auth.signOut();
        throw new Error('No staff role assigned to this account');
      }

      console.log('Redirecting to:', staffRole.role === 'court_officer' ? '/admin' : '/cashier');

      // Redirect based on role - use window.location for hard redirect
      // This ensures cookies are properly sent to middleware
      if (staffRole.role === 'court_officer') {
        window.location.href = '/admin';
      } else if (staffRole.role === 'cashier') {
        window.location.href = '/cashier';
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Login error:', error);
      setError((error as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 justify-center">
            <Lock className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Staff Login</h1>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@picklepoint.com"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-sm text-gray-600 text-center">
              <p>Court Officer or Cashier accounts only</p>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
