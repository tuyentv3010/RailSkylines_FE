import { useCallback } from 'react';
import { useRealtime, RealtimeEventHandler } from './useRealtime';

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

  // Handler cho sự kiện articleCreated
  const handleArticleCreated = useCallback((articleData: ArticleData) => {
    console.log('📝 New article created:', articleData);

    // Gọi callback tùy chỉnh nếu có
    if (onArticleCreated) {
      onArticleCreated(articleData);
    }
  }, [onArticleCreated]);

  // Handler cho sự kiện articleUpdated
  const handleArticleUpdated = useCallback((articleData: ArticleData) => {
    console.log('✏️ Article updated:', articleData);

    // Gọi callback tùy chỉnh nếu có
    if (onArticleUpdated) {
      onArticleUpdated(articleData);
    }
  }, [onArticleUpdated]);

  // Handler cho sự kiện articleDeleted
  const handleArticleDeleted = useCallback((data: { id: string }) => {
    console.log('🗑️ Article deleted:', data.id);

    // Gọi callback tùy chỉnh nếu có
    if (onArticleDeleted) {
      onArticleDeleted(data.id);
    }
  }, [onArticleDeleted]);

  // Định nghĩa các events cần lắng nghe
  const events: RealtimeEventHandler[] = [
    {
      event: 'articleCreated',
      handler: handleArticleCreated,
    },
    {
      event: 'articleUpdated',
      handler: handleArticleUpdated,
    },
    {
      event: 'articleDeleted',
      handler: handleArticleDeleted,
    },
  ];

  // Sử dụng hook tổng quát
  const { isConnected, emit, queryClient, reconnect } = useRealtime({ events });

  // Auto-update React Query cache
  const updateArticleCache = useCallback((articleData: ArticleData) => {
    // Cập nhật cache cho article cụ thể
    queryClient.setQueryData(['article', articleData.id], articleData);
    // Invalidate danh sách articles
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }, [queryClient]);

  const removeArticleCache = useCallback((articleId: string) => {
    // Xóa article khỏi cache
    queryClient.removeQueries({ queryKey: ['article', articleId] });
    // Invalidate danh sách articles
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }, [queryClient]);

  const invalidateArticlesList = useCallback(() => {
    // Invalidate và refetch danh sách articles
    queryClient.invalidateQueries({ queryKey: ['articles'] });
  }, [queryClient]);

  return {
    isConnected,
    emit,
    reconnect,
    // Utility functions cho article cache
    updateArticleCache,
    removeArticleCache,
    invalidateArticlesList,
  };
};
