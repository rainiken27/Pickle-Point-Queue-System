import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('name');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Search players by name (case-insensitive, partial match)
    const { data: players, error } = await supabaseServer
      .from('players')
      .select('id, name, qr_uuid, skill_level, photo_url')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error searching players:', error);
      throw error;
    }

    return NextResponse.json(players || [], { status: 200 });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search players', message: (error as Error).message },
      { status: 500 }
    );
  }
}
