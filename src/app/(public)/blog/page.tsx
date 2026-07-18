"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useGetArticleList } from "@/queries/useArticle";
import { ArticleSchemaType } from "@/schemaValidations/article.schema";
import { generateSlugUrl } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Loader2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 9;

// Strip HTML tags to build a plain-text excerpt from rich content
const toExcerpt = (html: string, max = 160) => {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

function ArticleCard({ article }: { article: ArticleSchemaType }) {
  const t = useTranslations("BlogPage");
  const href = `/article/${generateSlugUrl({
    name: article.title,
    id: article.articleId,
  })}`;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-video w-full overflow-hidden bg-muted">
        {article.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.thumbnail}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Newspaper className="h-10 w-10" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="line-clamp-2 text-lg font-semibold group-hover:text-[#0087C4]">
          {article.title}
        </h2>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {toExcerpt(article.content)}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {t("by")} {article.user?.fullName ?? "RailSkyLines"}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#0087C4]">
            {t("readMore")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const t = useTranslations("BlogPage");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGetArticleList(page, PAGE_SIZE);

  const articles = data?.payload.data.result ?? [];
  const total = data?.payload.data.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#0087C4]" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-red-600">
          <AlertTriangle className="h-8 w-8" />
          <p>{t("loadError")}</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <Newspaper className="h-10 w-10" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.articleId} article={article} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {"<"}
              </Button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {">"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
