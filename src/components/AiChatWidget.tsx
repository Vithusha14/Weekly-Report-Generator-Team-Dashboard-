"use client";

import { useState } from "react";

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!message.trim()) return;
    const userMsg = message.trim();
    setMessage("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.reply || data.error || "No response" },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Request failed" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <div className="mb-2 flex h-96 w-[22rem] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-xl">
          <div className="border-b border-[var(--border)] bg-[var(--ink)] px-3 py-2 text-sm text-white">
            Team AI assistant
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.length === 0 && (
              <p className="text-[var(--muted)]">
                Ask about last week&apos;s work, blockers, or submission gaps.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-lg bg-[var(--accent-soft)] px-2 py-1.5"
                    : "mr-4 rounded-lg bg-[var(--sand)] px-2 py-1.5"
                }
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-[var(--border)] p-2">
            <input
              className="field flex-1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask the team assistant…"
            />
            <button type="button" className="btn-primary" disabled={loading} onClick={send}>
              Send
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white shadow-lg"
      >
        {open ? "Close assistant" : "AI assistant"}
      </button>
    </div>
  );
}
