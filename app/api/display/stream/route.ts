import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      // Subscribe to queue changes
      const queueChannel = supabaseServer
        .channel('queue-updates')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'queue' },
          async (payload) => {
            const message = {
              type: 'queue_update',
              data: payload,
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
          }
        );

      // Subscribe to court changes
      const courtChannel = supabaseServer
        .channel('court-updates')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'courts' },
          async (payload) => {
            const message = {
              type: 'court_status',
              data: payload,
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
          }
        );

      // Subscribe to session changes (for time warnings)
      const sessionChannel = supabaseServer
        .channel('session-updates')
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sessions' },
          async (payload) => {
            const message = {
              type: 'time_warning',
              data: payload,
              timestamp: new Date().toISOString(),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
          }
        );

      await queueChannel.subscribe();
      await courtChannel.subscribe();
      await sessionChannel.subscribe();

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        queueChannel.unsubscribe();
        courtChannel.unsubscribe();
        sessionChannel.unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
