import { z } from "zod";

export const taskSchema = z.object({
  taskName: z.string().min(1, "Task name is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  plannedPercent: z.number().min(0).max(100),
  actualPercent: z.number().min(0).max(100),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "BLOCKED"]),
  timePlannedHours: z.number().min(0),
  timeSpentHours: z.number().min(0),
  deliverable: z.string().min(1, "Deliverable is required"),
});

export const blockerSchema = z.object({
  text: z.string().min(1),
  isKeyIssue: z.boolean().default(false),
});

export const achievementSchema = z.object({
  text: z.string().min(1),
  isKeyAchievement: z.boolean().default(false),
});

export const hoursByTypeSchema = z
  .object({
    Development: z.number().min(0).optional(),
    Testing: z.number().min(0).optional(),
    Meetings: z.number().min(0).optional(),
    Documentation: z.number().min(0).optional(),
  })
  .optional()
  .nullable();

export const reportContentSchema = z
  .object({
    weekStart: z.string().or(z.date()),
    weekEnd: z.string().or(z.date()),
    projectId: z.string().min(1),
    tasksCompleted: z.array(taskSchema).default([]),
    tasksPlannedNextWeek: z.array(z.string()).default([]),
    blockers: z.array(blockerSchema).default([]),
    achievements: z.array(achievementSchema).default([]),
    hoursByType: hoursByTypeSchema,
    notes: z.string().optional().nullable(),
    links: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const keyIssues = data.blockers.filter((b) => b.isKeyIssue);
    if (keyIssues.length > 1) {
      ctx.addIssue({
        code: "custom",
        message: "Only one blocker can be flagged as the key issue",
        path: ["blockers"],
      });
    }
    const keyAchievements = data.achievements.filter((a) => a.isKeyAchievement);
    if (keyAchievements.length > 1) {
      ctx.addIssue({
        code: "custom",
        message: "Only one achievement can be flagged as the key achievement",
        path: ["achievements"],
      });
    }
  });

export const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REQUEST_CHANGES"]),
  comment: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.action === "REQUEST_CHANGES" && (!data.comment || !data.comment.trim())) {
    ctx.addIssue({
      code: "custom",
      message: "A comment is required when requesting changes",
      path: ["comment"],
    });
  }
});

export const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  memberIds: z.array(z.string()).optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["TEAM_MEMBER", "MANAGER", "ADMIN"]).optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["TEAM_MEMBER", "MANAGER", "ADMIN"]).optional(),
  projectIds: z.array(z.string()).optional(),
});
