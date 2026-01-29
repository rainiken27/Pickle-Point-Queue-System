import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const ExtendSessionSchema = z.object({
  player_id: z.string().uuid(),
  additional_hours: z.number().min(1).max(24).default(5), // Default to 5 hours, allow 1-24
});

export async function POST(request: NextRequest) {
  try {
    // Check Supabase connection first
    if (!supabaseServer) {
      throw new Error('Supabase client not initialized');
    }

    const body = await request.json();
    const { player_id, additional_hours } = ExtendSessionSchema.parse(body);

    // Get player info to check unlimited_time flag
    const { data: player, error: playerError } = await supabaseServer
      .from('players')
      .select('unlimited_time')
      .eq('id', player_id)
      .single();

    if (playerError) {
      console.error('[SESSION EXTEND] Error fetching player:', playerError);
      throw new Error(`Failed to fetch player: ${playerError.message}`);
    }

    const hasUnlimitedTime = player?.unlimited_time || false;

    // Unlimited time players don't need extension
    if (hasUnlimitedTime) {
      return NextResponse.json(
        { 
          error: 'Player has unlimited time',
          message: 'This player already has unlimited time and cannot purchase additional hours.'
        },
        { status: 400 }
      );
    }

    // Check if player has an active session
    const { data: activeSessions, error: checkError } = await supabaseServer
      .from('sessions')
      .select('*')
      .eq('player_id', player_id)
      .eq('status', 'active')
      .single();

    if (checkError || !activeSessions) {
      return NextResponse.json(
        { 
          error: 'No active session',
          message: 'Player does not have an active session to extend.'
        },
        { status: 404 }
      );
    }

    // Calculate new end time if it exists, or create one
    const startTime = new Date(activeSessions.start_time);
    const now = new Date();
    
    // If session already has an end_time, extend from there
    // Otherwise, calculate from start time + 5 hours + additional time
    let newEndTime: Date;
    
    if (activeSessions.end_time) {
      newEndTime = new Date(activeSessions.end_time);
    } else {
      // Calculate current end time (start + 5 hours)
      newEndTime = new Date(startTime.getTime() + 5 * 60 * 60 * 1000);
    }
    
    // Add additional hours
    newEndTime = new Date(newEndTime.getTime() + additional_hours * 60 * 60 * 1000);

    // Update the session with new end time
    const { data: updatedSession, error: updateError } = await supabaseServer
      .from('sessions')
      .update({ 
        end_time: newEndTime.toISOString(),
        duration_minutes: Math.floor((newEndTime.getTime() - startTime.getTime()) / (60 * 1000))
      })
      .eq('id', activeSessions.id)
      .select()
      .single();

    if (updateError) {
      console.error('[SESSION EXTEND] Failed to update session:', updateError);
      throw new Error(`Failed to extend session: ${updateError.message}`);
    }

    // Calculate new time remaining
    const remaining = newEndTime.getTime() - now.getTime();
    const remainingHours = Math.floor(remaining / (60 * 60 * 1000));
    const remainingMinutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    return NextResponse.json({
      session: updatedSession,
      additional_hours_added: additional_hours,
      new_end_time: newEndTime.toISOString(),
      time_remaining: {
        ms: remaining,
        hours: remainingHours,
        minutes: remainingMinutes,
        formatted: `${remainingHours}h ${remainingMinutes}m`,
      },
      message: `Successfully extended session by ${additional_hours} hour(s)`
    }, { status: 200 });

  } catch (error) {
    console.error('[SESSION EXTEND] Error:', error);
    
    if (error instanceof z.ZodError) {
      console.error('[SESSION EXTEND] Validation error:', error.issues);
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = (error as Error).message;
    if (errorMessage.includes('Missing Supabase') || errorMessage.includes('environment variables')) {
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
        error: 'Failed to extend session', 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
