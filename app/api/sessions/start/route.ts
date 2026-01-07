import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const StartSessionSchema = z.object({
  player_id: z.string().uuid(),
  preferences: z.object({
    skill_level_pref: z.enum(['beginner', 'intermediate_advanced']),
    gender_pref: z.enum(['mens', 'womens', 'mixed', 'random']),
    match_type: z.enum(['solo', 'group']),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { player_id, preferences } = StartSessionSchema.parse(body);

    // Check if player already has an active session
    const { data: existingSessions } = await supabaseServer
      .from('sessions')
      .select('*')
      .eq('player_id', player_id)
      .eq('status', 'active');

    // If active session exists, return it (idempotent - allows rejoining after breaks)
    if (existingSessions && existingSessions.length > 0) {
      const existingSession = existingSessions[0];
      const startTime = new Date(existingSession.start_time).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const fiveHoursInMs = 5 * 60 * 60 * 1000;
      const remaining = fiveHoursInMs - elapsed;
      const remainingHours = Math.floor(remaining / (60 * 60 * 1000));
      const remainingMinutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      return NextResponse.json(
        {
          session: existingSession,
          rejoining: true,
          time_remaining: {
            ms: remaining,
            hours: remainingHours,
            minutes: remainingMinutes,
            formatted: `${remainingHours}h ${remainingMinutes}m`,
          },
        },
        { status: 200 }
      );
    }

    // Create new session
    const { data: newSession, error } = await supabaseServer
      .from('sessions')
      .insert({
        player_id,
        status: 'active',
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Upsert player preferences if provided
    if (preferences) {
      const { error: prefsError } = await supabaseServer
        .from('player_preferences')
        .upsert({
          player_id,
          ...preferences,
        });

      if (prefsError) {
        console.error('Failed to update preferences:', prefsError);
        // Don't fail the whole request if preferences update fails
      }
    }

    return NextResponse.json({ session: newSession }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to start session', message: (error as Error).message },
      { status: 500 }
    );
  }
}
