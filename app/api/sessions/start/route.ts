import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const StartSessionSchema = z.object({
  player_id: z.string().uuid(),
  display_photo: z.boolean().optional().default(true),
  preferences: z.object({
    skill_level_pref: z.enum(['beginner', 'intermediate_advanced']),
    gender_pref: z.enum(['mens', 'womens', 'mixed', 'random']),
    match_type: z.enum(['solo', 'group']),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { player_id, display_photo, preferences } = StartSessionSchema.parse(body);

    // Check if player already has an active session
    const { data: existingSessions } = await supabaseServer
      .from('sessions')
      .select('*')
      .eq('player_id', player_id)
      .eq('status', 'active');

    // If active session exists, update display_photo preference and return it
    if (existingSessions && existingSessions.length > 0) {
      const existingSession = existingSessions[0];
      
      // Update display_photo preference for existing session
      const { error: updateError } = await supabaseServer
        .from('sessions')
        .update({ display_photo })
        .eq('id', existingSession.id);

      if (updateError) {
        console.error('Failed to update display_photo:', updateError);
      }

      const startTime = new Date(existingSession.start_time).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const fiveHoursInMs = 5 * 60 * 60 * 1000;
      const remaining = fiveHoursInMs - elapsed;
      const remainingHours = Math.floor(remaining / (60 * 60 * 1000));
      const remainingMinutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      return NextResponse.json(
        {
          session: { ...existingSession, display_photo },
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
        display_photo,
      })
      .select()
      .single();

    if (error) {
      console.error('[SESSION START] Database error:', error);
      console.error('[SESSION START] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

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
    console.error('[SESSION START] Error:', error);
    
    if (error instanceof z.ZodError) {
      console.error('[SESSION START] Validation error:', error.issues);
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    // Check if it's a Supabase connection error
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('Missing Supabase') || errorMessage.includes('environment variables')) {
      console.error('[SESSION START] Missing environment variables - check SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          message: 'Database connection failed. Please contact support.',
          details: 'Missing Supabase environment variables'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to start session', 
        message: errorMessage,
        // Include error code if available (for debugging)
        ...(error && typeof error === 'object' && 'code' in error ? { code: (error as any).code } : {})
      },
      { status: 500 }
    );
  }
}
