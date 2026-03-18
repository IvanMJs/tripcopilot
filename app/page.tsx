"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Plane, Shield, Brain, Bell, Calendar, Search,
  ArrowRight, Mail, Loader2, MapPin, Clock,
  Zap, Star, CheckCircle, ChevronDown, LogIn
} from "lucide-react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loginRef = useRef<HTMLDivElement>(null);

  function scrollToLogin() {
    loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/app` },
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=/app` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  // Features data
  const features = [
    {
      icon: Shield,
      color: "text-blue-400",
      bg: "bg-blue-950/40",
      border: "border-blue-800/30",
      title: "Estado FAA en tiempo real",
      desc: "Alertas de demoras, ground stops y cierres de aeropuertos directamente de la FAA oficial, actualizadas cada 5 minutos.",
    },
    {
      icon: Brain,
      color: "text-violet-400",
      bg: "bg-violet-950/40",
      border: "border-violet-800/30",
      title: "TripCopilot IA",
      desc: "Inteligencia artificial que analiza tu itinerario completo: clima en cada destino, qué empacar, alertas personalizadas y guía de viaje.",
    },
    {
      icon: Zap,
      color: "text-orange-400",
      bg: "bg-orange-950/40",
      border: "border-orange-800/30",
      title: "Riesgo de conexión",
      desc: "Detecta si una demora puede hacerte perder una conexión. Te avisa con tiempo para actuar antes de que sea tarde.",
    },
    {
      icon: Bell,
      color: "text-emerald-400",
      bg: "bg-emerald-950/40",
      border: "border-emerald-800/30",
      title: "Alertas push",
      desc: "Notificaciones de check-in y cambios de estado directamente en tu dispositivo, sin tener que abrir la app.",
    },
    {
      icon: Calendar,
      color: "text-pink-400",
      bg: "bg-pink-950/40",
      border: "border-pink-800/30",
      title: "Export a calendario",
      desc: "Exportá todos tus vuelos a Google Calendar o cualquier app de calendario con un solo clic.",
    },
    {
      icon: Search,
      color: "text-teal-400",
      bg: "bg-teal-950/40",
      border: "border-teal-800/30",
      title: "Rastreo de cualquier vuelo",
      desc: "Seguí el estado de cualquier vuelo del mundo en tiempo real, con estado del aeropuerto de salida incluido.",
    },
  ];

  const painPoints = [
    {
      emoji: "😰",
      problem: "Te enterás tarde de las demoras",
      solution: "TripCopilot monitorea la FAA las 24hs y te notifica al instante",
    },
    {
      emoji: "😓",
      problem: "No sabés si vas a perder la conexión",
      solution: "Análisis automático de riesgo de conexión en cada escala",
    },
    {
      emoji: "🤯",
      problem: "Viajar a múltiples destinos es un caos",
      solution: "IA que entiende todo tu itinerario y te da un plan claro",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Entrás con Google o email",
      desc: "Sin contraseña. Un clic y estás adentro.",
    },
    {
      num: "02",
      title: "TripCopilot carga tu viaje",
      desc: "Registrás tus vuelos y el copiloto analiza cada tramo al instante.",
    },
    {
      num: "03",
      title: "Volás tranquilo",
      desc: "Monitoreo en tiempo real, alertas automáticas y guía IA disponible siempre.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#030308] text-white overflow-x-hidden">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: "rgba(3,3,8,0.85)" }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-8 w-auto" />
            <span className="text-sm font-black tracking-tight text-white">TripCopilot</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#funciones" className="hidden sm:block text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Funciones
            </a>
            <a href="#como-funciona" className="hidden sm:block text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Cómo funciona
            </a>
            <button
              onClick={scrollToLogin}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Empezar gratis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-40"
                style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
              <img
                src="/tripcopliot-avatar.svg"
                alt="TripCopilot"
                className="relative h-24 w-24 sm:h-32 sm:w-32 drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-800/40 bg-blue-950/30 px-4 py-1.5 text-xs text-blue-400 font-medium mb-6">
            <Brain className="h-3.5 w-3.5" />
            Potenciado por Inteligencia Artificial · Claude AI
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] mb-5">
            Tu copiloto para<br />
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #60a5fa, #a78bfa)" }}>
              cada vuelo
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto mb-8">
            Monitoreo FAA en tiempo real, análisis de riesgo con IA y guía de viaje personalizada.
            Todo lo que necesitás para volar{" "}
            <span className="text-white font-semibold">sin sorpresas</span>.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <button
              onClick={scrollToLogin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-3.5 text-sm font-bold text-white transition-all shadow-lg shadow-blue-900/30 tap-scale"
            >
              Empezar gratis
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] px-8 py-3.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.08] transition-all"
            >
              Ver demo
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-700" /> Sin contraseña</span>
            <span className="h-3 w-px bg-gray-800" />
            <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-700" /> Gratis para empezar</span>
            <span className="h-3 w-px bg-gray-800" />
            <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-700" /> Datos 100% seguros</span>
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-10">
            ¿Te pasó alguna vez?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {painPoints.map((p, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.06] p-5 space-y-3"
                style={{ background: "linear-gradient(160deg, rgba(14,14,24,0.9) 0%, rgba(8,8,16,0.95) 100%)" }}>
                <span className="text-3xl">{p.emoji}</span>
                <p className="text-sm font-semibold text-gray-300 leading-snug">{p.problem}</p>
                <div className="h-px bg-white/[0.06]" />
                <p className="text-xs text-blue-400 leading-relaxed">
                  <span className="font-bold text-blue-300">TripCopilot:</span> {p.solution}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCREENSHOTS ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">La app en acción</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Todo lo que necesitás,<br />en la palma de tu mano</h2>
          </div>

          <div className="flex gap-4 sm:gap-6 justify-center items-end overflow-x-auto pb-4 snap-x snap-mandatory">
            {/* Screenshot 1 */}
            <div className="shrink-0 snap-center">
              <div className="relative rounded-3xl overflow-hidden border border-white/[0.10] shadow-2xl shadow-black/60"
                style={{ width: "min(240px, 65vw)" }}>
                <img src="/responsive-intuitivo-mobile.jpg" alt="Vista de vuelo con estado FAA" className="w-full h-auto block" />
              </div>
              <p className="text-center text-xs text-gray-600 mt-3">Estado por vuelo</p>
            </div>

            {/* Screenshot 2 — center, larger */}
            <div className="shrink-0 snap-center -mb-4 sm:-mb-6 relative z-10">
              <div className="relative rounded-3xl overflow-hidden border border-blue-500/20 shadow-2xl shadow-blue-900/30"
                style={{ width: "min(260px, 70vw)" }}>
                <div className="absolute inset-0 rounded-3xl border-2 border-blue-500/10 pointer-events-none z-10" />
                <img src="/planifica-tu-viaje.jpg" alt="Gestión de viajes" className="w-full h-auto block" />
              </div>
              <p className="text-center text-xs text-blue-500 mt-3 font-medium">Gestión de viajes</p>
            </div>

            {/* Screenshot 3 */}
            <div className="shrink-0 snap-center">
              <div className="relative rounded-3xl overflow-hidden border border-white/[0.10] shadow-2xl shadow-black/60"
                style={{ width: "min(240px, 65vw)" }}>
                <img src="/tripcopilot-ia.jpg" alt="TripCopilot IA" className="w-full h-auto block" />
              </div>
              <p className="text-center text-xs text-gray-600 mt-3">IA integrada</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VIDEO DEMO ────────────────────────────────────────────────────── */}
      <section id="demo" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Demo en vivo</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Mirá cómo funciona</h2>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/60 bg-gray-950">
            <video
              src="/copilot-dashboard-video.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-auto block"
            />
          </div>
        </div>
      </section>

      {/* ── AI SECTION ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-violet-800/30 overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.15) 0%, rgba(14,14,28,0.97) 50%, rgba(30,27,75,0.15) 100%)" }}>
            <div className="grid md:grid-cols-2 gap-0">
              {/* Text */}
              <div className="p-8 sm:p-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-700/40 bg-violet-950/30 px-3 py-1 text-[11px] text-violet-400 font-bold uppercase tracking-wider mb-5 w-fit">
                  <Brain className="h-3 w-3" />
                  Inteligencia Artificial
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-4 leading-tight">
                  Un copiloto que<br />
                  <span className="text-violet-400">piensa por vos</span>
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  TripCopilot usa IA (Claude AI de Anthropic) para analizar cada detalle de tu viaje:
                  destinos, climas, tiempos de conexión y más. El resultado: un plan personalizado
                  que te dice exactamente qué empacar, qué esperar y cómo prepararte.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Análisis climático por destino y temporada",
                    "Lista de equipaje adaptada a tu itinerario",
                    "Alertas culturales y de entrada al país",
                    "Riesgo de conexión calculado en tiempo real",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Screenshot */}
              <div className="relative p-6 sm:p-8 flex items-center justify-center">
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl max-w-xs w-full">
                  <img src="/tripcopilot-ia.jpg" alt="TripCopilot IA en acción" className="w-full h-auto block" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="funciones" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Funciones</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Todo lo que un viajero necesita</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title}
                  className={`rounded-2xl border ${f.border} ${f.bg} p-5 space-y-3`}>
                  <div className={`inline-flex items-center justify-center h-9 w-9 rounded-xl ${f.bg} border ${f.border}`}>
                    <Icon className={`h-4 w-4 ${f.color}`} />
                  </div>
                  <h3 className="text-sm font-bold text-white">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Proceso</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Empezar tarda 30 segundos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.num} className="relative text-center space-y-3">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[calc(50%+2rem)] right-[-50%] h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-xl font-black text-gray-600 mx-auto">
                  {s.num}
                </div>
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOGIN / CTA ──────────────────────────────────────────────────── */}
      <section ref={loginRef} id="empezar" className="py-20 px-4">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-16 w-auto mx-auto mb-4" />
            <h2 className="text-2xl font-black tracking-tight mb-2">¿Listo para volar tranquilo?</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Verificá con tu email y entrás en segundos —<br />
              <span className="text-gray-400">sin contraseña, sin complicaciones.</span>
            </p>
          </div>

          <div
            className="rounded-2xl border border-white/[0.08] p-6 space-y-5"
            style={{ background: "linear-gradient(160deg, rgba(16,16,28,0.99) 0%, rgba(9,9,18,1) 100%)" }}
          >
            {sent ? (
              <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 px-4 py-5 text-center space-y-2">
                <p className="text-2xl">📬</p>
                <p className="text-sm font-bold text-emerald-300">Revisá tu email</p>
                <p className="text-xs text-emerald-400/70 leading-relaxed">
                  Mandamos un link a <span className="font-semibold">{email}</span>. Tocá el link para entrar.
                </p>
              </div>
            ) : (
              <>
                {/* Google */}
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.10] bg-white/[0.05] hover:bg-white/[0.09] py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuar con Google
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider">o con email</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                <form onSubmit={handleMagicLink} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="w-full rounded-xl border border-white/[0.12] bg-[#080810] pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 text-sm font-semibold text-white transition-colors"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de acceso"}
                  </button>
                </form>
              </>
            )}

            <p className="text-center text-[10px] text-gray-700 leading-relaxed">
              Sin contraseña · Datos seguros · Gratis para empezar
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-6 w-auto" />
            <span className="text-xs font-bold text-gray-600">TripCopilot</span>
          </div>
          <p className="text-[11px] text-gray-700">
            Hecho con ♥ para viajeros · Potenciado por Claude AI
          </p>
          <p className="text-[11px] text-gray-700">
            © {new Date().getFullYear()} TripCopilot
          </p>
        </div>
      </footer>

    </div>
  );
}
