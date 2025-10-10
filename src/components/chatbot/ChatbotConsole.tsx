"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatConversation, ChatMessage, ChatSource } from "@/types/chatbot";
import envConfig from "@/config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Loader2,
  MessageCircle,
  RotateCw,
  Send,
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading chatbot workspace...</span>
        </div>
      </main>
    );
  }

  return (
    <Container className={rootClassName}>
      <div className="flex h-full w-full flex-col gap-4 xl:flex-row max-h-[580px]">
        <aside
          className={cn(
            "flex flex-col overflow-hidden rounded-lg border bg-background",
            "xl:w-[300px]",
            panelHeightClass
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="h-4 w-4" />
              Sessions
            </div>
            <Button size="sm" onClick={handleNewConversation}>
              New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
                No conversations yet.
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
                          "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                        onClick={() =>
                          handleSelectConversation(conversation.id)
                        }
                      >
                        <span className="line-clamp-1 font-medium">
                          {conversation.title || DEFAULT_TITLE}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteConversation(conversation.id);
                          }}
                          disabled={conversations.length <= 1}
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <span>{conversations.length} session(s)</span>
            <Button variant="outline" size="sm" onClick={handleClearHistory}>
              Clear all
            </Button>
          </div>
        </aside>
        <section
          className={cn(
            "flex flex-col overflow-hidden rounded-lg border bg-background h-full",
            "flex-1 min-h-0",
            panelHeightClass
          )}
        >
          <header className="flex-shrink-0 flex items-center justify-between border-b px-4 py-3">
            <div>
              <h1 className="text-base font-semibold">RailSkylines Copilot</h1>
              <p className="text-xs text-muted-foreground">
                {isStreaming
                  ? "Generating response�"
                  : activeConversation.route
                  ? `Semantic route: ${activeConversation.route}`
                  : "Ask about articles or just chat�I'll route for you."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canRegenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  className="gap-1"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
              {isStreaming ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStop}
                  className="gap-1"
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </Button>
              ) : null}
            </div>
          </header>
          <div
            ref={chatContainerRef}
            className="flex-1 min-h-0 space-y-4 overflow-y-auto px-4 py-4 text-sm"
          >
            {activeConversation.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <MessageCircle className="h-10 w-10" />   
                <p className="max-w-sm text-sm">
                  Start by asking about articles, promotions, or just say hi. I
                  will search the knowledge base and stream responses instantly.
                </p>
              </div>
            ) : (
              activeConversation.messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "flex max-w-[80%] flex-col gap-1",
                        isUser ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "whitespace-pre-wrap break-words rounded-2xl px-4 py-2",
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {message.content || (message.pending ? "..." : "")}
                        {message.pending && (
                          <span className="ml-1 inline-block animate-pulse">
                            |
                          </span>
                        )}
                      </div>
                      {!isUser && message.error && (
                        <span className="text-xs text-destructive">
                          {message.error}
                        </span>
                      )}
                      {!isUser && message.interrupted && !message.error && (
                        <span className="text-xs text-muted-foreground">
                          Generation paused.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {activeConversation.sources.length > 0 && (
            <div className="flex-shrink-0 border-t bg-muted/40 px-4 py-3 max-h-64 overflow-y-auto">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-semibold">Suggested sources</span>
                {activeConversation.route && (
                  <Badge
                    variant="outline"
                    className="text-xs uppercase tracking-wide"
                  >
                    {activeConversation.route}
                  </Badge>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeConversation.sources.map((source) => (
                  <article
                    key={`${source.articleId}-${source.title}`}
                    className="flex flex-col gap-2 rounded-md border bg-background p-3 text-xs"
                  >
                    <div className="font-semibold text-sm">{source.title}</div>
                    {source.thumbnail ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="group relative h-32 overflow-hidden rounded-md border bg-muted">
                            <img
                              src={source.thumbnail}
                              alt={source.title}
                              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                            />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl overflow-hidden p-0">
                          <img
                            src={source.thumbnail}
                            alt={source.title}
                            className="h-full w-full object-contain"
                          />
                        </DialogContent>
                      </Dialog>
                    ) : null}
                    {source.preview && (
                      <p className="line-clamp-3 text-muted-foreground">
                        {source.preview}
                      </p>
                    )}
                    <div className="text-muted-foreground">
                      Match score: {source.score.toFixed(2)}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
          <footer className="flex-shrink-0 border-t px-4 py-3">
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about RailSkylines articles..."
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Press Shift + Enter for a new line</span>
                <div className="flex items-center gap-2">
                  {isStreaming && (
                    <Badge variant="outline" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Streaming
                    </Badge>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || Boolean(isStreaming)}
                    className="gap-1"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </Button>
                </div>
              </div>
            </form>
          </footer>
        </section>
      </div>
    </Container>
  );
};

export default ChatbotConsole;
