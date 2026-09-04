import { describe, expect, it } from "vitest";
import {
  canAccessReport,
  canEditReportContent,
  canReviewReport,
  isAdmin,
  isManagerOrAdmin,
} from "../src/lib/rbac";

describe("RBAC", () => {
  it("prevents a team member from accessing another member's report", () => {
    const allowed = canAccessReport("TEAM_MEMBER", "author-1", "member-2", "SUBMITTED");
    expect(allowed).toBe(false);
  });

  it("allows a team member to access their own report", () => {
    expect(canAccessReport("TEAM_MEMBER", "author-1", "author-1", "DRAFT")).toBe(true);
  });

  it("allows managers and admins to access submitted reports", () => {
    expect(canAccessReport("MANAGER", "author-1", "manager-1", "SUBMITTED")).toBe(true);
    expect(canAccessReport("ADMIN", "author-1", "admin-1", "APPROVED")).toBe(true);
  });

  it("blocks managers from opening draft report content", () => {
    expect(canAccessReport("MANAGER", "author-1", "manager-1", "DRAFT")).toBe(false);
    expect(canAccessReport("ADMIN", "author-1", "admin-1", "DRAFT")).toBe(false);
  });

  it("still lets the author open their own draft", () => {
    expect(canAccessReport("TEAM_MEMBER", "author-1", "author-1", "DRAFT")).toBe(true);
  });

  it("blocks managers from editing report content", () => {
    expect(canEditReportContent("MANAGER", "author-1", "manager-1", "DRAFT")).toBe(false);
  });

  it("allows authors to edit only draft or needs-correction reports", () => {
    expect(canEditReportContent("TEAM_MEMBER", "a", "a", "DRAFT")).toBe(true);
    expect(canEditReportContent("TEAM_MEMBER", "a", "a", "NEEDS_CORRECTION")).toBe(true);
    expect(canEditReportContent("TEAM_MEMBER", "a", "a", "SUBMITTED")).toBe(false);
    expect(canEditReportContent("TEAM_MEMBER", "a", "a", "APPROVED")).toBe(false);
  });

  it("only managers/admins can review", () => {
    expect(canReviewReport("TEAM_MEMBER")).toBe(false);
    expect(canReviewReport("MANAGER")).toBe(true);
    expect(isManagerOrAdmin("ADMIN")).toBe(true);
    expect(isAdmin("MANAGER")).toBe(false);
  });
});
