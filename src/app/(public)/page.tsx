import { htmlToTextForDescription } from "@/lib/utils";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import envConfig from "@/config";
import Train from "@/app/(public)/train";
import SearchTicket from "./search-ticket";
import ArticleList from "@/components/article-list";
import PromotionDisplay from "@/components/promotionDisplay";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("HomePage");
  return {
    title: t("title"),
    description: htmlToTextForDescription(t("description")),
    alternates: {
      canonical: envConfig.NEXT_PUBLIC_URL,
    },
  };
}

export default async function Home() {
  const t = await getTranslations("HomePage");
  return (
    <div className="w-full space-y-4">
      <div className="relative z-10 min-h-[450px]">
        <span className="absolute top-0 left-0 z-10 h-full w-full bg-black opacity-10" />
        <Image
          src="/banner3.png"
          width={900}
          height={300}
          quality={100}
          alt="Banner"
          className="absolute top-0 h-full w-full object-cover opacity-80"
        />
        <div className="relative z-20 px-4 py-10 sm:px-10 md:px-20 md:py-20">
          <h1 className="text-center text-xl font-bold text-white sm:text-2xl md:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-center text-sm text-white sm:text-base">
            {t("description")}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 z-30 h-[70px] w-full bg-white/30">
          <div className="w-full py-4">
            <Train />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4">
        <div className="w-full rounded-lg border bg-white p-4 shadow-md">
          <SearchTicket />
        </div>
        <div className="col-span-2 rounded-lg border bg-white p-4 shadow-md">
          <div className="text-sm font-medium">
            <Image
              src="/banner2.jpg"
              width={1000}
              height={1000}
              quality={100}
              alt="Train Head"
              className="h-auto w-full"
            />
          </div>
        </div>
        <div className="w-full rounded-lg border bg-white p-4 shadow-md">
          <PromotionDisplay />
        </div>
      </div>

      <section className="space-y-10 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <ArticleList />
        </div>
      </section>
    </div>
  );
}
