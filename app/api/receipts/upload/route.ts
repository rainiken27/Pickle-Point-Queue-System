import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const receipt = formData.get('receipt') as File | null;
    const sessionId = formData.get('sessionId') as string | null;
    const playerId = formData.get('playerId') as string | null;
    const receiptType = (formData.get('receiptType') as string) || 'physical';

    if (!receipt) {
      return NextResponse.json(
        { error: 'No receipt image provided' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!receipt.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for receipts - they may need more detail)
    const maxSize = 10 * 1024 * 1024;
    if (receipt.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = receipt.name.split('.').pop() || 'jpg';
    const filename = `${sessionId}/${timestamp}-${randomStr}.${extension}`;

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await receipt.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from('payment-receipts')
      .upload(filename, buffer, {
        contentType: receipt.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload receipt', message: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseServer.storage
      .from('payment-receipts')
      .getPublicUrl(filename);

    // Save receipt record to database
    const { data: receiptRecord, error: dbError } = await supabaseServer
      .from('receipts')
      .insert({
        session_id: sessionId,
        player_id: playerId,
        receipt_url: urlData.publicUrl,
        receipt_type: receiptType,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save receipt record', message: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      receiptId: receiptRecord.id,
    });
  } catch (error) {
    console.error('Receipt upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload receipt', message: (error as Error).message },
      { status: 500 }
    );
  }
}
