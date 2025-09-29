import React, { useState } from 'react';
import { useArticleSocket, ArticleData } from '@/hooks/useArticleSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const ArticleRealtimeDemo: React.FC = () => {
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Sử dụng hook WebSocket với custom handlers
  const { isConnected, emit, updateArticleCache, removeArticleCache, invalidateArticlesList } = useArticleSocket({
    onArticleCreated: (article) => {
      // Thêm article mới vào state
      setArticles(prev => [article, ...prev]);
      setNotifications(prev => [`Bài viết mới: "${article.title}" đã được tạo`, ...prev.slice(0, 4)]);

      // Cập nhật React Query cache
      invalidateArticlesList();
    },

    onArticleUpdated: (article) => {
      // Cập nhật article trong state
      setArticles(prev => prev.map(a => a.id === article.id ? article : a));
      setNotifications(prev => [`Bài viết "${article.title}" đã được cập nhật`, ...prev.slice(0, 4)]);

      // Cập nhật React Query cache
      updateArticleCache(article);
    },

    onArticleDeleted: (articleId) => {
      // Xóa article khỏi state
      const deletedArticle = articles.find(a => a.id === articleId);
      setArticles(prev => prev.filter(a => a.id !== articleId));
      setNotifications(prev => [`Bài viết "${deletedArticle?.title || articleId}" đã bị xóa`, ...prev.slice(0, 4)]);

      // Xóa khỏi React Query cache
      removeArticleCache(articleId);
    },
  });

  const clearNotifications = () => {
    setNotifications([]);
  };

  const testEmitEvent = () => {
    emit('test-event', { message: 'Hello from client!', timestamp: Date.now() });
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Real-time Article Updates
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testEmitEvent} disabled={!isConnected}>
              Test Emit Event
            </Button>
            <Button variant="outline" onClick={clearNotifications}>
              Clear Notifications ({notifications.length})
            </Button>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Recent Notifications:</h4>
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className="p-2 bg-blue-50 border border-blue-200 rounded text-sm"
                >
                  {notification}
                </div>
              ))}
            </div>
          )}

          {/* Real-time Articles List */}
          <div className="space-y-2">
            <h4 className="font-semibold">Real-time Articles ({articles.length}):</h4>
            {articles.length === 0 ? (
              <p className="text-gray-500 italic">No articles received yet...</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {articles.map((article) => (
                  <Card key={article.id} className="p-3">
                    <h5 className="font-medium">{article.title}</h5>
                    <p className="text-sm text-gray-600 truncate">{article.content}</p>
                    <div className="text-xs text-gray-400 mt-1">
                      ID: {article.id} | Created: {article.createdAt ? new Date(article.createdAt).toLocaleString() : 'N/A'}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
