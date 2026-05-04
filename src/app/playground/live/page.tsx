import { getSession } from "@/lib/server/auth-session";
import { LiveMCPPlayground } from "@/components/playground-live/LiveMCPPlayground";

export default async function LivePlaygroundPage() {
  const session = await getSession();

  return (
    <LiveMCPPlayground
      accessToken={session?.accessToken ?? null}
      user={session?.user ?? null}
    />
  );
}
