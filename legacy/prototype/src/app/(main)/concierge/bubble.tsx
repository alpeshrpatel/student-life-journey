"use client";

import { Bot, User } from "lucide-react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  agentUsed?: string;
}

export const SUGGESTIONS = [
  "What should I do today?",
  "Can I afford this apartment?",
  "What should I buy when I arrive?",
  "What are my most important tasks?",
  "Where can I buy groceries?",
  "How do I get around?",
  "What should I prepare before my flight?",
];

export function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-2">
        <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
          {message.content}
        </p>
        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
          <User className="h-3.5 w-3.5" />
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15">
        <Bot className="h-3.5 w-3.5 text-accent" />
      </span>
      <div className="max-w-[85%]">
        <p className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-sm leading-relaxed shadow-sm ring-1 ring-border/60">
          {message.content}
        </p>
        {message.agentUsed && (
          <p className="mt-1 pl-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
            via {message.agentUsed}
          </p>
        )}
      </div>
    </div>
  );
}
