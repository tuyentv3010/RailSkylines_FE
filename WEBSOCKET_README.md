# WebSocket Real-time System Documentation

Hệ thống WebSocket real-time cho ứng dụng Next.js sử dụng Socket.IO Client với tính năng tự động kết nối lại và xử lý authentication.

## 🚀 Tính năng

- ✅ Kết nối WebSocket tự động với authentication Bearer token
- ✅ Tự động reconnect khi mất kết nối hoặc token hết hạn
- ✅ Hook React tổng quát cho real-time events
- ✅ Hook chuyên biệt cho Article real-time updates
- ✅ Tích hợp với React Query để auto-update cache
- ✅ Error handling và logging chi tiết
- ✅ TypeScript support đầy đủ

## 📁 Cấu trúc Files

```
src/
├── lib/
│   └── socket.ts                    # Socket manager chính
├── hooks/
│   ├── useRealtime.ts              # Hook tổng quát cho real-time
│   └── useArticleSocket.ts         # Hook chuyên biệt cho Articles
├── providers/
│   └── SocketProvider.tsx          # Provider cho app context
└── components/
    └── ArticleRealtimeDemo.tsx     # Component demo
```

## 🔧 Cài đặt

### 1. Socket.IO Client đã được cài đặt:
```bash
npm install socket.io-client --legacy-peer-deps
```

### 2. Tích hợp SocketProvider vào app (khuyến nghị)

Thêm SocketProvider vào layout chính của bạn:

```tsx
// src/app/layout.tsx hoặc nơi bạn wrap app
import { SocketProvider } from '@/providers/SocketProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          <SocketProvider>
            {children}
          </SocketProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

## 💡 Cách sử dụng

### 1. Sử dụng Hook Article Real-time

```tsx
import { useArticleSocket } from '@/hooks/useArticleSocket';

function ArticleList() {
  const { isConnected, invalidateArticlesList } = useArticleSocket({
    onArticleCreated: (article) => {
      toast({
        title: "Bài viết mới",
        description: `"${article.title}" vừa được tạo`,
      });
    },
    onArticleUpdated: (article) => {
      console.log('Article updated:', article);
    },
    onArticleDeleted: (articleId) => {
      console.log('Article deleted:', articleId);
    },
  });

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {/* Render articles list */}
    </div>
  );
}
```

### 2. Sử dụng Hook Real-time tổng quát

```tsx
import { useRealtime } from '@/hooks/useRealtime';

function MyComponent() {
  const { isConnected, emit, subscribe } = useRealtime({
    events: [
      {
        event: 'userOnline',
        handler: (data) => console.log('User online:', data),
      },
      {
        event: 'messageReceived',
        handler: (data) => console.log('New message:', data),
      },
    ],
  });

  // Emit event
  const sendMessage = () => {
    emit('sendMessage', { text: 'Hello!', userId: 123 });
  };

  // Dynamic subscribe
  useEffect(() => {
    const unsubscribe = subscribe('dynamicEvent', (data) => {
      console.log('Dynamic event:', data);
    });

    return unsubscribe; // Auto cleanup
  }, [subscribe]);

  return <button onClick={sendMessage}>Send Message</button>;
}
```

### 3. Sử dụng Socket Manager trực tiếp

```tsx
import socketManager from '@/lib/socket';

// Kết nối
const socket = socketManager.connect();

// Lắng nghe events
socketManager.on('customEvent', (data) => {
  console.log('Custom event:', data);
});

// Emit events
socketManager.emit('myEvent', { data: 'test' });

// Kiểm tra kết nối
console.log('Connected:', socketManager.isSocketConnected());

// Disconnect
socketManager.disconnect();
```

## 🎯 Server-side Events

Server cần emit các events sau cho Articles:

```javascript
// Server-side (Node.js/Socket.IO)
io.emit('articleCreated', {
  id: 'article-123',
  title: 'Bài viết mới',
  content: 'Nội dung...',
  thumbnail: 'image-url',
  createdAt: new Date().toISOString(),
  author: { id: 1, name: 'Author Name' }
});

io.emit('articleUpdated', {
  id: 'article-123',
  title: 'Bài viết đã cập nhật',
  // ... other fields
});

io.emit('articleDeleted', {
  id: 'article-123'
});
```

## 🔐 Authentication

Hệ thống tự động gửi Bearer token từ localStorage:

```tsx
// Token được lấy tự động từ getAccessTokenFromLocalStorage()
// Khi token thay đổi, gọi reconnect:
const { reconnect } = useArticleSocket();
reconnect(); // Reconnect với token mới
```

## 🚨 Error Handling

Hệ thống có built-in error handling:

- Connection errors → Tự động retry
- Auth errors → Tự động reconnect với token mới
- Event handler errors → Log lỗi nhưng không crash app

## 📊 React Query Integration

Hook tự động cập nhật React Query cache:

```tsx
const { updateArticleCache, removeArticleCache, invalidateArticlesList } = useArticleSocket();

// Manual cache operations
updateArticleCache(articleData);           // Update single article
removeArticleCache('article-123');        // Remove article from cache
invalidateArticlesList();                 // Refresh articles list
```

## 🎨 Demo Component

Sử dụng `ArticleRealtimeDemo` component để test:

```tsx
import { ArticleRealtimeDemo } from '@/components/ArticleRealtimeDemo';

function TestPage() {
  return (
    <div>
      <h1>WebSocket Test</h1>
      <ArticleRealtimeDemo />
    </div>
  );
}
```

## 🔧 Environment Variables

Đảm bảo có biến môi trường:

```env
NEXT_PUBLIC_API_ENDPOINT=http://localhost:3001
```

## 🎭 Best Practices

1. **Sử dụng SocketProvider**: Wrap app để tự động kết nối
2. **Cleanup events**: Hook tự động cleanup khi component unmount
3. **Error boundaries**: Wrap components có socket với error boundary
4. **Conditional rendering**: Check `isConnected` trước khi hiển thị real-time data
5. **Throttle events**: Tránh spam events từ client

## 🚀 Mở rộng cho tính năng khác

Tạo hook mới cho các entity khác:

```tsx
// useBookingSocket.ts
export const useBookingSocket = (options = {}) => {
  const events = [
    { event: 'bookingCreated', handler: options.onBookingCreated || (() => {}) },
    { event: 'bookingUpdated', handler: options.onBookingUpdated || (() => {}) },
    { event: 'bookingCancelled', handler: options.onBookingCancelled || (() => {}) },
  ];

  return useRealtime({ events });
};
```
