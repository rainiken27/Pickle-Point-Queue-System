import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { court_id, reserved_by, reserved_until, reserved_note, action } = await request.json();

    if (!court_id) {
      return NextResponse.json({ error: 'court_id is required' }, { status: 400 });
    }

    if (action === 'unreserve') {
      // Remove reservation
      const { data, error } = await supabaseServer
        .from('courts')
        .update({
          status: 'available',
          reserved_by: null,
          reserved_until: null,
          reserved_note: null,
        })
        .eq('id', court_id)
        .select()
        .single();

      if (error) {
        console.error('Error unreserving court:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, court: data });
    }

    // Reserve court
    if (!reserved_by) {
      return NextResponse.json({ error: 'reserved_by is required' }, { status: 400 });
    }

    console.log('[Reserve Court] Request:', { court_id, reserved_by, reserved_until, reserved_note });

    // First check if court exists and is available
    const { data: courtCheck, error: checkError } = await supabaseServer
      .from('courts')
      .select('id, court_number, status, reserved_by, reserved_until, reserved_note')
      .eq('id', court_id)
      .maybeSingle(); // Use maybeSingle instead of single to handle 0 results gracefully

    console.log('[Reserve Court] Court check:', { courtCheck, checkError });

    if (checkError) {
      console.error('[Reserve Court] Check error:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (!courtCheck) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 });
    }

    if (courtCheck.status !== 'available') {
      return NextResponse.json(
        { error: `Court is currently ${courtCheck.status} and cannot be reserved` },
        { status: 400 }
      );
    }

    // Now update the court
    const { data, error } = await supabaseServer
      .from('courts')
      .update({
        status: 'reserved',
        reserved_by,
        reserved_until: reserved_until || null,
        reserved_note: reserved_note || null,
      })
      .eq('id', court_id)
      .select()
      .single();

    if (error) {
      console.error('Error reserving court:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, court: data });
  } catch (error) {
    console.error('Error in court reservation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
