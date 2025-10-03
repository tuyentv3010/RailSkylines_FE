import Pusher from 'pusher-js';
import envConfig from '@/config';

let pusherClient: Pusher | null = null;

export function getPusher() {
  if (!pusherClient) {
    const key = envConfig.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = envConfig.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) {
      console.warn('Pusher env not configured. Realtime disabled.');
      return null;
    }
    pusherClient = new Pusher(key, {
      cluster,
    });
  }
  return pusherClient;
}

export function disconnectPusher() {
  if (pusherClient) {
    try {
      pusherClient.disconnect();
    } catch {}
    pusherClient = null;
  }
}

