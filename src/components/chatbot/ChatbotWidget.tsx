"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ChatbotConsole from "@/components/chatbot/ChatbotConsole";
import { cn } from "@/lib/utils";

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {!open && (
          <div className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-[#6E6E66] shadow-md ring-1 ring-black/5 backdrop-blur dark:bg-[#302F2C]/95 dark:text-[#C9C8BF] dark:ring-white/10">
            Hỏi RailSkylines AI
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở RailSkylines Copilot"
          className="group flex h-14 w-14 items-center justify-center rounded-full bg-[#D97757] text-white shadow-lg shadow-[#D97757]/30 transition-all hover:bg-[#C15F3C] hover:shadow-xl hover:shadow-[#D97757]/40 active:scale-95"
        >
          <MessageCircle className="h-6 w-6 transition-transform group-hover:scale-110" />
        </button>
      </div>
      <DialogContent
        className={cn(
          "max-w-4xl w-[95vw] gap-0 overflow-hidden border-none p-0 shadow-2xl",
          "h-[80vh] bg-[#FAF9F5] dark:bg-[#262624]"
        )}
      >
        <DialogHeader className="flex-shrink-0 flex-row items-center gap-3 space-y-0 border-b border-[#EDEAE0] px-5 py-3.5 dark:border-[#3A3936]">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#D97757] text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex flex-col text-left">
            <DialogTitle className="text-[15px] font-semibold text-[#2A2A28] dark:text-[#F5F4EE]">
              RailSkylines Copilot
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6E6E66] dark:text-[#A8A79E]">
              Trợ lý AI · hỏi về bài viết, khuyến mãi hoặc trò chuyện
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="h-[calc(80vh-4.25rem)]">
          <ChatbotConsole variant="embedded" className="h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatbotWidget;
