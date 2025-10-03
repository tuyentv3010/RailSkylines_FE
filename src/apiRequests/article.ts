// apiRequests/article.ts
import http from "@/lib/http";
import {
  ArticleListResType,
  ArticleResType,
  CreateArticleBodyType,
  UpdateArticleBodyType,
} from "@/schemaValidations/article.schema";

const prefix = "/api/v1/articles";

const normalizeArticlePayload = <T extends { statusCode: number; error: string | null; message: string; data: any }>(
  response: { status: number; payload: any }
): { status: number; payload: T } => {
  const { status, payload } = response;

  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "statusCode" in payload &&
    "data" in payload
  ) {
    return response as { status: number; payload: T };
  }

  const message = typeof payload === "string" ? payload : "";
  const data =
    payload === null || typeof payload === "string"
      ? null
      : payload;

  return {
    status,
    payload: {
      status,
      statusCode: status,
      error: null,
      message,
      data,
    } as T,
  };
};

const articlesApiRequest = {
  listArticle: (page: number = 1, size: number = 10) =>
    http
      .get<ArticleListResType>(`${prefix}?page=${page}&size=${size}`)
      .then((response) => normalizeArticlePayload<ArticleListResType>(response)),
  addArticle: (body: CreateArticleBodyType) =>
    http
      .post<ArticleResType>(`${prefix}`, body)
      .then((response) => normalizeArticlePayload<ArticleResType>(response)),
  updateArticle: (id: number, body: UpdateArticleBodyType) =>
    http
      .put<ArticleResType>(`${prefix}/${id}`, body)
      .then((response) => normalizeArticlePayload<ArticleResType>(response)),
  getArticle: (id: number) =>
    http
      .get<ArticleResType>(`${prefix}/${id}`)
      .then((response) => normalizeArticlePayload<ArticleResType>(response)),
  deleteArticle: (id: number) =>
    http
      .delete<ArticleResType>(`${prefix}/${id}`)
      .then((response) => normalizeArticlePayload<ArticleResType>(response)),
};

export default articlesApiRequest;
