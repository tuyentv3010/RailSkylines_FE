import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getPusher } from '@/lib/pusher';

export interface ArticleData {
  id: string;
  title: string;
  content: string;
  thumbnail?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: any;
}

interface UseArticleSocketOptions {
  onArticleCreated?: (article: ArticleData) => void;
  onArticleUpdated?: (article: ArticleData) => void;
  onArticleDeleted?: (articleId: string) => void;
}

export const useArticleSocket = (options: UseArticleSocketOptions = {}) => {
  const { onArticleCreated, onArticleUpdated, onArticleDeleted } = options;
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const mapServerEventToArticle = useCallback((payload: any): ArticleData => {
    return {
      id: String(payload.articleId),
      title: payload.title,
      content: payload.content,
      thumbnail: payload.thumbnail,
      createdAt: payload.timestamp,
      updatedAt: payload.timestamp,
      author: payload.userId || payload.userName ? { id: String(payload.userId), name: payload.userName } : undefined,
    };
  }, []);

  useEffect(() => {
    const pusher = getPusher();
    if (!pusher) return;

    const channelName = 'articles-channel';
    const eventName = 'article-event';

    // sync initial state and bind to state change events
    setIsConnected(pusher.connection.state === 'connected');
    const onStateChange = (states: { previous: string; current: string }) => {
      setIsConnected(states.current === 'connected');
    };
    pusher.connection.bind('state_change', onStateChange);

    const channel = pusher.subscribe(channelName);

    const handler = (raw: any) => {
      try {
        const data =
          typeof raw === 'string'
            ? JSON.parse(raw)
            : raw;

        // data has shape: { eventType, articleId, title, content, thumbnail, userId, userName, timestamp }
        const { eventType } = data || {};
        if (!eventType) return;

        if (eventType === 'CREATED') {
          const article = mapServerEventToArticle(data);
          onArticleCreated?.(article);
          // invalidate list for safety
          queryClient.invalidateQueries({ queryKey: ['articles'] });
        } else if (eventType === 'UPDATED') {
          const article = mapServerEventToArticle(data);
          onArticleUpdated?.(article);
          queryClient.invalidateQueries({ queryKey: ['articles'] });
          queryClient.removeQueries({ queryKey: ['articles', Number(data.articleId)] });
        } else if (eventType === 'DELETED') {
          onArticleDeleted?.(String(data.articleId));
          // remove specific article cache and invalidate list
          queryClient.removeQueries({ queryKey: ['articles', Number(data.articleId)] });
          queryClient.invalidateQueries({ queryKey: ['articles'] });
        }
      } catch (e) {
        console.error('Error handling article-event:', e);
      }
    };

    channel.bind(eventName, handler);

    return () => {
      try {
        channel.unbind(eventName, handler);
        pusher.unsubscribe(channelName);
      } catch {}
      pusher.connection.unbind('state_change', onStateChange);
      setIsConnected(false);
    };
  }, [mapServerEventToArticle, onArticleCreated, onArticleDeleted, onArticleUpdated, queryClient]);

  // Auto-update React Query cache
  const updateArticleCache = useCallback((articleData: ArticleData) => {
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }, [queryClient]);

  const removeArticleCache = useCallback((articleId: string) => {
    // Xóa article khỏi cache
    queryClient.removeQueries({ queryKey: ['articles', Number(articleId)] });
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }, [queryClient]);

  const invalidateArticlesList = useCallback(() => {
    // Invalidate và refetch danh sách articles
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }, [queryClient]);

  return {
    isConnected,
    emit: (event: string, data?: any) => {
      console.warn('emit is not supported over Pusher in FE. Ignored.', { event, data });
    },
    reconnect: () => {
      // Pusher will auto-reconnect; expose a noop for compatibility
      const pusher = getPusher();
      pusher?.connect();
    },
    // Utility functions cho article cache
    updateArticleCache,
    removeArticleCache,
    invalidateArticlesList,
  };
};
