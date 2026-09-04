import { AppNav } from "@/components/AppNav";
import { auth } from "@/lib/auth";
import { isManagerOrAdmin } from "@/lib/rbac";
import { AiChatWidget } from "@/components/AiChatWidget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      {session?.user && isManagerOrAdmin(session.user.role) ? <AiChatWidget /> : null}
    </>
  );
}
