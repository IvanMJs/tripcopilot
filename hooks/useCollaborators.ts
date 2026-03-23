"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { TripCollaborator, CollaboratorRole } from "@/lib/types";

interface DbCollaborator {
  id: string;
  trip_id: string;
  invitee_email: string;
  invitee_id: string | null;
  role: CollaboratorRole;
  status: "pending" | "accepted" | "declined";
  invite_token: string;
  invited_at: string;
  accepted_at: string | null;
}

function toCollaborator(row: DbCollaborator): TripCollaborator {
  return {
    id: row.id,
    tripId: row.trip_id,
    inviteeEmail: row.invitee_email,
    inviteeId: row.invitee_id ?? undefined,
    role: row.role,
    status: row.status,
    inviteToken: row.invite_token,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at ?? undefined,
  };
}

export function useCollaborators(tripId: string) {
  const [collaborators, setCollaborators] = useState<TripCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollaborators = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/trips/collaborators?tripId=${encodeURIComponent(tripId)}`);
    const json = await res.json() as { data?: DbCollaborator[]; error?: string };

    if (!res.ok || json.error) {
      setError(json.error ?? "Failed to load collaborators");
      setLoading(false);
      return;
    }

    setCollaborators((json.data ?? []).map(toCollaborator));
    setLoading(false);
  }, [tripId]);

  // Initial fetch
  useEffect(() => {
    void fetchCollaborators();
  }, [fetchCollaborators]);

  // Realtime subscription for live updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip-collaborators-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_collaborators",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          void fetchCollaborators();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tripId, fetchCollaborators]);

  const inviteCollaborator = useCallback(
    async (email: string, role: CollaboratorRole): Promise<string | null> => {
      const res = await fetch("/api/trips/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, email, role }),
      });

      const json = await res.json() as { token?: string; error?: string };

      if (!res.ok || !json.token) {
        throw new Error(json.error ?? "Could not send invitation");
      }

      // Refresh list so the new pending invite appears immediately
      await fetchCollaborators();
      return json.token;
    },
    [tripId, fetchCollaborators],
  );

  const acceptInvite = useCallback(async (token: string): Promise<string | null> => {
    const res = await fetch("/api/trips/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const json = await res.json() as { tripId?: string; error?: string };

    if (!res.ok || !json.tripId) {
      throw new Error(json.error ?? "Could not accept invitation");
    }

    return json.tripId;
  }, []);

  const revokeAccess = useCallback(
    async (collaboratorId: string): Promise<void> => {
      // Optimistic update
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));

      const res = await fetch(
        `/api/trips/collaborators?collaboratorId=${encodeURIComponent(collaboratorId)}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        // Revert on failure
        await fetchCollaborators();
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? "Could not revoke access");
      }
    },
    [fetchCollaborators],
  );

  return {
    collaborators,
    loading,
    error,
    inviteCollaborator,
    acceptInvite,
    revokeAccess,
    refresh: fetchCollaborators,
  };
}
