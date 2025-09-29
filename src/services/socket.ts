import envConfig from "@/config";
import { io } from "socket.io-client";
import { getAccessTokenFromLocalStorage } from "@/lib/utils"; // adjust path if needed

export const ARTICLE_EVENTS = {
  ARTICLE_CREATED: "ARTICLE_CREATED",
  ARTICLE_UPDATED: "ARTICLE_UPDATED",
  ARTICLE_DELETED: "ARTICLE_DELETED",
} as const;

const socket = io(envConfig.NEXT_PUBLIC_API_ENDPOINT, {
  auth: {
    Authorization: `Bearer ${getAccessTokenFromLocalStorage()}`,
  },
});

export const articleSocket = {
  // emitters
  emitArticleCreated(article: any) {
    socket.emit(ARTICLE_EVENTS.ARTICLE_CREATED, article);
  },
  emitArticleUpdated(article: any) {
    socket.emit(ARTICLE_EVENTS.ARTICLE_UPDATED, article);
  },
  emitArticleDeleted(articleId: number) {
    socket.emit(ARTICLE_EVENTS.ARTICLE_DELETED, articleId);
  },

  // listeners
  onArticleCreated(cb: (article: any) => void) {
    socket.on(ARTICLE_EVENTS.ARTICLE_CREATED, cb);
  },
  onArticleUpdated(cb: (article: any) => void) {
    socket.on(ARTICLE_EVENTS.ARTICLE_UPDATED, cb);
  },
  onArticleDeleted(cb: (articleId: number) => void) {
    socket.on(ARTICLE_EVENTS.ARTICLE_DELETED, cb);
  },

  // cleanup
  cleanup() {
    socket.off(ARTICLE_EVENTS.ARTICLE_CREATED);
    socket.off(ARTICLE_EVENTS.ARTICLE_UPDATED);
    socket.off(ARTICLE_EVENTS.ARTICLE_DELETED);
  },
};

export default socket;
