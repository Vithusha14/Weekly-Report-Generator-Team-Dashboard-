import { PrismaClient, Role, ReportStatus, ReviewActionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, startOfWeek, subWeeks } from "date-fns";

const prisma = new PrismaClient();

function weekRange(weeksAgo: number) {
  const base = startOfWeek(subWeeks(new Date(), weeksAgo), { weekStartsOn: 1 });
  return { weekStart: base, weekEnd: addDays(base, 6) };
}

function sampleTasks(prefix: string) {
  return [
    {
      taskName: `${prefix} – implement feature`,
      priority: "HIGH",
      plannedPercent: 100,
      actualPercent: 90,
      status: "COMPLETED",
      timePlannedHours: 12,
      timeSpentHours: 14,
      deliverable: "Feature branch merged",
    },
    {
      taskName: `${prefix} – code review`,
      priority: "MEDIUM",
      plannedPercent: 100,
      actualPercent: 100,
      status: "COMPLETED",
      timePlannedHours: 4,
      timeSpentHours: 3.5,
      deliverable: "Review comments resolved",
    },
  ];
}

async function main() {
  await prisma.reviewAction.deleteMany();
  await prisma.reportVersion.deleteMany();
  await prisma.report.deleteMany();
  await prisma.projectMembership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@weekly.app",
      name: "Alex Admin",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@weekly.app",
      name: "Morgan Manager",
      passwordHash,
      role: Role.MANAGER,
    },
  });

  const members = await Promise.all(
    [
      { email: "sam@weekly.app", name: "Sam Rivera" },
      { email: "jordan@weekly.app", name: "Jordan Lee" },
      { email: "casey@weekly.app", name: "Casey Nguyen" },
      { email: "taylor@weekly.app", name: "Taylor Brooks" },
      { email: "riley@weekly.app", name: "Riley Patel" },
    ].map((m) =>
      prisma.user.create({
        data: { ...m, passwordHash, role: Role.TEAM_MEMBER },
      })
    )
  );

  const projects = await Promise.all(
    [
      { name: "Client A", description: "Primary client delivery work" },
      { name: "Internal Tooling", description: "Internal developer productivity tools" },
      { name: "R&D", description: "Exploration and prototypes" },
      { name: "Marketing", description: "Campaigns and landing pages" },
    ].map((p) => prisma.project.create({ data: p }))
  );

  for (const member of members) {
    await prisma.projectMembership.createMany({
      data: projects.slice(0, 3).map((p) => ({
        userId: member.id,
        projectId: p.id,
      })),
    });
  }

  const statuses: ReportStatus[] = [
    ReportStatus.APPROVED,
    ReportStatus.SUBMITTED,
    ReportStatus.NEEDS_CORRECTION,
    ReportStatus.DRAFT,
    ReportStatus.APPROVED,
  ];

  for (let w = 0; w < 4; w++) {
    const { weekStart, weekEnd } = weekRange(w);
    for (let i = 0; i < members.length; i++) {
      // Leave one member without a report for the current week (not yet started)
      if (w === 0 && i === members.length - 1) continue;

      const status = w === 0 ? statuses[i % statuses.length] : ReportStatus.APPROVED;
      const project = projects[i % projects.length];
      const author = members[i];

      const content = {
        tasksCompleted: sampleTasks(author.name.split(" ")[0]),
        tasksPlannedNextWeek: [
          "Finish remaining tickets",
          "Pair on API integration",
          "Update documentation",
        ],
        blockers: [
          {
            text: "Waiting on design assets",
            isKeyIssue: true,
          },
          {
            text: "Flaky CI on main",
            isKeyIssue: false,
          },
        ],
        achievements: [
          {
            text: "Shipped onboarding flow",
            isKeyAchievement: true,
          },
          {
            text: "Reduced API latency 20%",
            isKeyAchievement: false,
          },
        ],
        hoursByType: {
          Development: 22,
          Testing: 6,
          Meetings: 4,
          Documentation: 3,
        },
        notes: `Seeded notes for ${author.name} week ${w}`,
        links: "https://github.com/example/weekly-reports",
      };

      const report = await prisma.report.create({
        data: {
          authorId: author.id,
          projectId: project.id,
          weekStart,
          weekEnd,
          status,
          ...content,
          latestComment:
            status === ReportStatus.NEEDS_CORRECTION
              ? "Please quantify the deliverables and clarify the key blocker impact."
              : null,
          submittedAt:
            status === ReportStatus.DRAFT ? null : addDays(weekEnd, 1),
          approvedAt: status === ReportStatus.APPROVED ? addDays(weekEnd, 2) : null,
        },
      });

      if (status !== ReportStatus.DRAFT) {
        const version = await prisma.reportVersion.create({
          data: {
            reportId: report.id,
            versionNumber: 1,
            snapshot: content,
            submittedAt: report.submittedAt ?? new Date(),
          },
        });

        if (status === ReportStatus.NEEDS_CORRECTION) {
          await prisma.reviewAction.create({
            data: {
              reportId: report.id,
              reportVersionId: version.id,
              reviewerId: manager.id,
              action: ReviewActionType.REQUESTED_CHANGES,
              comment:
                "Please quantify the deliverables and clarify the key blocker impact.",
            },
          });
        }

        if (status === ReportStatus.APPROVED) {
          await prisma.reviewAction.create({
            data: {
              reportId: report.id,
              reportVersionId: version.id,
              reviewerId: manager.id,
              action: ReviewActionType.APPROVED,
              comment: "Looks good — approved.",
            },
          });
        }
      }
    }
  }

  console.log("Seed complete");
  console.log("Logins (password: Password123!):");
  console.log(`  Admin:   ${admin.email}`);
  console.log(`  Manager: ${manager.email}`);
  console.log(`  Members: ${members.map((m) => m.email).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
