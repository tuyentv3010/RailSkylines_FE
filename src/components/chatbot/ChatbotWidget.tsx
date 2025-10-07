"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <div className="rounded-lg bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
            Hoi RailSkylines AI
          </div>
        )}
        <Button
          size="lg"
          className="h-14 w-14 rounded-full p-0 shadow-lg"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
      <DialogContent
        className={cn(
          "max-w-4xl w-[95vw] overflow-hidden border-none p-0 shadow-xl",
          "h-[80vh]"
        )}
      >
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-base font-semibold">
            RailSkylines Copilot
          </DialogTitle>
          <DialogDescription className="sr-only">
            Chat with RailSkylines AI assistant
          </DialogDescription>
        </DialogHeader>
        <div className="h-[calc(100%-3.25rem)]">
          <ChatbotConsole variant="embedded" className="h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatbotWidget;
