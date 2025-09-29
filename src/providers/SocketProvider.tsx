import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import socketManager from '@/lib/socket';
import { getAccessTokenFromLocalStorage } from '@/lib/utils';

interface SocketContextType {
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  useEffect(() => {
    // Chỉ kết nối socket nếu có token
    const token = getAccessTokenFromLocalStorage();
    if (token) {
      console.log('🚀 Initializing socket connection...');
      socketManager.connect();
    }

    // Cleanup khi app unmount
    return () => {
      socketManager.disconnect();
    };
  }, []);

  const value: SocketContextType = {
    isConnected: socketManager.isSocketConnected(),
    emit: (event: string, data?: any) => socketManager.emit(event, data),
    reconnect: () => socketManager.reconnectWithNewToken(),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook để sử dụng socket context
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
