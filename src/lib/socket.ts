import envConfig from "@/config";
import { io, Socket } from "socket.io-client";
import { getAccessTokenFromLocalStorage } from "./utils";

class SocketManager {
  private socket: Socket | null = null;
  private isConnected = false;

  // Khởi tạo kết nối socket
  connect(): Socket {
    if (!this.socket) {
      const token = getAccessTokenFromLocalStorage();

      this.socket = io(envConfig.NEXT_PUBLIC_API_ENDPOINT, {
        auth: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });

      // Lắng nghe các sự kiện kết nối
      this.socket.on('connect', () => {
        console.log('🔌 Socket connected:', this.socket?.id);
        this.isConnected = true;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
      });

      // Lắng nghe sự kiện auth error và reconnect với token mới
      this.socket.on('auth_error', () => {
        console.log('🔐 Auth error, reconnecting with new token...');
        this.reconnectWithNewToken();
      });
    }

    return this.socket;
  }

  // Reconnect với token mới
  reconnectWithNewToken(): void {
    if (this.socket) {
      const newToken = getAccessTokenFromLocalStorage();
      this.socket.auth = {
        Authorization: newToken ? `Bearer ${newToken}` : undefined,
      };
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // Lấy socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Kiểm tra trạng thái kết nối
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected || false;
  }

  // Đóng kết nối
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Emit event với error handling
  emit(event: string, data?: any): void {
    if (this.socket && this.isSocketConnected()) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected, cannot emit event:', event);
    }
  }

  // Listen cho event với callback
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Hủy lắng nghe event
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Tạo singleton instance
const socketManager = new SocketManager();

export default socketManager;
