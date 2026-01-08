'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

export default function TestExpiringSessionsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const createTestScenario = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-expiring-sessions', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to create test scenario', details: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const cleanupTestData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-expiring-sessions', {
        method: 'DELETE',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to cleanup test data', details: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Expiring Sessions Scenario</h1>
        
        <Card className="mb-6">
          <CardBody>
            <h2 className="text-xl font-semibold mb-4">Session Expiry Test</h2>
            <p className="text-gray-600 mb-4">
              This test uses your existing players and modifies their sessions to expire in 1 minute, 
              and sets court timers to 30 seconds to test match completion after session expiry.
            </p>
            
            <div className="space-y-4">
              <Button 
                onClick={createTestScenario} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Setting up...' : 'Setup Expiring Sessions (Use Existing Players)'}
              </Button>
              
              <Button 
                onClick={cleanupTestData} 
                disabled={loading}
                variant="secondary"
                className="w-full"
              >
                {loading ? 'Resetting...' : 'Reset Sessions to Normal Timing'}
              </Button>
            </div>
          </CardBody>
        </Card>

        {result && (
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold mb-4">
                {result.success ? '✅ Success' : '❌ Error'}
              </h3>
              
              {result.success && (
                <>
                  <p className="text-green-600 mb-4">{result.message}</p>
                  
                  {result.instructions && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Test Instructions:</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {result.instructions.map((instruction: string, index: number) => (
                          <li key={index} className="text-sm">{instruction}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {result.players && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Created Players:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {result.players.map((p: any, index: number) => (
                          <div key={index} className="text-sm bg-gray-100 p-2 rounded">
                            {p.player.name} (Skill: {p.player.skill_level})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {result.error && (
                <div className="text-red-600">
                  <p className="font-semibold">{result.error}</p>
                  {result.details && <p className="text-sm mt-1">{result.details}</p>}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        <div className="mt-8 text-center">
          <Button 
            onClick={() => window.location.href = '/admin'}
            variant="secondary"
          >
            Go to Admin Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}