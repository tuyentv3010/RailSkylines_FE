// src/schemaValidations/article.schema.ts
import { z } from "zod";

// Schema for creating an article
export const CreateArticleBody = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  thumbnail: z.string().url("Must be a valid URL").optional(),
});

export type CreateArticleBodyType = z.TypeOf<typeof CreateArticleBody>;

// Schema for updating an article
export const UpdateArticleBody = z.object({
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().min(1, "Content is required").optional(),
  thumbnail: z.string().url("Must be a valid URL").optional(),
});

export type UpdateArticleBodyType = z.TypeOf<typeof UpdateArticleBody>;

// Schema for a single article
export const ArticleSchema = z.object({
  articleId: z.number(),
  title: z.string(),
  content: z.string(),
  thumbnail: z.string().nullish(),
  userId: z.number().optional(),
  user: z
    .object({
      userId: z.number(),
      fullName: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export type ArticleSchemaType = z.TypeOf<typeof ArticleSchema>;

// Schema for single article response
export const ArticleRes = z.object({
  status: z.number(),
  statusCode: z.number(),
  error: z.string().nullable(),
  message: z.string(),
  data: ArticleSchema.nullable(),
});

export type ArticleResType = z.TypeOf<typeof ArticleRes>;

// Schema for article list response
export const ArticleListRes = z.object({
  statusCode: z.number(),
  error: z.string().nullable(),
  message: z.string(),
  data: z.object({
    meta: z.object({
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
    }),
    result: z.array(ArticleSchema),
  }),
});

export type ArticleListResType = z.TypeOf<typeof ArticleListRes>;

// Schema for article parameters (e.g., ID in URL)
export const ArticleParams = z.object({
  articleId: z.coerce.number(),
});

export type ArticleParamsType = z.TypeOf<typeof ArticleParams>;
