import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { requireRoles, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { startOfWeek, subWeeks } from "date-fns";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  const authResult = await requireRoles([Role.MANAGER, Role.ADMIN]);
  if ("error" in authResult && authResult.error) return authResult.error;

  const body = await req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) return jsonError("Message required");

  const weekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const reports = await prisma.report.findMany({
    where: { weekStart: { gte: weekStart } },
    include: {
      author: { select: { name: true } },
      project: { select: { name: true } },
    },
    take: 40,
  });

  const context = reports
    .map((r) => {
      const blockers = (r.blockers as { text: string; isKeyIssue?: boolean }[]) || [];
      const achievements =
        (r.achievements as { text: string; isKeyAchievement?: boolean }[]) || [];
      return [
        `Author: ${r.author.name}`,
        `Project: ${r.project.name}`,
        `Status: ${r.status}`,
        `Week: ${r.weekStart.toISOString().slice(0, 10)}`,
        `Key blocker: ${blockers.find((b) => b.isKeyIssue)?.text ?? "n/a"}`,
        `Key achievement: ${achievements.find((a) => a.isKeyAchievement)?.text ?? "n/a"}`,
        `Hours: ${JSON.stringify(r.hoursByType)}`,
      ].join(" | ");
    })
    .join("\n");

  const system = `You are an assistant for a weekly team report dashboard. Answer briefly using only the report context. If unknown, say you do not have enough data. Do not invent people or projects.`;

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Context:\n${context}\n\nQuestion: ${parsed.data.message}`,
          },
        ],
        temperature: 0.2,
      }),
    });
    if (!res.ok) return jsonError("AI provider error", 502);
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "No response";
    return NextResponse.json({ reply, provider: "openai" });
  }

  if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 600,
        system,
        messages: [
          {
            role: "user",
            content: `Context:\n${context}\n\nQuestion: ${parsed.data.message}`,
          },
        ],
      }),
    });
    if (!res.ok) return jsonError("AI provider error", 502);
    const data = await res.json();
    const reply = data.content?.[0]?.text ?? "No response";
    return NextResponse.json({ reply, provider: "anthropic" });
  }

  // Offline heuristic fallback when no API key is configured
  const q = parsed.data.message.toLowerCase();
  const submitted = reports.filter((r) => r.status !== "DRAFT");
  const needsFix = reports.filter((r) => r.status === "NEEDS_CORRECTION");
  let reply =
    `I found ${reports.length} recent reports (${submitted.length} past draft). ` +
    `${needsFix.length} need correction. `;

  if (q.includes("blocker")) {
    const keys = reports
      .map((r) => {
        const blockers = (r.blockers as { text: string; isKeyIssue?: boolean }[]) || [];
        return blockers.find((b) => b.isKeyIssue)?.text;
      })
      .filter(Boolean);
    reply += keys.length
      ? `Key blockers: ${keys.slice(0, 5).join("; ")}.`
      : "No key blockers recorded.";
  } else if (q.includes("project") || q.includes("work")) {
    const byProject = Object.entries(
      reports.reduce<Record<string, number>>((acc, r) => {
        acc[r.project.name] = (acc[r.project.name] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([k, v]) => `${k} (${v})`)
      .join(", ");
    reply += `Reports by project: ${byProject || "none"}.`;
  } else {
    reply +=
      "Ask about blockers, projects, or who still needs to submit. Configure OPENAI_API_KEY or ANTHROPIC_API_KEY for richer answers.";
  }

  return NextResponse.json({ reply, provider: "local-fallback" });
}
