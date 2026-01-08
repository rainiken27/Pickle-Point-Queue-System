import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Health check endpoint to verify Supabase connection
 * Useful for debugging production issues
 */
export async function GET() {
  try {
    // Test Supabase connection
    const { data, error } = await supabaseServer
      .from('sessions')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Database connection failed',
          error: error.message,
          code: (error as any).code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
