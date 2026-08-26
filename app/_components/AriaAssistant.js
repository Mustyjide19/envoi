"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  Mic,
  Search,
  Send,
  Sparkles,
  Trash2,
  Minus,
  X,
} from "lucide-react";

const STORAGE_OPEN_KEY = "envoi-aria-open";
const STORAGE_MINIMIZED_KEY = "envoi-aria-minimized";

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const MESSAGE_KIND_ICON = {
  tool_result: Search,
  proactive: Sparkles,
  action_result: CheckCircle2,
  error: AlertTriangle,
};

const CONFIRM_BUTTON_LABEL = {
  prepare_password_protection: "Protect File",
  create_external_share: "Continue",
  create_internal_share: "Confirm Share",
  create_collection: "Create Collection",
};

/* Feature: ARIA assistant (native Envoi chat widget) */
function AriaAssistant() {
  const router = useRouter();
  // Opens by default so ARIA's time-aware greeting is part of the
  // initial dashboard experience, not something hidden behind a click —
  // but a stored preference (the user closed/minimized it before) wins
  // once it loads, so dismissing ARIA actually sticks across reloads.
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState(null);
  const [greeting, setGreeting] = useState(null);
  const [quickActions, setQuickActions] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [isResolvingAction, setIsResolvingAction] = useState(false);
  const [input, setInput] = useState("");

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const storedOpen = window.localStorage.getItem(STORAGE_OPEN_KEY);
      const storedMinimized = window.localStorage.getItem(STORAGE_MINIMIZED_KEY);

      if (storedOpen !== null) setOpen(storedOpen === "true");
      if (storedMinimized !== null) setMinimized(storedMinimized === "true");
    } catch {
      // Storage can throw in some private-browsing contexts — fall back
      // to the defaults set above (open, not minimized).
    } finally {
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;

    try {
      window.localStorage.setItem(STORAGE_OPEN_KEY, String(open));
      window.localStorage.setItem(STORAGE_MINIMIZED_KEY, String(minimized));
    } catch {
      // Ignore — this is a convenience, not a requirement.
    }
  }, [open, minimized, preferencesReady]);

  useEffect(() => {
    if (!open || hasLoadedHistory) return;

    let ignore = false;
    setIsLoadingHistory(true);

    async function loadHistory() {
      try {
        const response = await fetch("/api/aria", { cache: "no-store" });
        const data = await response.json();

        if (ignore) return;

        if (!response.ok) {
          setError(data?.error || "ARIA is unavailable right now.");
          return;
        }

        setGreeting(data.greeting || null);
        setQuickActions(Array.isArray(data.quickActions) ? data.quickActions : []);

        if (data.conversation) {
          setConversationId(data.conversation.id);
          setMessages(data.conversation.messages || []);
          setPendingAction(data.conversation.pendingAction || null);
        }
      } catch {
        if (!ignore) setError("ARIA is unavailable right now.");
      } finally {
        if (!ignore) {
          setIsLoadingHistory(false);
          setHasLoadedHistory(true);
        }
      }
    }

    void loadHistory();

    return () => {
      ignore = true;
    };
  }, [open, hasLoadedHistory]);

  // Lets the rest of the app (e.g. after a successful upload) tell an
  // already-open ARIA panel to pick up a new proactive message without
  // polling — see app/(dashboard)/(routes)/upload/page.js.
  useEffect(() => {
    function handleExternalRefresh() {
      if (!open) return;
      void refreshConversation();
    }

    window.addEventListener("aria:refresh", handleExternalRefresh);
    return () => window.removeEventListener("aria:refresh", handleExternalRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function refreshConversation() {
    try {
      const response = await fetch("/api/aria", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.conversation) return;

      setConversationId(data.conversation.id);
      setMessages(data.conversation.messages || []);
      setPendingAction(data.conversation.pendingAction || null);
    } catch {
      // Best-effort refresh — a failure here just means the proactive
      // message will show next time the panel is opened/reloaded instead.
    }
  }

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, isSending, open]);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timeout);
  }, [open]);

  async function sendMessage(text, fileSelection) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setError(null);
    setInput("");
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      },
    ]);
    setIsSending(true);

    try {
      const response = await fetch("/api/aria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationId: conversationId || undefined,
          ...(fileSelection ? { fileSelection } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "ARIA hit a problem. Please try again.");
        if (data?.conversation) {
          setConversationId(data.conversation.id);
          setMessages(data.conversation.messages || []);
          setPendingAction(data.conversation.pendingAction || null);
        }
        return;
      }

      setConversationId(data.conversation.id);
      setMessages(data.conversation.messages || []);
      setPendingAction(data.conversation.pendingAction || null);
    } catch {
      setError("ARIA is unavailable right now. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function resolvePendingAction(kind) {
    if (isResolvingAction || !conversationId || !pendingAction) return;

    setIsResolvingAction(true);
    setError(null);

    try {
      const response = await fetch("/api/aria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          [kind === "confirm" ? "confirmAction" : "cancelAction"]: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "ARIA hit a problem. Please try again.");
        return;
      }

      const nextMessages = data.conversation.messages || [];
      setMessages(nextMessages);
      setPendingAction(data.conversation.pendingAction || null);

      // ARIA "gets the user there" — when a confirmed action's outcome is
      // a navigation target (e.g. password protection, which she never
      // handles herself), actually take them to the real Envoi page
      // rather than just mentioning it. Brief delay so the confirmation
      // message is visible before the page changes.
      const navigateTo = nextMessages[nextMessages.length - 1]?.navigateTo;
      if (navigateTo) {
        setTimeout(() => router.push(navigateTo), 700);
      }
    } catch {
      setError("ARIA is unavailable right now. Please try again.");
    } finally {
      setIsResolvingAction(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function handleQuickAction(action) {
    if (!action.prompt) {
      inputRef.current?.focus();
      return;
    }
    void sendMessage(action.prompt, action.fileSelection);
  }

  async function handleClearConversation() {
    if (isClearing || isSending) return;

    if (!conversationId) {
      setMessages([]);
      setError(null);
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      const response = await fetch(`/api/aria?conversationId=${encodeURIComponent(conversationId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Unable to clear this conversation. Please try again.");
        return;
      }

      setConversationId(null);
      setMessages([]);
      setPendingAction(null);
    } catch {
      setError("Unable to clear this conversation. Please try again.");
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            setOpen(true);
            setMinimized(false);
          }
        }}
        className="app-surface relative flex items-center justify-center rounded-lg border px-3 py-2 transition hover:opacity-95"
        title="Ask ARIA"
        aria-label="Open ARIA assistant"
        aria-expanded={open}
      >
        <Sparkles className="app-accent-text h-5 w-5" />
      </button>

      {open && !minimized && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {open && minimized && (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="app-surface fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border px-4 py-2.5 shadow-lg transition hover:opacity-95 sm:right-6"
          aria-label="Expand ARIA assistant"
        >
          <Sparkles className="app-accent-text h-4 w-4" />
          <span className="app-text text-sm font-medium">ARIA</span>
          <ChevronUp className="app-text-muted h-4 w-4" />
        </button>
      )}

      {open && !minimized && (
        <div
          role="dialog"
          aria-label="ARIA assistant"
          className="app-surface fixed inset-x-4 bottom-4 z-50 flex max-h-[560px] flex-col rounded-2xl border shadow-lg sm:inset-x-auto sm:right-6 sm:w-[380px]"
        >
          <div className="app-border flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="app-icon-surface flex h-8 w-8 items-center justify-center rounded-lg border">
                <Sparkles className="app-accent-text h-4 w-4" />
              </span>
              <div>
                <p className="app-text text-sm font-semibold leading-tight">ARIA</p>
                <p className="app-text-muted text-xs leading-tight">Envoi assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearConversation}
                disabled={isClearing || (!conversationId && messages.length === 0)}
                className="app-text-muted rounded-lg p-1 transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="app-text-muted rounded-lg p-1 transition hover:opacity-70"
                title="Minimize"
                aria-label="Minimize ARIA assistant"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="app-text-muted rounded-lg p-1 transition hover:opacity-70"
                aria-label="Close ARIA assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {isLoadingHistory ? (
              <p className="app-text-muted text-sm">Loading...</p>
            ) : messages.length === 0 ? (
              <div className="space-y-4">
                <p className="app-text text-sm">
                  {greeting || "Hello. What are we working on today?"}
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const KindIcon = MESSAGE_KIND_ICON[message.kind];
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        message.role === "user"
                          ? "app-accent-btn"
                          : message.kind === "error"
                            ? "border border-red-200 bg-red-50 text-red-800"
                            : "app-surface-muted app-text border"
                      }`}
                    >
                      {KindIcon && (
                        <KindIcon
                          className={`mb-1 h-3.5 w-3.5 ${
                            message.kind === "error" ? "text-red-600" : "app-accent-text"
                          }`}
                        />
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.navigateTo && (
                        <button
                          type="button"
                          onClick={() => router.push(message.navigateTo)}
                          className="app-accent-text mt-2 text-xs font-semibold underline underline-offset-2"
                        >
                          Open →
                        </button>
                      )}
                      {Array.isArray(message.quickActions) && message.quickActions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {message.quickActions.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={() => handleQuickAction(action)}
                              disabled={isSending}
                              className="app-surface rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <p
                        className={`mt-1 text-[10px] ${
                          message.role === "user" ? "text-white/70" : "app-text-muted"
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex justify-start">
                <div className="app-surface-muted app-text-muted flex items-center gap-1 rounded-2xl border px-3 py-2 text-sm">
                  <span className="animate-pulse">ARIA is thinking…</span>
                </div>
              </div>
            )}
          </div>

          {pendingAction && (
            <div className="app-border border-t px-4 py-3">
              <p className="app-text-muted mb-2 text-xs font-medium uppercase tracking-wide">
                Waiting for your confirmation
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => resolvePendingAction("confirm")}
                  disabled={isResolvingAction}
                  className="app-accent-btn flex-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResolvingAction ? "Working…" : CONFIRM_BUTTON_LABEL[pendingAction.tool] || "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => resolvePendingAction("cancel")}
                  disabled={isResolvingAction}
                  className="app-surface-muted app-text flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {quickActions.length > 0 && (
            <div
              className="app-border flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth border-t px-3 py-2"
              style={{ scrollbarWidth: "thin" }}
              role="group"
              aria-label="ARIA quick actions"
            >
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleQuickAction(action)}
                  disabled={isSending}
                  className="app-surface-muted app-text flex-shrink-0 snap-start whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  title={action.description}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="app-border border-t p-3">
            <div className="app-surface-muted flex items-end gap-2 rounded-xl border p-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask ARIA anything about your files..."
                aria-label="Message ARIA"
                className="app-text max-h-24 flex-1 resize-none bg-transparent text-sm outline-none"
              />
              {/*
                Voice-ready hook point: wire a SpeechRecognition-backed
                onClick here (and flip this button's disabled state) when
                voice input ships. No voice packages are installed yet.
              */}
              <button
                type="button"
                disabled
                title="Voice input is coming in a future update"
                aria-label="Voice input (coming soon)"
                className="app-text-muted cursor-not-allowed rounded-lg p-2 opacity-40"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                aria-label="Send message"
                className="app-accent-btn flex-shrink-0 rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default AriaAssistant;
