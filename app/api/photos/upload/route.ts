import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;

    if (!photo) {
      return NextResponse.json(
        { error: 'No photo provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (photo.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = photo.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${randomStr}.${extension}`;

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabaseServer.storage
      .from('player-photos')
      .upload(filename, buffer, {
        contentType: photo.type,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload photo', message: error.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseServer.storage
      .from('player-photos')
      .getPublicUrl(filename);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo', message: (error as Error).message },
      { status: 500 }
    );
  }
}
