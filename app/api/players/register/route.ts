import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { PlayerSchema } from '@/lib/utils/validation';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = PlayerSchema.parse(body);

    // Check if email already exists
    const { data: existingPlayer } = await supabaseServer
      .from('players')
      .select('email')
      .eq('email', validatedData.email)
      .maybeSingle();

    if (existingPlayer) {
      return NextResponse.json(
        { error: 'This email is already registered. Please use a different email or contact staff.' },
        { status: 409 }
      );
    }

    // Insert player into database (using service role, bypasses RLS)
    const { data: player, error } = await supabaseServer
      .from('players')
      .insert({
        name: validatedData.name,
        email: validatedData.email,
        skill_level: validatedData.skill_level,
        gender: validatedData.gender,
        photo_url: validatedData.photo_url || null,
      })
      .select('qr_uuid, id, name, email')
      .single();

    if (error) {
      console.error('Error inserting player:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      player: {
        id: player.id,
        name: player.name,
        email: player.email,
        qr_uuid: player.qr_uuid,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register player', message: (error as Error).message },
      { status: 500 }
    );
  }
}
