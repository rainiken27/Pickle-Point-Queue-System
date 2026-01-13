import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { data: queueData, error } = await supabaseServer
      .from('queue')
      .select('*')
      .in('status', ['waiting', 'playing'])
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching queue:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(queueData || []);
  } catch (error) {
    console.error('Unexpected error fetching queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    );
  }
}
