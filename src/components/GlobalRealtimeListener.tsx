"use client";

import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useArticleSocket } from '@/hooks/useArticleSocket';
import { useAppContext } from '@/components/app-provider';
import { decodeToken } from '@/lib/utils';
import { getAccessTokenFromLocalStorage } from '@/lib/utils';

interface DecodedToken {
  sub: string;
  name: string;
  email: string;
  role: any;
  iat: number;
  exp: number;
}

export function GlobalRealtimeListener() {
  const { toast } = useToast();
  const { isAuth } = useAppContext();

  // Lấy thông tin user hiện tại
  const getCurrentUser = () => {
    const token = getAccessTokenFromLocalStorage();
    if (token) {
      try {
        return decodeToken(token) as DecodedToken;
      } catch {
        return null;
      }
    }
    return null;
  };

  const currentUser = getCurrentUser();

  // Chỉ kích hoạt real-time khi user đã đăng nhập
  const { isConnected } = useArticleSocket({
    onArticleCreated: (article) => {
      // Kiểm tra xem có phải user hiện tại tạo không
      const isOwnAction = article.author?.id === currentUser?.sub;

      if (!isOwnAction) {
        const authorName = article.author?.name || 'Người dùng';
        toast({
          title: "📝 Bài viết mới",
          description: `${authorName} đã thêm bài viết: "${article.title}"`,
          duration: 5000,
        });
      }
    },

    onArticleUpdated: (article) => {
      // Kiểm tra xem có phải user hiện tại sửa không
      const isOwnAction = article.author?.id === currentUser?.sub;

      if (!isOwnAction) {
        const authorName = article.author?.name || 'Người dùng';
        toast({
          title: "✏️ Bài viết đã cập nhật",
          description: `${authorName} đã sửa bài viết: "${article.title}"`,
          duration: 5000,
        });
      }
    },

    onArticleDeleted: () => {
      // Server sẽ gửi thêm thông tin về người xóa và tên bài viết
      toast({
        title: "🗑️ Bài viết đã xóa",
        description: `Một bài viết đã bị xóa bởi người khác`,
        duration: 5000,
      });
    },
  });

  // Log connection status for debugging
  useEffect(() => {
    if (isAuth) {
      console.log(`🔌 Real-time status: ${isConnected ? 'Connected' : 'Disconnected'}`);
    }
  }, [isConnected, isAuth]);

  // Component này không render gì cả, chỉ lắng nghe events
  return null;
}
