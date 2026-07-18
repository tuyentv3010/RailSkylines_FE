"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useGetPromotionList } from "@/queries/usePromotion";
import { PromotionSchemaType } from "@/schemaValidations/promotion.schema";
import {
  AlertTriangle,
  Calendar,
  Check,
  Copy,
  Loader2,
  Percent,
  Tag,
  TicketPercent,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

function PromotionCard({ promo }: { promo: PromotionSchemaType }) {
  const t = useTranslations("PromotionPage");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(promo.promotionCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between bg-[#0087C4] px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <TicketPercent className="h-5 w-5" />
          <h3 className="line-clamp-1 text-lg font-semibold">
            {promo.promotionName}
          </h3>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
          <Percent className="h-4 w-4" />
          {promo.discount}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {promo.promotionDescription ? (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {promo.promotionDescription}
          </p>
        ) : null}

        <div className="mt-auto space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {t("startDate")}: {formatDate(promo.startDate)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {t("validUntil")}: {formatDate(promo.validity)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-dashed border-[#0087C4] bg-[#0087C4]/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#0087C4]" />
            <span className="font-mono font-semibold tracking-wide">
              {promo.promotionCode}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#0087C4] transition-colors hover:bg-[#0087C4]/10"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                {t("copied")}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                {t("copy")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromotionPage() {
  const t = useTranslations("PromotionPage");
  // BE GET /api/v1/promotions is public; fetch a page and show active ones.
  const { data, isLoading, isError } = useGetPromotionList(1, 50);

  const promotions: PromotionSchemaType[] = (
    (data?.payload as any)?.data?.result ?? []
  ).filter((p: PromotionSchemaType) => p.status === "active");

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
      ) : promotions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <TicketPercent className="h-10 w-10" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {promotions.map((promo) => (
            <PromotionCard key={promo.promotionId} promo={promo} />
          ))}
        </div>
      )}
    </div>
  );
}
