"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Plane, Shield, Brain, Bell, Calendar, Search,
  ArrowRight, Mail, Loader2, MapPin, Clock,
  Zap, Star, CheckCircle, ChevronDown, LogIn,
  Building2, Smartphone
} from "lucide-react";
import { NotifCarousel } from "@/components/NotifCarousel";
import { AppScreenshotCarousel } from "@/components/AppScreenshotCarousel";

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

  const notifScreenshots = [
    { src: "/morning-briefing.jpeg",   label: "Morning briefing" },
    { src: "/vuelo-demorado.jpeg",     label: "Demora real" },
    { src: "/vuelo-cancelado.jpeg",    label: "Cancelación" },
    { src: "/check-in-24hs.jpeg",      label: "Check-in vuelo" },
    { src: "/mañana-check-in.jpeg",    label: "Reminder hotel" },
    { src: "/check-in-hoy-hotel.jpeg", label: "Check-in hotel" },
  ];

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
      title: "Importá con IA — foto o texto",
      desc: "Pegá tu confirmación de vuelo o sacá una foto. TripCopilot interpreta cualquier formato y carga todos tus vuelos automáticamente. Sin tipear nada.",
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
    {
      icon: Building2,
      color: "text-pink-400",
      bg: "bg-pink-950/40",
      border: "border-pink-800/30",
      title: "Hospedaje integrado",
      desc: "Agregá tus hoteles al itinerario. TripCopilot te avisa el día anterior del check-in y te notifica cuando es la hora exacta.",
    },
    {
      icon: Zap,
      color: "text-red-400",
      bg: "bg-red-950/40",
      border: "border-red-800/30",
      title: "Alertas en tiempo real",
      desc: "2-4 horas antes del despegue, TripCopilot consulta el estado real de tu vuelo. Si fue cancelado o tiene demora, te llega al toque.",
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
      title: "Importás con IA en segundos",
      desc: "Pegás el screenshot o texto de tu confirmación. TripCopilot lee todo y carga los vuelos solo.",
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
      <section className="relative pt-24 pb-16 px-4 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 right-0 -translate-y-1/3 w-[400px] h-[600px] rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }} />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* ── LEFT: copy ── */}
            <div className="flex flex-col items-start">
              {/* Avatar */}
              <div className="mb-6">
                <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-24 w-auto sm:h-32 lg:h-36 drop-shadow-2xl" />
              </div>

              {/* AI import badge — the hook */}
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-700/50 bg-violet-950/40 px-4 py-1.5 text-xs text-violet-300 font-semibold mb-5">
                <Brain className="h-3.5 w-3.5 text-violet-400" />
                Sacás foto · La IA carga todo sola
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.06] mb-5">
                Tu copiloto para<br />
                <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #60a5fa, #a78bfa)" }}>
                  cada vuelo
                </span>
              </h1>

              {/* Subheadline — specific to AI import */}
              <p className="text-base sm:text-lg text-gray-400 leading-relaxed mb-3 max-w-lg">
                Pegá el screenshot de tu confirmación de vuelo.{" "}
                <span className="text-white font-semibold">TripCopilot lee tu itinerario y carga todos los vuelos en segundos</span>
                {" "}— sin tipear nada.
              </p>
              <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-lg">
                Después monitorea la FAA en tiempo real, calcula el riesgo de conexión, trackea tus hoteles y te avisa si algo cambia.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-8">
                <button
                  onClick={scrollToLogin}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-3.5 text-sm font-bold text-white transition-all shadow-lg shadow-blue-900/30 tap-scale"
                >
                  Empezar gratis
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] px-8 py-3.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.08] transition-all"
                >
                  Ver demo
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-700" /> Sin contraseña</span>
                <span className="hidden sm:block h-3 w-px bg-gray-800" />
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-700" /> Gratis para empezar</span>
                <span className="hidden sm:block h-3 w-px bg-gray-800" />
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-700" /> Datos 100% seguros</span>
              </div>
            </div>

            {/* ── RIGHT: AI import video in phone frame ── */}
            <div className="flex justify-center md:justify-end">
              <div className="relative">
                {/* Outer glow */}
                <div className="absolute inset-0 -m-8 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }} />

                {/* Phone frame */}
                <div className="relative rounded-[2.8rem] border-2 border-white/[0.12] shadow-2xl overflow-hidden"
                  style={{
                    width: "min(280px, 72vw)",
                    boxShadow: "0 0 0 1px rgba(124,58,237,0.15), 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(124,58,237,0.12)",
                    background: "#08080f",
                  }}>
                  {/* Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-black z-10" />
                  {/* Video */}
                  <video
                    src="/ia-import-text-screenshot.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-auto block"
                    style={{ borderRadius: "2.4rem" }}
                  />
                </div>

                {/* Floating badge — TripCopilot */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-violet-700/50 bg-[#0d0d1a] px-3 py-1.5 shadow-lg whitespace-nowrap">
                  <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-4 w-4" />
                  <span className="text-[11px] text-violet-300 font-bold">TripCopilot lo hace solo</span>
                </div>

                {/* Floating pill — top right */}
                <div className="absolute -top-3 -right-3 inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-xs text-white font-bold shadow-lg">
                  <Zap className="h-3 w-3" />
                  IA Import
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── ALOJAMIENTO IA ──────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-pink-800/30 overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(131,24,67,0.12) 0%, rgba(14,14,28,0.97) 50%, rgba(76,29,149,0.10) 100%)" }}>
            <div className="grid md:grid-cols-2 gap-0">
              {/* Video — izquierda en desktop */}
              <div className="relative p-6 sm:p-8 flex items-center justify-center order-2 md:order-1">
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl max-w-xs w-full">
                  <video
                    src="/alojamiento-ia.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-auto block"
                  />
                </div>
              </div>
              {/* Text — derecha en desktop */}
              <div className="p-8 sm:p-10 flex flex-col justify-center order-1 md:order-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-pink-700/40 bg-pink-950/30 px-3 py-1 text-[11px] text-pink-400 font-bold uppercase tracking-wider mb-5 w-fit">
                  <Brain className="h-3 w-3" />
                  TripCopilot IA · Alojamiento
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-4 leading-tight">
                  Tu hotel cargado en<br />
                  <span className="text-pink-400">segundos, no minutos</span>
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                  Pegá la confirmación del hotel, mandá una foto del email o escribilo en lenguaje natural.
                  TripCopilot IA lee la reserva, extrae el nombre, fechas, horarios y código de confirmación,
                  y lo pre-completa para que solo confirmes.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Booking.com, Airbnb, Marriott, cualquier formato",
                    "Extrae check-in, check-out, código de reserva y dirección",
                    "Funciona con español, inglés y portugués",
                    "Editá cualquier dato antes de guardar",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-pink-400 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
                <div className="flex justify-center">
                  <span className="text-4xl">{p.emoji}</span>
                </div>
                <p className="text-sm font-semibold text-gray-300 leading-snug text-center">{p.problem}</p>
                <div className="h-px bg-white/[0.06]" />
                <p className="text-xs text-blue-400 leading-relaxed text-center">
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
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Web y mobile —<br />diseñado para los dos</h2>
            <p className="text-sm text-gray-500 mt-3">Usalo en la computadora antes de salir o en el celular cuando estás en el aeropuerto.</p>
          </div>

          <AppScreenshotCarousel />
        </div>
      </section>

      {/* ── VIDEO DEMO ────────────────────────────────────────────────────── */}
      <section id="demo" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Demo en vivo</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Mirá cómo funciona en la web</h2>
            <p className="text-sm text-gray-500 mt-2">El dashboard completo — desde cualquier navegador, sin instalar nada.</p>
          </div>

          {/* Laptop frame */}
          <div className="relative mx-auto" style={{ maxWidth: 860 }}>
            {/* Screen lid */}
            <div className="rounded-t-2xl border border-white/[0.12] bg-[#111118] overflow-hidden"
              style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.8)" }}>
              {/* Top bar with camera */}
              <div className="flex items-center justify-center h-6 bg-[#0e0e16] border-b border-white/[0.05]">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-700" />
              </div>
              {/* Screen content */}
              <div className="mx-3 mb-0 border border-white/[0.06] overflow-hidden rounded-sm">
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
            {/* Hinge line */}
            <div className="h-[5px] bg-gradient-to-b from-[#2a2a3e] to-[#1a1a28] border-x border-white/[0.07]" />
            {/* Keyboard base */}
            <div className="h-4 bg-[#14141f] rounded-b-xl border-x border-b border-white/[0.07]"
              style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
              {/* Trackpad hint */}
              <div className="mx-auto mt-1 rounded-sm border border-white/[0.04] bg-white/[0.02]"
                style={{ width: "18%", height: 7 }} />
            </div>
            {/* Base shadow */}
            <div className="mx-[4%] h-1 rounded-b-full"
              style={{ background: "rgba(0,0,0,0.5)", filter: "blur(6px)" }} />
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
                  className={`rounded-2xl border ${f.border} ${f.bg} p-5 space-y-3 flex flex-col items-center text-center`}>
                  <div className={`flex items-center justify-center h-9 w-9 rounded-xl ${f.bg} border ${f.border}`}>
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

      {/* ── NOTIFICATIONS ───────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Notificaciones</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">7 alertas que te cuidan el viaje</h2>
            <p className="text-sm text-gray-500 mt-3">Sin spam. Cada notificación llega en el momento exacto en que la necesitás.</p>
          </div>

          {/* Notification type grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-16">
            {[
              { icon: "🌅", color: "text-yellow-400", bg: "bg-yellow-950/30", border: "border-yellow-800/25", timing: "Día del vuelo · mañana", title: "Morning briefing", desc: "Resumen del día con estado del aeropuerto y hora de salida." },
              { icon: "✈️", color: "text-violet-400", bg: "bg-violet-950/40", border: "border-violet-800/30", timing: "24hs antes", title: "Check-in vuelo", desc: "Recordatorio para hacer el check-in online a tiempo." },
              { icon: "🛫", color: "text-blue-400", bg: "bg-blue-950/40", border: "border-blue-800/30", timing: "3hs antes", title: "Pre-vuelo", desc: "Estado del aeropuerto incluido — sabés si hay demoras antes de salir." },
              { icon: "⚠️", color: "text-amber-400", bg: "bg-amber-950/40", border: "border-amber-800/30", timing: "Hasta 3 días antes", title: "Alerta aeropuerto", desc: "Demoras moderadas, severas o cierres en tu aeropuerto." },
              { icon: "🟡", color: "text-orange-400", bg: "bg-orange-950/30", border: "border-orange-800/25", timing: "2-4hs antes", title: "Demora real", desc: "TripCopilot consulta el estado real del vuelo y te avisa si hay atraso." },
              { icon: "🚫", color: "text-red-400", bg: "bg-red-950/30", border: "border-red-800/25", timing: "2-4hs antes", title: "Vuelo cancelado", desc: "Alerta inmediata si tu vuelo fue cancelado — con tiempo de reaccionar." },
              { icon: "🏨", color: "text-pink-400", bg: "bg-pink-950/30", border: "border-pink-800/25", timing: "Día anterior", title: "Reminder hotel", desc: "Recordatorio de check-in con documentos y código de reserva." },
              { icon: "🔑", color: "text-emerald-400", bg: "bg-emerald-950/30", border: "border-emerald-800/25", timing: "Hora exacta", title: "Check-in hotel", desc: "Te avisa cuando es la hora de check-in o check-out de tu hospedaje." },
            ].map((n) => (
              <div key={n.title} className={`rounded-2xl border ${n.border} ${n.bg} p-4 space-y-2 flex flex-col items-center text-center`}>
                <div className={`flex items-center justify-center h-8 w-8 rounded-xl ${n.bg} border ${n.border} text-base`}>
                  {n.icon}
                </div>
                <p className={`text-xs font-bold uppercase tracking-widest ${n.color}`}>{n.timing}</p>
                <h3 className="text-xs font-bold text-white">{n.title}</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">{n.desc}</p>
              </div>
            ))}
          </div>

          {/* Phone screenshots carousel */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs text-gray-400">
              <Smartphone className="h-3.5 w-3.5" />
              Así llegan en tu celular — deslizá o hacé click
            </div>
          </div>

          <NotifCarousel screenshots={notifScreenshots} />
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

      {/* ── ROI ARGUMENT ─────────────────────────────────────────────────── */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl border border-amber-800/25 overflow-hidden p-8 sm:p-12 text-center"
            style={{ background: "linear-gradient(135deg, rgba(120,53,15,0.12) 0%, rgba(8,8,18,0.97) 45%, rgba(120,53,15,0.08) 100%)" }}>

            {/* Glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.06) 0%, transparent 65%)" }} />

            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 mb-5">El cálculo es simple</p>

            {/* Big number */}
            <p className="text-5xl sm:text-7xl font-black text-amber-400 mb-3 tracking-tight">$300–$1.000</p>
            <p className="text-base sm:text-xl text-gray-300 font-semibold mb-3">
              es lo que cuesta en promedio perder una conexión
            </p>
            <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-xl mx-auto">
              Rebooking, hotel inesperado, traslado. Si viajás 4 veces al año con escala,
              la probabilidad de que te pase en algún momento no es baja — y cuando pasa, lo pagás caro.
            </p>

            {/* Comparison */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <div className="rounded-2xl border border-red-800/30 bg-red-950/20 px-6 py-4 text-center">
                <p className="text-2xl sm:text-3xl font-black text-red-400">$300+</p>
                <p className="text-xs text-gray-500 mt-1">perder una conexión</p>
              </div>
              <div className="text-gray-600 text-xl font-black">vs</div>
              <div className="rounded-2xl border border-emerald-700/30 bg-emerald-950/15 px-6 py-4 text-center">
                <p className="text-2xl sm:text-3xl font-black text-emerald-400">$7/mes</p>
                <p className="text-xs text-gray-500 mt-1">TripCopilot monitoreando</p>
              </div>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              TripCopilot se paga solo con prevenir{" "}
              <span className="text-white font-bold">una sola situación.</span>
            </p>
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
                  <span className="text-xs text-gray-600 uppercase tracking-wider">o con email</span>
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

            <p className="text-center text-xs text-gray-700 leading-relaxed">
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
            Hecho con ♥ para viajeros que vuelan seguido
          </p>
          <p className="text-[11px] text-gray-700">
            © {new Date().getFullYear()} TripCopilot
          </p>
        </div>
      </footer>

    </div>
  );
}
