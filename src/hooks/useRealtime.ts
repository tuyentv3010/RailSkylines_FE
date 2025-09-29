import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import socketManager from '@/lib/socket';

export interface RealtimeEventHandler<T = any> {
  event: string;
  handler: (data: T) => void;
}

export interface UseRealtimeOptions {
  events: RealtimeEventHandler[];
  autoConnect?: boolean;
}

/**
 * Hook tổng quát để xử lý real-time events
 * Có thể tái sử dụng cho nhiều loại sự kiện khác nhau
 */
export const useRealtime = (options: UseRealtimeOptions) => {
  const queryClient = useQueryClient();
  const { events, autoConnect = true } = options;

  // Sử dụng ref để lưu events và tránh re-render không cần thiết
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // Wrapper handlers với error handling
  const wrappedHandlers = useRef<Map<string, (data: any) => void>>(new Map());

  const createWrappedHandler = useCallback((event: string, originalHandler: (data: any) => void) => {
    return (data: any) => {
      try {
        console.log(`🔔 Received real-time event: ${event}`, data);
        originalHandler(data);
      } catch (error) {
        console.error(`❌ Error handling real-time event ${event}:`, error);
      }
    };
  }, []);

  useEffect(() => {
    if (!autoConnect) return;

    // Kết nối socket
    socketManager.connect();

    // Copy current handlers để tránh stale closure
    const currentHandlers = new Map<string, (data: any) => void>();

    // Đăng ký lắng nghe các sự kiện
    eventsRef.current.forEach(({ event, handler }) => {
      const wrappedHandler = createWrappedHandler(event, handler);
      currentHandlers.set(event, wrappedHandler);
      wrappedHandlers.current.set(event, wrappedHandler);
      socketManager.on(event, wrappedHandler);
    });

    // Cleanup khi component unmount hoặc events thay đổi
    return () => {
      currentHandlers.forEach((wrappedHandler, event) => {
        socketManager.off(event, wrappedHandler);
      });
      wrappedHandlers.current.clear();
    };
  }, [autoConnect, createWrappedHandler]);

  // Utility functions
  const emit = useCallback((event: string, data?: any) => {
    socketManager.emit(event, data);
  }, []);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    const wrappedHandler = createWrappedHandler(event, handler);
    wrappedHandlers.current.set(event, wrappedHandler);
    socketManager.on(event, wrappedHandler);

    // Trả về function để unsubscribe
    return () => {
      socketManager.off(event, wrappedHandler);
      wrappedHandlers.current.delete(event);
    };
  }, [createWrappedHandler]);

  const unsubscribe = useCallback((event: string) => {
    const wrappedHandler = wrappedHandlers.current.get(event);
    if (wrappedHandler) {
      socketManager.off(event, wrappedHandler);
      wrappedHandlers.current.delete(event);
    }
  }, []);

  return {
    isConnected: socketManager.isSocketConnected(),
    emit,
    subscribe,
    unsubscribe,
    reconnect: () => socketManager.reconnectWithNewToken(),
    queryClient, // Export queryClient để có thể sử dụng trong handlers
  };
};
