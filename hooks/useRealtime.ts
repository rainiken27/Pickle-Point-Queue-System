import { useEffect, useState } from 'react';

interface SSEMessage {
  type: 'connected' | 'queue_update' | 'court_status' | 'time_warning' | 'heartbeat';
  data?: any;
  timestamp?: string;
}

export function useRealtime() {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [messages, setMessages] = useState<SSEMessage[]>([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/display/stream');

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        setLastUpdate(new Date());
        setMessages(prev => [...prev.slice(-50), message]); // Keep last 50 messages
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const isStale = lastUpdate
    ? (Date.now() - lastUpdate.getTime()) > 5000
    : true;

  return { connected, lastUpdate, isStale, messages };
}
