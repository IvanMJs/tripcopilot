"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { TripBoard } from "@/components/tripboard/TripBoard";

export default function BoardPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
  }, [router]);

  return (
    <div
      style={{
        height: "100dvh",
        background: "#07070d",
        overflow: "hidden",
      }}
    >
      <TripBoard />
    </div>
  );
}
