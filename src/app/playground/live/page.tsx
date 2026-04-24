import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth-session";
import { LiveMCPPlayground } from "@/components/playground-live/LiveMCPPlayground";

export default async function LivePlaygroundPage() {
  const session = await getSession();

  if (!session) {
    redirect("/oauth/login");
  }

  return <LiveMCPPlayground accessToken={session.accessToken} user={session.user} />;
}
