import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth-session";
import { TokenViewer } from "@/components/auth/TokenViewer";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/oauth/login");
  }

  const { user, accessToken, idToken } = session;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* User Info */}
        <div className="flex items-center gap-4 mb-8">
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name || "User"}
              className="w-14 h-14 rounded-full border-2 border-primary/20"
            />
          )}
          <div>
            <h1 className="text-xl font-semibold text-foreground/90">
              {user.name || "User"}
            </h1>
            {user.email && (
              <p className="text-sm text-foreground/50">{user.email}</p>
            )}
            <p className="text-[11px] text-foreground/30 font-mono mt-0.5">
              sub: {user.sub}
            </p>
          </div>
        </div>

        {/* Tokens */}
        <div className="space-y-6">
          {idToken ? (
            <TokenViewer token={idToken} label="ID Token" />
          ) : (
            <div className="rounded-lg border border-foreground/10 p-4">
              <h2 className="text-sm font-medium text-foreground/70 mb-1">ID Token</h2>
              <p className="text-xs text-foreground/40">
                Not issued. The authorization server did not return an id_token for this client.
                User profile was fetched from the /userinfo endpoint instead.
              </p>
            </div>
          )}
          <TokenViewer token={accessToken} label="Access Token" />
        </div>
      </div>
    </div>
  );
}
