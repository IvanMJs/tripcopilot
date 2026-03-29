"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type State =
  | { phase: "loading" }
  | { phase: "accepted"; tripId: string }
  | { phase: "needsLogin" }
  | { phase: "error"; message: string };

function InviteContent() {
  const params    = useSearchParams();
  const router    = useRouter();
  const token     = params.get("token");
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ phase: "error", message: "Enlace de invitación inválido." });
      return;
    }

    fetch("/api/trips/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.status === 401) {
          setState({ phase: "needsLogin" });
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setState({ phase: "error", message: data.error ?? "Error al aceptar la invitación." });
          return;
        }
        setState({ phase: "accepted", tripId: data.tripId });
      })
      .catch(() => setState({ phase: "error", message: "Error de red. Intentá de nuevo." }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-redirect after accept
  useEffect(() => {
    if (state.phase === "accepted") {
      const t = setTimeout(() => router.push("/app"), 1800);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg,#0a0a14 0%,#0d0d1f 100%)" }}>
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] p-8 text-center space-y-5"
        style={{ background: "linear-gradient(160deg,#12121f,#0d0d1a)" }}>

        {/* Logo */}
        <p className="text-xl font-black text-white tracking-tight">✈ TripCopilot</p>

        {state.phase === "loading" && (
          <>
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Verificando invitación…</p>
          </>
        )}

        {state.phase === "accepted" && (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-700/40">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <p className="text-base font-bold text-white">¡Invitación aceptada!</p>
              <p className="text-sm text-gray-400 mt-1">Redirigiendo al viaje…</p>
            </div>
          </>
        )}

        {state.phase === "needsLogin" && (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-900/40 border border-indigo-700/40">
              <span className="text-2xl">🔐</span>
            </div>
            <div>
              <p className="text-base font-bold text-white">Iniciá sesión para aceptar</p>
              <p className="text-sm text-gray-400 mt-1">
                Necesitás una cuenta para unirte al viaje.
              </p>
            </div>
            <a
              href={`/?invite=${token}#empezar`}
              className="block w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-bold text-white transition-colors"
            >
              Ingresar / Crear cuenta
            </a>
            <p className="text-xs text-gray-600">
              Después de ingresar, volvé a este enlace para aceptar la invitación.
            </p>
          </>
        )}

        {state.phase === "error" && (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-900/40 border border-red-700/40">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <p className="text-base font-bold text-white">Enlace inválido</p>
              <p className="text-sm text-gray-400 mt-1">{state.message}</p>
            </div>
            <a
              href="/"
              className="block w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            >
              Ir al inicio
            </a>
          </>
        )}

      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg,#0a0a14 0%,#0d0d1f 100%)" }}>
        <div className="h-10 w-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
