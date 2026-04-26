"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Silently refreshes server component data every 2 minutes. */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    try {
      const id = setInterval(() => {
        router.refresh();
      }, 2 * 60 * 1000); // 2 minutes

      return () => clearInterval(id);
    } catch (error) {
      console.error("Error during AutoRefresh:", error);
    }
  }, [router]);

  return <span aria-label="Data refreshing"></span>;
}