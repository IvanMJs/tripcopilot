"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface UserSessionContextValue {
  userId: string | null;
  userName: string | null;
  userAvatar: string | null;
  userPlan: "free" | "explorer" | "pilot" | null;
  setUserName: (n: string) => void;
  setUserAvatar: (url: string) => void;
  handleLogout: () => Promise<void>;
}

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userPlan, setUserPlan] = useState<"free" | "explorer" | "pilot" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_TEST_MODE === "true") {
      setUserId("test-user-00000000-0000-0000-0000-000000000000");
      setUserName("Test User");
      setUserPlan("pilot");
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || null;
      // Single query for profile data + last_seen_at — eliminates one Supabase round-trip per page load
      supabase.from("user_profiles").select("plan, display_name, avatar_url, last_seen_at").eq("id", user.id).single()
        .then(({ data }) => {
          const plan = (data as { plan?: string } | null)?.plan;
          setUserPlan(plan === "pilot" ? "pilot" : plan === "explorer" ? "explorer" : "free");
          const dbName = (data as { display_name?: string | null } | null)?.display_name;
          setUserName(dbName || metaName);
          const dbAvatar = (data as { avatar_url?: string | null } | null)?.avatar_url;
          setUserAvatar(dbAvatar || null);
          // Update last_seen_at (throttle: only if >30min since last update)
          const lastSeen = (data as { last_seen_at?: string | null } | null)?.last_seen_at
            ? new Date((data as { last_seen_at: string }).last_seen_at)
            : null;
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
          if (!lastSeen || lastSeen < thirtyMinAgo) {
            // Fire-and-forget: void makes the dangling promise intent explicit
            void supabase.from("user_profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
          }
        });
      // Fire welcome API only once we have a confirmed authenticated user
      void fetch("/api/auth/welcome", { method: "POST" });
    });
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <UserSessionContext.Provider value={{ userId, userName, userAvatar, userPlan, setUserName, setUserAvatar, handleLogout }}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSessionContext(): UserSessionContextValue {
  const ctx = useContext(UserSessionContext);
  if (!ctx) throw new Error("useUserSessionContext must be used inside UserSessionProvider");
  return ctx;
}
