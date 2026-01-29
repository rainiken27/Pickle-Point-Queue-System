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
    // Check Supabase connection first
    try {
      // Test connection by checking if we can access the client
      if (!supabaseServer) {
        throw new Error('Supabase client not initialized');
      }
    } catch (initError) {
      console.error('[SESSION START] Supabase initialization error:', initError);
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          message: 'Database connection not available. Please check environment variables.',
          details: (initError as Error).message
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { player_id, display_photo, preferences } = StartSessionSchema.parse(body);

    // Get player info to check unlimited_time flag
    const { data: player, error: playerError } = await supabaseServer
      .from('players')
      .select('unlimited_time')
      .eq('id', player_id)
      .single();

    if (playerError) {
      console.error('[SESSION START] Error fetching player:', playerError);
      throw new Error(`Failed to fetch player: ${playerError.message}`);
    }

    const hasUnlimitedTime = player?.unlimited_time || false;

    // Check if player already has an active session
    const { data: existingSessions, error: checkError } = await supabaseServer
      .from('sessions')
      .select('*')
      .eq('player_id', player_id)
      .eq('status', 'active');

    if (checkError) {
      console.error('[SESSION START] Error checking existing sessions:', checkError);
      throw new Error(`Database query failed: ${checkError.message}`);
    }

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

      // For unlimited time players, return null time_remaining to indicate unlimited
      if (hasUnlimitedTime) {
        return NextResponse.json(
          {
            session: { ...existingSession, display_photo },
            rejoining: true,
            unlimited_time: true,
            time_remaining: null,
          },
          { status: 200 }
        );
      }

      // Calculate time remaining for regular players
      const startTime = new Date(existingSession.start_time).getTime();
      const now = Date.now();
      let remaining: number;
      
      // If session has an end_time (extended session), use that
      if (existingSession.end_time) {
        const endTime = new Date(existingSession.end_time).getTime();
        remaining = endTime - now;
      } else {
        // Default calculation: start_time + 5 hours - current_time
        const fiveHoursInMs = 5 * 60 * 60 * 1000;
        remaining = (startTime + fiveHoursInMs) - now;
      }
      
      const remainingHours = Math.floor(remaining / (60 * 60 * 1000));
      const remainingMinutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      return NextResponse.json(
        {
          session: { ...existingSession, display_photo },
          rejoining: true,
          unlimited_time: false,
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
      console.error('[SESSION START] Error code:', (error as any).code);
      console.error('[SESSION START] Error hint:', (error as any).hint);
      console.error('[SESSION START] Error details:', (error as any).details);
      
      // Check for specific database errors
      const errorCode = (error as any).code;
      const errorMessage = error.message || String(error);
      
      // Column doesn't exist error
      if (errorCode === '42703' || errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Database schema error', 
            message: 'The display_photo column is missing. Please run database migrations.',
            details: errorMessage
          },
          { status: 500 }
        );
      }
      
      // Foreign key constraint error
      if (errorCode === '23503' || errorMessage.includes('foreign key')) {
        return NextResponse.json(
          { 
            error: 'Invalid player', 
            message: 'Player not found in database.',
            details: errorMessage
          },
          { status: 400 }
        );
      }
      
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

    return NextResponse.json({
      session: newSession,
      unlimited_time: hasUnlimitedTime
    }, { status: 201 });
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
