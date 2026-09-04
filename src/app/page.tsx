import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isManagerOrAdmin } from "@/lib/rbac";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (isManagerOrAdmin(session.user.role)) redirect("/dashboard");
  redirect("/reports");
}
