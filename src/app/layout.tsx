import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
// import AppProvider from "@/components/app-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import NextTopLoader from "nextjs-toploader";
import Footer from "@/components/footer";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import { baseOpenGraph } from "@/shared-metadata";
import GoogleTag from "@/components/google-tag";
import { AppProvider } from "@/components/app-provider";
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("HomePage");
  return {
    title: {
      template: `%s | ${t("title")}`,
      default: t("defaultTitle"),
    },
    openGraph: {
      ...baseOpenGraph,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <NextTopLoader showSpinner={false} color="hsl(var(--foreground))" />
        <NextIntlClientProvider messages={messages}>
          <AppProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <ChatbotWidget />
              <Footer />
              <Toaster />
            </ThemeProvider>
          </AppProvider>
        </NextIntlClientProvider>
        <GoogleTag />
      </body>
    </html>
  );
}


