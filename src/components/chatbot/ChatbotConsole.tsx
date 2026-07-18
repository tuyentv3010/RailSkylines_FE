"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatConversation, ChatMessage, ChatSource } from "@/types/chatbot";
import envConfig from "@/config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Loader2,
  MessageCircle,
  Plus,
  RotateCw,
  Send,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";

type StreamState = {
  conversationId: string;
  messageId: string;
  controller: AbortController;
};

const STORAGE_KEY = "railskylines-chat-sessions";
const DEFAULT_TITLE = "New conversation";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `conv-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const createEmptyConversation = (): ChatConversation => ({
  id: createId(),
  title: DEFAULT_TITLE,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
  sources: [],
});

type ParsedEvent = {
  event: string;
  data: string;
};

const parseEventBlock = (block: string): ParsedEvent => {
  const lines = block.split("\n");
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5));
    }
  }
  return {
    event,
    data: dataLines.join("\n").trim(),
  };
};

const normalizeSource = (raw: any): ChatSource => ({
  articleId: Number(raw?.articleId ?? 0),
  title:
    typeof raw?.title === "string" && raw.title.trim()
      ? raw.title
      : "Untitled article",
  preview: typeof raw?.preview === "string" ? raw.preview : "",
  thumbnail:
    typeof raw?.thumbnail === "string" && raw.thumbnail.trim()
      ? raw.thumbnail
      : null,
  score:
    typeof raw?.score === "number"
      ? raw.score
      : typeof raw?.score === "string"
      ? Number.parseFloat(raw.score)
      : 0,
});

const messageToPayload = (message: ChatMessage) => ({
  role: message.role,
  content: message.content,
});

const truncateTitle = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_TITLE;
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
};

type ChatbotConsoleProps = {
  variant?: "page" | "embedded";
  className?: string;
};

const ChatbotConsole = ({
  variant = "page",
  className,
}: ChatbotConsoleProps) => {
  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streamState, setStreamState] = useState<StreamState | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const endpoint = useMemo(
    () => `${envConfig.NEXT_PUBLIC_API_ENDPOINT}/api/v1/chat/stream`,
    []
  );

  const Container = "div";
  const rootClassName = cn(
    "flex h-full w-full flex-col gap-4 p-4",
    variant === "embedded" ? "md:gap-6" : "sm:px-6 sm:py-0 md:gap-6",
    className
  );
  const panelHeightClass = "flex-1 min-h-0";

  const applyToConversation = useCallback(
    (id: string, updater: (draft: ChatConversation) => void) => {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== id) return conversation;
          const draft: ChatConversation = {
            ...conversation,
            messages: conversation.messages.map((message) => ({ ...message })),
            sources: conversation.sources.map((source) => ({ ...source })),
          };
          updater(draft);
          return {
            ...draft,
            updatedAt: Date.now(),
          };
        })
      );
    },
    []
  );

  const loadFromStorage = useCallback(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createEmptyConversation();
      setConversations([initial]);
      setActiveId(initial.id);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as ChatConversation[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const initial = createEmptyConversation();
        setConversations([initial]);
        setActiveId(initial.id);
        return;
      }
      const normalized = parsed.map((conversation) => ({
        ...conversation,
        id: conversation.id || createId(),
        title: conversation.title || DEFAULT_TITLE,
        messages: Array.isArray(conversation.messages)
          ? conversation.messages.map((message) => ({
              ...message,
              id: message.id || createId(),
              pending: false,
              interrupted: false,
              error: null,
            }))
          : [],
        sources: Array.isArray(conversation.sources)
          ? conversation.sources.map((source) => normalizeSource(source))
          : [],
      }));
      setConversations(normalized);
      setActiveId(normalized[0]?.id ?? null);
    } catch (error) {
      console.error("Failed to parse chat history", error);
      const initial = createEmptyConversation();
      setConversations([initial]);
      setActiveId(initial.id);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
    setHydrated(true);
  }, [loadFromStorage]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, hydrated]);

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [conversations, activeId]
  );

  useEffect(() => {
    if (!chatContainerRef.current) return;
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [activeConversation?.messages.length]);

  const resetStreamingState = useCallback((controller: AbortController) => {
    setStreamState((current) => {
      if (current && current.controller === controller) {
        return null;
      }
      return current;
    });
  }, []);

  const streamChat = useCallback(
    async (
      conversationId: string,
      messageId: string,
      history: ChatMessage[],
      controller: AbortController
    ) => {
      const payload = {
        messages: history
          .filter(
            (message) => message.content && message.content.trim().length > 0
          )
          .map(messageToPayload),
      };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const errorText = response.body ? await response.text() : "";
          throw new Error(
            errorText || `Chat request failed with status ${response.status}`
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let doneStreaming = false;

        const processBuffer = () => {
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            const { event, data } = parseEventBlock(trimmed);
            if (event === "metadata") {
              try {
                const parsed = JSON.parse(data || "{}");
                const route =
                  typeof parsed.route === "string" ? parsed.route : undefined;
                const sources = Array.isArray(parsed.sources)
                  ? parsed.sources.map((source: any) => normalizeSource(source))
                  : [];
                applyToConversation(conversationId, (draft) => {
                  draft.route = route;
                  draft.sources = sources;
                });
              } catch (error) {
                console.warn("Unable to parse metadata event", error);
              }
            } else if (event === "chunk") {
              if (!data) continue;
              try {
                const parsed = JSON.parse(data);
                const delta =
                  typeof parsed?.delta === "string" ? parsed.delta : "";
                if (!delta) continue;
                applyToConversation(conversationId, (draft) => {
                  const index = draft.messages.findIndex(
                    (message) => message.id === messageId
                  );
                  if (index === -1) return;
                  const current = draft.messages[index];
                  draft.messages[index] = {
                    ...current,
                    content: (current.content || "") + delta,
                  };
                });
              } catch (error) {
                console.warn("Unable to parse chunk event", error);
              }
            } else if (event === "error") {
              let message = "Chat service is currently unavailable.";
              try {
                const parsed = JSON.parse(data || "{}");
                if (parsed?.message) {
                  message = String(parsed.message);
                }
              } catch (error) {
                // ignore parse error and use default message
              }
              applyToConversation(conversationId, (draft) => {
                const index = draft.messages.findIndex(
                  (msg) => msg.id === messageId
                );
                if (index === -1) return;
                const current = draft.messages[index];
                draft.messages[index] = {
                  ...current,
                  pending: false,
                  error: message,
                };
              });
              doneStreaming = true;
            } else if (event === "done") {
              applyToConversation(conversationId, (draft) => {
                const index = draft.messages.findIndex(
                  (msg) => msg.id === messageId
                );
                if (index === -1) return;
                const current = draft.messages[index];
                draft.messages[index] = {
                  ...current,
                  pending: false,
                };
              });
              resetStreamingState(controller);
              doneStreaming = true;
            }
          }
        };

        while (!doneStreaming) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          processBuffer();
        }

        if (!doneStreaming) {
          buffer += decoder.decode();
          processBuffer();
          resetStreamingState(controller);
          applyToConversation(conversationId, (draft) => {
            const index = draft.messages.findIndex(
              (msg) => msg.id === messageId
            );
            if (index === -1) return;
            const current = draft.messages[index];
            draft.messages[index] = {
              ...current,
              pending: false,
            };
          });
        }
      } catch (error: any) {
        if (controller.signal.aborted) {
          applyToConversation(conversationId, (draft) => {
            const index = draft.messages.findIndex(
              (msg) => msg.id === messageId
            );
            if (index === -1) return;
            const current = draft.messages[index];
            draft.messages[index] = {
              ...current,
              pending: false,
              interrupted: true,
            };
          });
        } else {
          const message = error?.message || "Unexpected error occurred.";
          applyToConversation(conversationId, (draft) => {
            const index = draft.messages.findIndex(
              (msg) => msg.id === messageId
            );
            if (index === -1) return;
            const current = draft.messages[index];
            draft.messages[index] = {
              ...current,
              pending: false,
              error: message,
            };
          });
        }
      } finally {
        resetStreamingState(controller);
      }
    },
    [applyToConversation, endpoint, resetStreamingState]
  );

  const startAssistantResponse = useCallback(
    (conversationId: string, baseMessages: ChatMessage[]) => {
      if (streamState) {
        // Prevent multiple simultaneous requests per page; allow sequential only
        return;
      }
      const history = baseMessages.map((message) => ({
        ...message,
        pending: false,
        interrupted: false,
        error: null,
      }));
      const placeholderId = createId();
      const controller = new AbortController();

      applyToConversation(conversationId, (draft) => {
        draft.messages = [
          ...history,
          { id: placeholderId, role: "assistant", content: "", pending: true },
        ];
        draft.sources = [];
        draft.route = undefined;
      });

      setStreamState({ conversationId, messageId: placeholderId, controller });
      void streamChat(conversationId, placeholderId, history, controller);
    },
    [applyToConversation, streamChat, streamState]
  );

  const handleSend = useCallback(() => {
    if (!activeConversation || !input.trim()) return;
    if (streamState && streamState.conversationId === activeConversation.id) {
      return;
    }
    const text = input.trim();
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: text,
    };
    setInput("");
    applyToConversation(activeConversation.id, (draft) => {
      draft.messages.push(userMessage);
      if (draft.title === DEFAULT_TITLE) {
        draft.title = truncateTitle(text);
      }
    });
    const history = [...(activeConversation?.messages ?? []), userMessage];
    startAssistantResponse(activeConversation.id, history);
  }, [
    activeConversation,
    applyToConversation,
    input,
    startAssistantResponse,
    streamState,
  ]);

  const handleStop = useCallback(() => {
    if (streamState) {
      streamState.controller.abort();
    }
  }, [streamState]);

  const handleRegenerate = useCallback(() => {
    if (!activeConversation || streamState) return;
    const messages = activeConversation.messages;
    const lastAssistantIndex = [...messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find((item) => item.message.role === "assistant")?.index;
    if (lastAssistantIndex === undefined) return;
    const history = messages
      .filter((_, index) => index !== lastAssistantIndex)
      .map((message) => ({
        ...message,
        pending: false,
        interrupted: false,
        error: null,
      }));
    applyToConversation(activeConversation.id, (draft) => {
      draft.messages = history;
      draft.sources = [];
      draft.route = undefined;
    });
    startAssistantResponse(activeConversation.id, history);
  }, [
    activeConversation,
    applyToConversation,
    startAssistantResponse,
    streamState,
  ]);

  const handleNewConversation = () => {
    if (streamState) {
      streamState.controller.abort();
    }
    const conversation = createEmptyConversation();
    setConversations((prev) => [conversation, ...prev]);
    setActiveId(conversation.id);
    setInput("");
  };

  const handleSelectConversation = (id: string) => {
    if (streamState && streamState.conversationId === id) return;
    setActiveId(id);
    setInput("");
  };

  const handleClearHistory = () => {
    if (streamState) {
      streamState.controller.abort();
    }
    const conversation = createEmptyConversation();
    setConversations([conversation]);
    setActiveId(conversation.id);
    setInput("");
  };

  const handleDeleteConversation = (id: string) => {
    if (streamState && streamState.conversationId === id) {
      streamState.controller.abort();
    }
    setConversations((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (filtered.length === 0) {
        const conversation = createEmptyConversation();
        setActiveId(conversation.id);
        return [conversation];
      }
      if (activeId === id) {
        setActiveId(filtered[0].id);
      }
      return filtered;
    });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSend();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const isStreaming =
    streamState &&
    activeConversation &&
    streamState.conversationId === activeConversation.id;
  const canRegenerate = useMemo(() => {
    if (!activeConversation || isStreaming) return false;
    const lastAssistant = [...activeConversation.messages]
      .reverse()
      .find((message) => message.role === "assistant");
    if (!lastAssistant) return false;
    return Boolean(lastAssistant.error || lastAssistant.interrupted);
  }, [activeConversation, isStreaming]);

  if (!hydrated || !activeConversation) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="flex items-center gap-2 text-[#6E6E66] dark:text-[#A8A79E]">
          <Loader2 className="h-4 w-4 animate-spin text-[#D97757]" />
          <span className="text-sm">Đang tải trợ lý...</span>
        </div>
      </main>
    );
  }

  const showHeader =
    variant === "page" ||
    Boolean(isStreaming) ||
    Boolean(activeConversation.route) ||
    canRegenerate;

  return (
    <Container className={rootClassName}>
      <div className="flex h-full w-full flex-col gap-4 xl:flex-row max-h-[580px]">
        {/* Sessions sidebar */}
        <aside
          className={cn(
            "flex flex-col overflow-hidden rounded-2xl border border-[#EDEAE0] bg-[#F5F4EE] dark:border-[#3A3936] dark:bg-[#1F1E1D]",
            "xl:w-[280px]",
            panelHeightClass
          )}
        >
          <div className="flex items-center justify-between border-b border-[#EDEAE0] px-4 py-3 dark:border-[#3A3936]">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2A2A28] dark:text-[#F5F4EE]">
              <MessageCircle className="h-4 w-4 text-[#D97757]" />
              Trò chuyện
            </div>
            <Button
              size="sm"
              onClick={handleNewConversation}
              className="h-8 gap-1 rounded-full bg-[#D97757] px-3 text-white shadow-sm hover:bg-[#C15F3C]"
            >
              <Plus className="h-3.5 w-3.5" />
              Mới
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex h-full items-center justify-center px-4 text-sm text-[#6E6E66] dark:text-[#A8A79E]">
                Chưa có cuộc trò chuyện nào.
              </div>
            ) : (
              <ul className="space-y-1 px-2 py-3">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === activeConversation.id;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-[#D97757]/15 text-[#C15F3C] dark:bg-[#D97757]/25 dark:text-[#E8896B]"
                            : "text-[#3D3D3A] hover:bg-[#EAE8DF] dark:text-[#C9C8BF] dark:hover:bg-[#302F2C]"
                        )}
                        onClick={() =>
                          handleSelectConversation(conversation.id)
                        }
                      >
                        <span className="line-clamp-1 font-medium">
                          {conversation.title || DEFAULT_TITLE}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[#9A9A90] transition-colors hover:bg-black/5 hover:text-[#C15F3C] dark:hover:bg-white/10"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteConversation(conversation.id);
                          }}
                          aria-label="Xóa cuộc trò chuyện"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-[#EDEAE0] px-4 py-3 text-xs text-[#6E6E66] dark:border-[#3A3936] dark:text-[#A8A79E]">
            <span>{conversations.length} phiên</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              className="h-7 rounded-full border-[#E0DDD2] bg-transparent text-[#6E6E66] hover:bg-[#EAE8DF] hover:text-[#C15F3C] dark:border-[#3A3936] dark:text-[#A8A79E] dark:hover:bg-[#302F2C]"
            >
              Xóa hết
            </Button>
          </div>
        </aside>

        {/* Chat panel */}
        <section
          className={cn(
            "flex flex-col overflow-hidden rounded-2xl border border-[#EDEAE0] bg-white dark:border-[#3A3936] dark:bg-[#262624] h-full",
            "flex-1 min-h-0",
            panelHeightClass
          )}
        >
          {showHeader && (
            <header className="flex-shrink-0 flex items-center justify-between gap-2 border-b border-[#EDEAE0] px-4 py-2.5 dark:border-[#3A3936]">
              <div className="min-w-0">
                {variant === "page" && (
                  <h1 className="text-sm font-semibold text-[#2A2A28] dark:text-[#F5F4EE]">
                    RailSkylines Copilot
                  </h1>
                )}
                <p className="truncate text-xs text-[#6E6E66] dark:text-[#A8A79E]">
                  {isStreaming ? (
                    <span className="inline-flex items-center gap-1.5 text-[#C15F3C] dark:text-[#E8896B]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D97757]" />
                      Đang trả lời...
                    </span>
                  ) : activeConversation.route ? (
                    `Định tuyến: ${activeConversation.route}`
                  ) : (
                    "Hỏi về bài viết hoặc trò chuyện — tôi sẽ tự định tuyến."
                  )}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {canRegenerate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    className="h-8 gap-1 rounded-full border-[#E0DDD2] text-[#6E6E66] hover:bg-[#F5F4EE] hover:text-[#C15F3C] dark:border-[#3A3936] dark:text-[#A8A79E] dark:hover:bg-[#302F2C]"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Thử lại
                  </Button>
                )}
                {isStreaming ? (
                  <Button
                    size="sm"
                    onClick={handleStop}
                    className="h-8 gap-1 rounded-full bg-[#D97757] text-white hover:bg-[#C15F3C]"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Dừng
                  </Button>
                ) : null}
              </div>
            </header>
          )}
          <div
            ref={chatContainerRef}
            className="flex-1 min-h-0 space-y-5 overflow-y-auto px-4 py-5 text-sm"
          >
            {activeConversation.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D97757]/12 text-[#D97757] dark:bg-[#D97757]/20">
                  <Sparkles className="h-7 w-7" />
                </span>
                <p className="max-w-sm text-sm text-[#6E6E66] dark:text-[#A8A79E]">
                  Bắt đầu bằng cách hỏi về bài viết, khuyến mãi, hoặc chỉ cần
                  chào một câu. Tôi sẽ tìm trong kho tri thức và trả lời ngay.
                </p>
              </div>
            ) : (
              activeConversation.messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full items-end gap-2",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isUser && (
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#D97757] text-white">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div
                      className={cn(
                        "flex max-w-[80%] flex-col gap-1",
                        isUser ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm",
                          isUser
                            ? "rounded-br-md bg-[#D97757] text-white"
                            : "rounded-bl-md border border-[#EDEAE0] bg-[#F5F4EE] text-[#2A2A28] dark:border-[#3A3936] dark:bg-[#302F2C] dark:text-[#F5F4EE]"
                        )}
                      >
                        {message.content}
                        {message.pending &&
                          (message.content ? (
                            <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-middle" />
                          ) : (
                            <span className="inline-flex items-center gap-1 py-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                            </span>
                          ))}
                      </div>
                      {!isUser && message.error && (
                        <span className="text-xs text-red-500">
                          {message.error}
                        </span>
                      )}
                      {!isUser && message.interrupted && !message.error && (
                        <span className="text-xs text-[#9A9A90]">
                          Đã tạm dừng.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <footer className="flex-shrink-0 border-t border-[#EDEAE0] px-4 py-3 dark:border-[#3A3936]">
            <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
              <div className="flex items-end gap-2 rounded-2xl border border-[#E5E2D7] bg-[#FAF9F5] px-3 py-2 transition-colors focus-within:border-[#D97757] dark:border-[#3A3936] dark:bg-[#1F1E1D]">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Hỏi bất cứ điều gì về RailSkylines..."
                  rows={2}
                  className="min-h-0 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-[#F5F4EE]"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || Boolean(isStreaming)}
                  className="h-9 w-9 flex-shrink-0 rounded-full bg-[#D97757] text-white hover:bg-[#C15F3C] disabled:opacity-40"
                  aria-label="Gửi"
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <span className="px-1 text-[11px] text-[#9A9A90] dark:text-[#77766E]">
                Nhấn Shift + Enter để xuống dòng
              </span>
            </form>
          </footer>
        </section>
      </div>
    </Container>
  );
};

export default ChatbotConsole;
