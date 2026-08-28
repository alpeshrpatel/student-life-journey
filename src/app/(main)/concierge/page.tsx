"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { api } from "@/lib/client";
import { Bubble, SUGGESTIONS, type ChatMessage } from "./bubble";

export default function ConciergePage() {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ messages: ChatMessage[] }>("/api/conversations/latest");
      setMessages(data.messages);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...(m ?? []), { role: "user", content: message }]);
    try {
      const data = await api<{ reply: string; agentUsed: string }>("/api/agent/chat", {
        body: { message },
      });
      setMessages((m) => [
        ...(m ?? []),
        { role: "assistant", content: data.reply, agentUsed: data.agentUsed },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...(m ?? []),
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <h1 className="mb-1 text-xl font-bold">AI Concierge</h1>
      <p className="mb-4 text-xs text-muted-foreground">
        Knows your relocation context — not a generic chatbot.
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}
            {sending && (
              <div className="flex items-center gap-2 pl-10 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking about your situation…
              </div>
            )}
            {messages.length === 0 && !sending && (
              <div className="space-y-3 rounded-xl bg-secondary/50 p-4">
                <p className="text-sm font-semibold">Try asking 👇</p>
                <ul className="space-y-2">
                  {SUGGESTIONS.slice(0, 5).map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => void send(s)}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/40"
                      >
                        “{s}”
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={sending}
            onClick={() => void send(s)}
            className="shrink-0 rounded-full border border-input bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="sticky bottom-[4.25rem] flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your move…"
          className="h-12 flex-1 rounded-full border border-input bg-background px-4 text-base shadow-md outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Send"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
