"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage(): React.JSX.Element {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin page
    router.push('/admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Pickleball Queue System</h1>
        <p className="text-gray-600 mb-6">Redirecting to admin panel...</p>
        <div className="flex gap-4 justify-center">
          <a
            href="/admin"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Queue Management
          </a>
          <a
            href="/display"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            TV Display
          </a>
        </div>
      </div>
    </div>
  );
}