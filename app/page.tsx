"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import {
  Shield, Brain, Bell, Calendar, Search,
  ArrowRight, Mail, Loader2, MapPin,
  Zap, CheckCircle, ChevronDown, LogIn,
  Building2, Smartphone, ArrowUpCircle, DoorOpen,
  Globe2, MonitorPlay, Users,
} from "lucide-react";
import { NotifCarousel } from "@/components/NotifCarousel";
import { AppScreenshotCarousel } from "@/components/AppScreenshotCarousel";
import { SocialProofSection } from "@/components/SocialProofSection";
import { TrustBadges } from "@/components/TrustBadges";

const FAQ_ITEMS_ES = [
  {
    q: "¿Cuándo empiezan las alertas de mi vuelo?",
    a: "24 horas antes de cada vuelo, TripCopilot empieza a monitorear automáticamente. No tenés que hacer nada ni abrir la app. Si cambia la puerta de embarque, hay una demora o el vuelo se cancela, te llega una notificación al celular en menos de 2 minutos — incluso si el teléfono está en el bolsillo.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "El plan gratuito no vence nunca. Los planes de pago (desde ~$5 USD/mes) desbloquean más viajes, todas las alertas automáticas y funciones de inteligencia artificial para preparar y resumir tus viajes.",
  },
  {
    q: "¿Sirve para cualquier aerolínea y destino?",
    a: "Sí. TripCopilot cubre vuelos de todo el mundo: aerolíneas internacionales, regionales y de bajo costo. Si el vuelo existe, TripCopilot lo puede rastrear.",
  },
  {
    q: "¿Necesito tener la app abierta para recibir alertas?",
    a: "No. Las notificaciones llegan al celular aunque la app esté cerrada, igual que un mensaje de WhatsApp. Solo necesitás haber aceptado las notificaciones la primera vez que la instalaste.",
  },
  {
    q: "¿Es seguro subir mi boarding pass o confirmación de vuelo?",
    a: "Sí. TripCopilot usa inteligencia artificial para leer los datos de tu reserva y cargarlos automáticamente. Las imágenes no se guardan en nuestros servidores.",
  },
  {
    q: "¿Funciona sin internet en el aeropuerto?",
    a: "Sí. Una vez que instalás TripCopilot en tu celular, tus viajes y vuelos están disponibles aunque no tengas señal — útil cuando estás en la manga de embarque o en zona de roaming.",
  },
  {
    q: "¿Para quién es TripCopilot?",
    a: "Para cualquier persona que viaje en avión: el que viaja una vez al año, el viajero frecuente de negocios, y también para agencias de viajes que quieren dar un servicio más completo a sus clientes.",
  },
];

const FAQ_ITEMS_EN = [
  {
    q: "When do flight alerts start?",
    a: "24 hours before each flight, TripCopilot starts monitoring automatically. You don't have to do anything or open the app. If the gate changes, there's a delay or the flight is cancelled, you get a notification on your phone in under 2 minutes — even if it's in your pocket.",
  },
  {
    q: "How much does it cost?",
    a: "The free plan never expires. Paid plans (from ~$5 USD/month) unlock more trips, all automatic alerts and AI features to prepare and recap your trips.",
  },
  {
    q: "Does it work for any airline and destination?",
    a: "Yes. TripCopilot covers flights worldwide: international, regional and low-cost carriers. If the flight exists, TripCopilot can track it.",
  },
  {
    q: "Do I need the app open to receive alerts?",
    a: "No. Notifications arrive on your phone even when the app is closed, just like a WhatsApp message. You only need to have allowed notifications when you first installed it.",
  },
  {
    q: "Is it safe to upload my boarding pass or booking confirmation?",
    a: "Yes. TripCopilot uses AI to read your booking data and load it automatically. Images are not stored on our servers.",
  },
  {
    q: "Does it work without internet at the airport?",
    a: "Yes. Once you install TripCopilot on your phone, your trips and flights are available even without signal — useful when you're at the gate or in a roaming zone.",
  },
  {
    q: "Who is TripCopilot for?",
    a: "Anyone who travels by plane: the once-a-year traveller, the frequent business flyer, and travel agencies who want to offer their clients a more complete service.",
  },
];

function FaqSection({ lang }: { lang: "es" | "en" }) {
  const [open, setOpen] = useState<number | null>(null);
  const items = lang === "en" ? FAQ_ITEMS_EN : FAQ_ITEMS_ES;

  function toggle(i: number) {
    setOpen((prev) => (prev === i ? null : i));
  }

  return (
    <section id="faq" className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">FAQ</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {lang === "en" ? "Frequently asked questions" : "Preguntas frecuentes"}
          </h2>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.06] overflow-hidden"
              style={{ background: "linear-gradient(150deg, rgba(14,14,24,0.97) 0%, rgba(9,9,18,0.99) 100%)" }}
            >
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-white hover:text-gray-200 transition-colors"
                aria-expanded={open === i}
              >
                <span>{item.q}</span>
                <span
                  className="shrink-0 h-5 w-5 rounded-full border border-white/[0.10] bg-white/[0.04] flex items-center justify-center text-gray-400 transition-transform duration-200"
                  style={{ transform: open === i ? "rotate(45deg)" : "rotate(0deg)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <line x1="5" y1="1" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: open === i ? 200 : 0 }}
              >
                <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [priceUSD, setPriceUSD] = useState<number | null>(null);
  const [lang, setLang] = useState<"es" | "en">("es");
  const [subscribeLoading, setSubscribeLoading] = useState<"explorer" | "pilot" | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const [pricingPeriod, setPricingPeriod] = useState<"annual" | "monthly">("annual");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);

  // Read invite token from URL — present when redirected from /invite?token=X
  const inviteToken = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("invite")
    : null;

  useEffect(() => {
    fetch("/api/ars-price")
      .then((r) => r.json())
      .then((d: { usd: number | null }) => { if (d.usd !== null) setPriceUSD(d.usd); })
      .catch(() => {});
  }, []);

  // Sticky CTA: show after 500px scroll, hide when login section is visible
  useEffect(() => {
    function onScroll() {
      setShowStickyCta(window.scrollY > 500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = loginRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShowStickyCta(false);
        else if (window.scrollY > 500) setShowStickyCta(true);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  // loginRef.current is set after mount; this effect runs once after mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAuthModal() {
    setSent(false);
    setError("");
    setShowAuthModal(true);
  }

  async function handleGoogle() {
    setLoading(true);
    const supabase = createClient();
    const callbackUrl = inviteToken
      ? `${location.origin}/auth/callback?invite=${inviteToken}`
      : `${location.origin}/auth/callback?next=/app`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
  }

  async function handleSubscribe(planId: "explorer" | "pilot") {
    setSubscribeLoading(planId);
    try {
      const res = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          successUrl: `${location.origin}/app?plan=success`,
          cancelUrl: `${location.origin}/#planes`,
        }),
      });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      // silent fail
    } finally {
      setSubscribeLoading(null);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const callbackUrl = inviteToken
      ? `${location.origin}/auth/callback?invite=${inviteToken}`
      : `${location.origin}/auth/callback?next=/app`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
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
      title: lang === "en" ? "Airport status in real time" : "Estado del aeropuerto en tiempo real",
      desc: lang === "en"
        ? "Know if your departure airport has delays, closures or ground holds before you leave home. Updated continuously."
        : "Sabé si tu aeropuerto de salida tiene demoras, cierres o retenciones antes de salir de tu casa. Actualizado de forma continua.",
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
      title: lang === "en" ? "Notifications that actually matter" : "Notificaciones que importan",
      desc: lang === "en"
        ? "Check-in open, gate assigned, delay, cancellation — each notification arrives at the right moment, without you having to check anything."
        : "Check-in abierto, puerta asignada, demora, cancelación — cada aviso llega en el momento justo, sin que tengas que consultar nada.",
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
      title: lang === "en" ? "Alerts before anyone else" : "Te avisamos antes que nadie",
      desc: lang === "en"
        ? "From 24 hours before your flight, TripCopilot watches it for you. Gate change, delay or cancellation — you get a notification in under 2 minutes, even with the app closed."
        : "Desde 24 horas antes de tu vuelo, TripCopilot lo mira por vos. Cambio de puerta, demora o cancelación — te llega la notificación en menos de 2 minutos, aunque la app esté cerrada.",
    },
    {
      icon: MapPin,
      color: "text-cyan-400",
      bg: "bg-cyan-950/40",
      border: "border-cyan-800/30",
      title: "Timezone automático",
      desc: "Detecta cuando cambiás de zona horaria al aterrizar y te avisa para ver los horarios en tu hora local.",
    },
    {
      icon: ArrowUpCircle,
      color: "text-violet-400",
      bg: "bg-violet-950/40",
      border: "border-violet-800/30",
      title: "Alerta de upgrade",
      desc: "Activá la alerta de upgrade en cada vuelo y recibí una notificación si hay un asiento de clase superior disponible.",
    },
    {
      icon: DoorOpen,
      color: "text-amber-400",
      bg: "bg-amber-950/40",
      border: "border-amber-800/30",
      title: lang === "en" ? "Real-time gate changes" : "Cambio de puerta en tiempo real",
      desc: lang === "en"
        ? "Instant push notification if your flight changes gate before you leave for the airport."
        : "Notificación push instantánea si tu vuelo cambia de puerta de embarque antes de que salgas al aeropuerto.",
    },
    {
      icon: Globe2,
      color: "text-teal-400",
      bg: "bg-teal-950/40",
      border: "border-teal-800/30",
      title: lang === "en" ? "World travel map" : "Mapa mundial de viajes",
      desc: lang === "en"
        ? "See every airport you've visited on an interactive world map. Track countries, airports and % of the world explored."
        : "Visualizá todos los aeropuertos que visitaste en un mapa interactivo. Países, aeropuertos y % del mundo explorado.",
    },
    {
      icon: Zap,
      color: "text-violet-400",
      bg: "bg-violet-950/40",
      border: "border-violet-800/30",
      title: lang === "en" ? "AI Health Check 48h before" : "AI Health Check 48h antes",
      desc: lang === "en"
        ? "A smart pre-trip briefing: weather, docs, local currency, tips and a trip score — generated by AI."
        : "Resumen inteligente antes de cada viaje: clima, documentos, moneda local, tips y puntaje del viaje, generado por IA.",
    },
    {
      icon: Search,
      color: "text-pink-400",
      bg: "bg-pink-950/40",
      border: "border-pink-800/30",
      title: lang === "en" ? "Travel Wrapped" : "Travel Wrapped compartible",
      desc: lang === "en"
        ? "Your annual summary of flights, km and countries in a shareable card. Show the world how much you fly."
        : "Tu resumen anual de vuelos, km y países en una tarjeta compartible. Mostrá al mundo cuánto viajás.",
    },
    {
      icon: Users,
      color: "text-violet-400",
      bg: "bg-violet-950/40",
      border: "border-violet-800/30",
      title: lang === "en" ? "TripSocial — Traveler network" : "TripSocial — Red de viajeros",
      desc: lang === "en"
        ? "Follow friends, react to their trips, and discover travelers with the same destinations."
        : "Seguí a amigos, reaccioná a sus viajes y descubrí viajeros con los mismos destinos.",
    },
    {
      icon: MonitorPlay,
      color: "text-amber-400",
      bg: "bg-amber-950/40",
      border: "border-amber-800/30",
      title: lang === "en" ? "AI Travel Diary" : "Diario de viaje con IA",
      desc: lang === "en"
        ? "After each trip, TripCopilot writes a personal first-person story of your adventure. Save it, copy it, or share it."
        : "Al terminar cada viaje, TripCopilot escribe una historia personal en primera persona de tu aventura. Guardala, copiala o compartila.",
    },
  ];

  const painPoints = [
    {
      emoji: "😰",
      problem: lang === "en" ? "You find out about delays too late" : "Te enterás tarde de las demoras",
      solution: lang === "en" ? "TripCopilot notifies you before the airport display does" : "TripCopilot te avisa antes que el panel del aeropuerto",
    },
    {
      emoji: "😓",
      problem: lang === "en" ? "You don't know if you'll miss your connection" : "No sabés si vas a perder la conexión",
      solution: lang === "en" ? "Automatic connection risk analysis at every layover" : "Análisis automático de riesgo de conexión en cada escala",
    },
    {
      emoji: "🤯",
      problem: lang === "en" ? "Multi-destination travel is chaos" : "Viajar a múltiples destinos es un caos",
      solution: lang === "en" ? "AI that understands your full itinerary and gives you a clear plan" : "IA que entiende todo tu itinerario y te da un plan claro",
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
      desc: "TripCopilot te avisa si algo cambia. Vos solo te subís al avión.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#030308] text-white overflow-x-hidden">

      {/* ── AUTH MODAL ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAuthModal && (
          <>
            <motion.div
              key="auth-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
              onClick={() => setShowAuthModal(false)}
            />
            <motion.div
              key="auth-modal"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/[0.08] p-6 space-y-5 relative"
                style={{ background: "linear-gradient(160deg, rgba(16,16,28,0.99) 0%, rgba(9,9,18,1) 100%)" }}
              >
                {/* Close */}
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label="Cerrar"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>

                {/* Header */}
                <div className="text-center pt-1">
                  <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-12 w-auto mx-auto mb-3" />
                  <h2 className="text-xl font-black tracking-tight mb-1">
                    {lang === "en" ? "Ready to fly stress-free?" : "¿Listo para volar tranquilo?"}
                  </h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {lang === "en" ? "No password, no hassle. In seconds." : "Sin contraseña, sin complicaciones."}
                  </p>
                </div>

                {sent ? (
                  <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 px-4 py-5 text-center space-y-2">
                    <p className="text-2xl">📬</p>
                    <p className="text-sm font-bold text-emerald-300">{lang === "en" ? "Check your email" : "Revisá tu email"}</p>
                    <p className="text-xs text-emerald-400/70 leading-relaxed">
                      {lang === "en" ? <>We sent a link to <span className="font-semibold">{email}</span>. Tap it to sign in.</> : <>Mandamos un link a <span className="font-semibold">{email}</span>. Tocá el link para entrar.</>}
                    </p>
                  </div>
                ) : (
                  <>
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
                      {lang === "en" ? "Continue with Google" : "Continuar con Google"}
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className="text-xs text-gray-600 uppercase tracking-wider">{lang === "en" ? "or with email" : "o con email"}</span>
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
                          className="w-full rounded-xl border border-white/[0.12] bg-surface-darker pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      {error && <p className="text-xs text-red-400">{error}</p>}
                      <button
                        type="submit"
                        disabled={loading || !email}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 text-sm font-semibold text-white transition-colors"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "en" ? "Send access link" : "Enviar link de acceso")}
                      </button>
                    </form>
                  </>
                )}

                <p className="text-xs text-center text-gray-600">
                  {lang === "en" ? "By continuing you accept our" : "Al continuar aceptás nuestra"}{" "}
                  <a href="/privacy" className="text-gray-400 hover:text-white underline transition-colors">
                    {lang === "en" ? "Privacy Policy" : "Política de Privacidad"}
                  </a>
                </p>
                <p className="text-center text-xs text-gray-700">
                  {lang === "en" ? "No password · Secure data · Free to start" : "Sin contraseña · Datos seguros · Gratis para empezar"}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              {lang === "en" ? "Features" : "Funciones"}
            </a>
            <a href="#planes" className="hidden sm:block text-xs text-gray-500 hover:text-gray-300 transition-colors">
              {lang === "en" ? "Plans" : "Planes"}
            </a>
            <a href="#faq" className="hidden sm:block text-xs text-gray-500 hover:text-gray-300 transition-colors">
              FAQ
            </a>
            {/* Language toggle */}
            <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs font-semibold">
              {(["es", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 transition-colors ${lang === l ? "bg-blue-600 text-white" : "bg-transparent text-gray-400 hover:text-gray-200"}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={openAuthModal}
              className="hidden sm:flex items-center gap-1 rounded-lg border border-white/[0.10] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:border-white/[0.20] transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              {lang === "en" ? "Login" : "Iniciar sesión"}
            </button>
            <button
              onClick={openAuthModal}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
            >
              {lang === "en" ? "Start free" : "Empezar gratis"}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="hero-gradient relative pt-24 pb-16 px-4 overflow-hidden">
        {/* Dot grid texture overlay */}
        <div className="hero-dots absolute inset-0 pointer-events-none" />
        {/* Background glows layered on top of animated gradient */}
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
                {lang === "en" ? "Take a photo · AI loads everything" : "Sacás foto · La IA carga todo sola"}
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.06] mb-5">
                {lang === "en" ? "Your co-pilot for" : "Tu copiloto para"}<br />
                <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #60a5fa, #a78bfa)" }}>
                  {lang === "en" ? "every flight" : "cada vuelo"}
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-gray-400 leading-relaxed mb-3 max-w-lg">
                {lang === "en" ? (
                  <>Paste your flight confirmation screenshot. <span className="text-white font-semibold">TripCopilot reads your itinerary and loads all flights in seconds</span> — no typing needed.</>
                ) : (
                  <>Pegá el screenshot de tu confirmación de vuelo.{" "}<span className="text-white font-semibold">TripCopilot lee tu itinerario y carga todos los vuelos en segundos</span>{" "}— sin tipear nada.</>
                )}
              </p>
              <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-lg">
                {lang === "en"
                  ? "Then it monitors FAA in real time, calculates connection risk, detects timezone changes on landing and alerts you about gate changes, delays and more."
                  : "Después monitorea la FAA en tiempo real, calcula el riesgo de conexión, detecta cambios de timezone al aterrizar y te avisa de cambios de puerta, demoras y más."}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-8">
                <button
                  onClick={openAuthModal}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-3.5 text-sm font-bold text-white transition-all shadow-lg shadow-blue-900/30 tap-scale"
                >
                  {lang === "en" ? "Start free" : "Empezar gratis"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] px-8 py-3.5 text-sm font-semibold text-gray-300 hover:bg-white/[0.08] transition-all"
                >
                  {lang === "en" ? "See demo" : "Ver demo"}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-700" /> {lang === "en" ? "No password" : "Sin contraseña"}</span>
                <span className="hidden sm:block h-3 w-px bg-gray-800" />
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-700" /> {lang === "en" ? "Free to start" : "Gratis para empezar"}</span>
                <span className="hidden sm:block h-3 w-px bg-gray-800" />
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-700" /> {lang === "en" ? "100% secure data" : "Datos 100% seguros"}</span>
              </div>

              {/* Social proof counter */}
              <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
                <div className="flex items-center gap-1 text-base" aria-label="Travellers from USA, Argentina, Mexico and Spain">
                  <span title="USA">🇺🇸</span>
                  <span title="Argentina">🇦🇷</span>
                  <span title="México">🇲🇽</span>
                  <span title="España">🇪🇸</span>
                </div>
                <p className="text-xs text-gray-400 leading-snug">
                  <span className="font-bold text-white">{lang === "en" ? "Early access" : "Acceso anticipado"}</span>{" "}
                  {lang === "en" ? "— join the first travelers" : "— unite a los primeros viajeros"}
                </p>
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
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-violet-700/50 bg-surface-elevated px-3 py-1.5 shadow-lg whitespace-nowrap">
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

      {/* ── INLINE SIGN-UP CTA (after hero) ──────────────────────────────── */}
      <div className="py-6 px-4" style={{ background: "linear-gradient(90deg, rgba(109,40,217,0.18) 0%, rgba(59,130,246,0.12) 100%)" }}>
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-sm font-bold text-white">
              {lang === "en" ? "Start free — no credit card required" : "Empezá gratis — sin tarjeta de crédito"}
            </p>
            <p className="text-xs text-violet-300 mt-0.5">
              {lang === "en" ? "2 trips free forever" : "2 viajes gratis para siempre"}
            </p>
          </div>
          <button
            onClick={openAuthModal}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-2.5 text-sm font-bold text-white transition-all shadow-lg shadow-violet-900/40"
          >
            {lang === "en" ? "Get started free" : "Empezar gratis"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── STICKY CTA BAR ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.08] backdrop-blur-xl"
            style={{ background: "rgba(4,4,12,0.92)" }}
          >
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">TripCopilot</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {lang === "en" ? "2 trips free forever · no card needed" : "2 viajes gratis para siempre · sin tarjeta"}
                </p>
              </div>
              <button
                onClick={openAuthModal}
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-bold text-white transition-all"
              >
                {lang === "en" ? "Start free" : "Empezar gratis"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {lang === "en" ? "Has this ever happened to you?" : "¿Te pasó alguna vez?"}
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">
              {lang === "en" ? "Features" : "Funciones"}
            </p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {lang === "en" ? "Everything a traveller needs" : "Todo lo que un viajero necesita"}
            </h2>
          </div>

          {/* War Room featured highlight */}
          <div className="mb-6 rounded-2xl border border-violet-600/40 overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.18) 0%, rgba(14,14,28,0.97) 60%, rgba(59,130,246,0.10) 100%)" }}>
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-2xl bg-violet-950/60 border border-violet-700/40">
                <MonitorPlay className="h-8 w-8 text-violet-400" />
              </div>
              <div className="text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-600/20 border border-violet-600/30 px-3 py-0.5 text-[11px] font-bold text-violet-300 uppercase tracking-wider mb-2">
                  {lang === "en" ? "Featured" : "Destacado"}
                </div>
                <h3 className="text-lg font-black text-white mb-1">
                  {lang === "en" ? "War Room mode" : "Modo War Room"}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xl">
                  {lang === "en"
                    ? "Everything you need on flight day in one screen — departure time, airport status, connection risk, checklist and alerts. No more switching between apps."
                    : "Todo lo que necesitás el día del vuelo en una sola pantalla — horario de salida, estado del aeropuerto, riesgo de conexión, checklist y alertas. Sin cambiar de app."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.slice(0, 4).map((f) => {
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
            <AnimatePresence>
              {featuresExpanded && features.slice(4).map((f) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`rounded-2xl border ${f.border} ${f.bg} p-5 space-y-3 flex flex-col items-center text-center`}
                  >
                    <div className={`flex items-center justify-center h-9 w-9 rounded-xl ${f.bg} border ${f.border}`}>
                      <Icon className={`h-4 w-4 ${f.color}`} />
                    </div>
                    <h3 className="text-sm font-bold text-white">{f.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {features.length > 4 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setFeaturesExpanded((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] px-6 py-2.5 text-sm font-semibold text-gray-300 transition-all"
              >
                {featuresExpanded
                  ? (lang === "en" ? "Show less" : "Ver menos")
                  : (lang === "en" ? `See all features (+${features.length - 4} more)` : `Ver más features (+${features.length - 4} más)`)}
                <motion.span
                  animate={{ rotate: featuresExpanded ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="inline-block"
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── TRIPSOCIAL ──────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">
              {lang === "en" ? "New" : "Nuevo"}
            </p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              TripSocial
            </h2>
            <p className="text-sm text-gray-500 mt-3 max-w-lg mx-auto">
              {lang === "en"
                ? "Your travel community. Follow friends, react to their trips, and discover travelers with the same destinations."
                : "Tu comunidad de viajeros. Seguí a amigos, reaccioná a sus viajes y descubrí viajeros con los mismos destinos."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Value props */}
            <div className="space-y-4">
              {[
                {
                  icon: "👤",
                  title: lang === "en" ? "Traveler profiles" : "Perfiles de viajero",
                  desc: lang === "en"
                    ? "Your @username, country flags and travel stats all in one public profile."
                    : "Tu @username, banderas de países y estadísticas de viaje en un perfil público.",
                },
                {
                  icon: "🎉",
                  title: lang === "en" ? "Trip reactions" : "Reacciones en viajes",
                  desc: lang === "en"
                    ? "Friends react to your flights with emoji. You see it in real time during your trip."
                    : "Tus amigos reaccionan a tus vuelos con emoji. Lo ves en tiempo real durante tu viaje.",
                },
                {
                  icon: "🗺️",
                  title: lang === "en" ? "Social map" : "Mapa social",
                  desc: lang === "en"
                    ? "See where in the world your travel friends are and who's flying to the same place."
                    : "Vé dónde está cada viajero en el mundo y quién va al mismo destino que vos.",
                },
              ].map((vp) => (
                <div key={vp.title} className="flex items-start gap-4 rounded-2xl border border-violet-800/20 bg-violet-950/20 p-4">
                  <span className="text-xl shrink-0 mt-0.5">{vp.icon}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">{vp.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{vp.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Fake profile card mockup */}
            <div className="flex justify-center">
              <div className="w-full max-w-[280px] rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 to-purple-950/30 p-5 space-y-4">
                {/* Profile header */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white font-black text-lg shrink-0">
                    M
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">@maru_viaja</p>
                    <p className="text-xs text-gray-500">Mariana G.</p>
                  </div>
                  <button className="ml-auto rounded-lg bg-violet-600/30 border border-violet-500/30 px-3 py-1 text-xs font-semibold text-violet-300">
                    {lang === "en" ? "Follow" : "Seguir"}
                  </button>
                </div>
                {/* Country chips */}
                <div className="flex flex-wrap gap-1.5">
                  {["🇦🇷", "🇧🇷", "🇲🇽", "🇺🇸", "🇪🇸"].map((flag) => (
                    <span key={flag} className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-sm">
                      {flag}
                    </span>
                  ))}
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] text-gray-500">
                    +3
                  </span>
                </div>
                {/* Trip with reactions */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">EZE</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-xs text-gray-400">JFK</span>
                    <span className="ml-auto text-[11px] text-gray-600">Apr 21</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {["🔥", "✈️", "🎉"].map((emoji) => (
                      <span key={emoji} className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-sm">
                        {emoji}
                      </span>
                    ))}
                    <span className="ml-auto text-[11px] text-gray-600">12 reactions</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NOTIFICATIONS ───────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Notificaciones</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">10 alertas que te cuidan el viaje</h2>
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
              { icon: "🚪", color: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-800/25", timing: "Antes de salir", title: "Cambio de puerta de embarque", desc: "Notificación push instantánea si tu vuelo cambia de puerta antes de que llegues al aeropuerto." },
              { icon: "🌐", color: "text-cyan-400", bg: "bg-cyan-950/30", border: "border-cyan-800/25", timing: "Al aterrizar", title: "Cambio de zona horaria detectado", desc: "TripCopilot detecta el cambio de timezone al llegar y actualiza los horarios a tu hora local." },
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

      {/* ── IA Contextual Features Section ─────────────────────────────── */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(109,40,217,0.07)_0%,_transparent_70%)] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-400 mb-4">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              TripCopilot IA · Tu viaje preparado
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              La IA que{" "}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                viaja con vos
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              No solo monitorea — te prepara. Antes de salir, en la escala, al llegar.
            </p>
          </div>

          {/* Cards grid 2x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Card 1: Packing list */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">
                  🧳
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg leading-snug">
                    Sabés exactamente qué llevar
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    La IA revisa tu destino, el clima real de los días de tu viaje y la duración. Te arma una lista personalizada — no genérica.
                  </p>
                </div>
              </div>
              <div className="mt-auto bg-gray-800/50 border border-white/[0.06] rounded-xl p-4">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Para Miami · 29 mar → 5 abr</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span className="text-amber-400">🌡</span> 26°C con lluvia los primeros días</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span className="text-emerald-400">✓</span> Ropa liviana (5 días)</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span className="text-emerald-400">✓</span> Campera impermeable</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span className="text-emerald-400">✓</span> Protector solar 50+</div>
                  <div className="flex items-center gap-2 text-sm text-gray-400"><span className="text-gray-500">✗</span> Adaptador de corriente — no necesario</div>
                </div>
              </div>
            </div>

            {/* Card 2: Guía de escala */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl">
                  🕐
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg leading-snug">
                    3 horas en Miami — ¿qué hacés?
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Le decís cuánto tiempo tenés en escala. TripCopilot te dice si podés salir, dónde comer, dónde ducharte y cuándo volver.
                  </p>
                </div>
              </div>
              <div className="mt-auto bg-gray-800/50 border border-white/[0.06] rounded-xl p-4">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Escala en MIA · 3h 40m</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span>✅</span> Podés salir al terminal principal</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span>🍔</span> Zona de comidas — Nivel D, Gate 25</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span>🚿</span> Shower disponible — Club Amex, Nivel E</div>
                  <div className="flex items-center gap-2 text-sm text-amber-400/90"><span>⏱</span> Volvé 45 min antes del boarding</div>
                </div>
              </div>
            </div>

            {/* Card 3: Lounge finder */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl">
                  🛋️
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg leading-snug">
                    ¿Accedés al lounge?
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Ingresás tu aerolínea y aeropuerto. TripCopilot confirma si tenés acceso, dónde está el lounge y hasta qué hora abre.
                  </p>
                </div>
              </div>
              <div className="mt-auto bg-gray-800/50 border border-white/[0.06] rounded-xl p-4">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Admirals Club · MIA Terminal D</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span className="text-emerald-400">✅</span> Acceso con AA Platinum</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span>🕐</span> Abre: 05:00 · Cierra: 23:00</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span>📍</span> Post-security, Nivel 2</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span>🍽</span> Buffet + bar abierto</div>
                </div>
              </div>
            </div>

            {/* Card 4: Consejos de destino */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-xl">
                  🌍
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg leading-snug">
                    Tips del lugar antes de llegar
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Moneda local, si necesitás visa, temperatura real de tus días y las cosas que sí o sí tenés que hacer.
                  </p>
                </div>
              </div>
              <div className="mt-auto bg-gray-800/50 border border-white/[0.06] rounded-xl p-4">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Georgetown · Islas Caimán</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span>💵</span> KYD · 1 USD = 0.82 KYD</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span className="text-emerald-400">🛂</span> Sin visa para Argentina</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span>🌡</span> 28°C · Soleado toda la semana</div>
                  <div className="flex items-center gap-2 text-sm text-gray-300"><span>📍</span> Seven Mile Beach, Stingray City</div>
                </div>
              </div>
            </div>

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

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="planes" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">
              {lang === "en" ? "Plans" : "Planes"}
            </p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {lang === "en" ? "Choose your plan" : "Elegí tu plan"}
            </h2>
            <p className="text-sm text-gray-500 mt-3">
              {lang === "en" ? "Start free. Upgrade when you need more." : "Empezá gratis. Mejorá cuando lo necesites."}
            </p>

            {/* Monthly / Annual toggle */}
            <div className="inline-flex items-center mt-6 rounded-full border border-white/[0.10] bg-white/[0.03] p-1 gap-1">
              <button
                onClick={() => setPricingPeriod("monthly")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  pricingPeriod === "monthly"
                    ? "bg-white/[0.10] text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {lang === "en" ? "Monthly" : "Mensual"}
              </button>
              <button
                onClick={() => setPricingPeriod("annual")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  pricingPeriod === "annual"
                    ? "bg-violet-600 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {lang === "en" ? "Annual (save 17%)" : "Anual (ahorrá 17%)"}
                {pricingPeriod === "annual" && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                    {lang === "en" ? "2 months free" : "2 meses gratis"}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* FREE */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Free</p>
              <p className="text-4xl font-black text-white mb-1">$0</p>
              <p className="text-xs text-gray-600 mb-6">{lang === "en" ? "forever" : "para siempre"}</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  lang === "en" ? "2 trips · 3 flights each" : "2 viajes · 3 vuelos c/u",
                  lang === "en" ? "Basic check-in alerts" : "Alertas básicas de check-in",
                  lang === "en" ? "Airport status monitoring" : "Monitoreo de aeropuertos",
                  lang === "en" ? "AI flight import" : "Importación IA de vuelos",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                    <CheckCircle className="h-4 w-4 text-gray-600 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={openAuthModal}
                className="w-full rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] py-3 text-sm font-semibold text-gray-300 transition-colors"
              >
                {lang === "en" ? "Start free" : "Empezar gratis"}
              </button>
            </div>

            {/* EXPLORER — POPULAR */}
            <div className="relative rounded-2xl border border-violet-500/50 bg-violet-950/20 p-6 flex flex-col shadow-lg shadow-violet-900/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
                {lang === "en" ? "Most popular" : "Más popular"}
              </div>
              {pricingPeriod === "annual" && (
                <div className="absolute top-4 right-4 rounded-full bg-emerald-600/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 whitespace-nowrap">
                  {lang === "en" ? "2 months free" : "2 meses gratis"}
                </div>
              )}
              <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">Explorer</p>
              {pricingPeriod === "annual" ? (
                <>
                  <p className="text-4xl font-black text-white mb-1">$4.166 ARS</p>
                  <p className="text-xs text-gray-500 mb-1">{lang === "en" ? "/month · billed annually" : "/mes · facturado anual"}</p>
                  <p className="text-[10px] text-gray-600 mb-5">
                    $50.000 ARS {lang === "en" ? "per year" : "por año"}
                    {priceUSD !== null ? ` · ≈$${Math.round(priceUSD / 2 * 10)} USD` : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-black text-white mb-1">
                    {priceUSD !== null ? `≈$${Math.round(priceUSD / 2)}` : "$5.000 ARS"}
                  </p>
                  <p className="text-xs text-gray-500 mb-1">{lang === "en" ? "/month" : "/mes"}</p>
                  {priceUSD !== null && <p className="text-[10px] text-gray-600 mb-5">$5.000 ARS · {lang === "en" ? "today's rate" : "cotización del día"}</p>}
                  {priceUSD === null && <div className="mb-5" />}
                </>
              )}
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  lang === "en" ? "10 trips · 15 flights each" : "10 viajes · 15 vuelos c/u",
                  lang === "en" ? "All push notifications" : "Todas las notificaciones push",
                  lang === "en" ? "AI TripAdvisor" : "AI TripAdvisor",
                  lang === "en" ? "World travel map" : "Mapa mundial de viajes",
                  lang === "en" ? "Travel Wrapped shareable" : "Travel Wrapped compartible",
                  lang === "en" ? "Trip Debrief · Export .ics" : "Trip Debrief · Export .ics",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("explorer")}
                disabled={subscribeLoading !== null}
                className="shimmer-btn w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 active:scale-95 py-3 text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                {subscribeLoading === "explorer" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {lang === "en" ? "Start Explorer →" : "Empezar Explorer →"}
              </button>
              <p className="text-xs text-center text-gray-500 mt-2">
                {lang === "en" ? "Cancel anytime" : "Cancelá en cualquier momento"}
              </p>
            </div>

            {/* PILOT */}
            <div className="relative rounded-2xl border border-blue-700/40 bg-blue-950/10 p-6 flex flex-col">
              {pricingPeriod === "annual" && (
                <div className="absolute top-4 right-4 rounded-full bg-emerald-600/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 whitespace-nowrap">
                  {lang === "en" ? "2 months free" : "2 meses gratis"}
                </div>
              )}
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Pilot 🚀</p>
              {pricingPeriod === "annual" ? (
                <>
                  <p className="text-4xl font-black text-white mb-1">$8.333 ARS</p>
                  <p className="text-xs text-gray-500 mb-1">{lang === "en" ? "/month · billed annually" : "/mes · facturado anual"}</p>
                  <p className="text-[10px] text-gray-600 mb-5">
                    $100.000 ARS {lang === "en" ? "per year" : "por año"}
                    {priceUSD !== null ? ` · ≈$${priceUSD * 10} USD` : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-black text-white mb-1">
                    {priceUSD !== null ? `≈$${priceUSD}` : "$10.000 ARS"}
                  </p>
                  <p className="text-xs text-gray-500 mb-1">{lang === "en" ? "/month" : "/mes"}</p>
                  {priceUSD !== null && <p className="text-[10px] text-gray-600 mb-5">$10.000 ARS · {lang === "en" ? "today's rate" : "cotización del día"}</p>}
                  {priceUSD === null && <div className="mb-5" />}
                </>
              )}
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  lang === "en" ? "Unlimited trips & flights" : "Viajes y vuelos ilimitados",
                  lang === "en" ? "Everything in Explorer" : "Todo lo de Explorer",
                  lang === "en" ? "AI Health Check 48h before" : "AI Health Check 48h antes",
                  lang === "en" ? "Weekly Morning Briefing" : "Morning Briefing semanal",
                  lang === "en" ? "Shared trips (coming soon)" : "Viajes compartidos (próximamente)",
                  lang === "en" ? "Priority support" : "Soporte prioritario",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe("pilot")}
                disabled={subscribeLoading !== null}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-60 active:scale-95 py-3 text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                {subscribeLoading === "pilot" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {lang === "en" ? "Subscribe Pilot" : "Suscribirse a Pilot"}
              </button>
            </div>
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

            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 mb-5">
              {lang === "en" ? "The math is simple" : "El cálculo es simple"}
            </p>

            {/* Big number */}
            <p className="text-5xl sm:text-7xl font-black text-amber-400 mb-3 tracking-tight">$300–$1.000</p>
            <p className="text-base sm:text-xl text-gray-300 font-semibold mb-3">
              {lang === "en"
                ? "the average cost of missing a connection"
                : "es lo que cuesta en promedio perder una conexión"}
            </p>
            <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-xl mx-auto">
              {lang === "en"
                ? "Rebooking, unexpected hotel, transfer. If you fly 4 times a year with a layover, the odds of it happening at some point aren't low — and when it does, you pay for it."
                : "Rebooking, hotel inesperado, traslado. Si viajás 4 veces al año con escala, la probabilidad de que te pase en algún momento no es baja — y cuando pasa, lo pagás caro."}
            </p>

            {/* Comparison */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <div className="rounded-2xl border border-red-800/30 bg-red-950/20 px-6 py-4 text-center">
                <p className="text-2xl sm:text-3xl font-black text-red-400">$300+</p>
                <p className="text-xs text-gray-500 mt-1">
                  {lang === "en" ? "missing a connection" : "perder una conexión"}
                </p>
              </div>
              <div className="text-gray-600 text-xl font-black">vs</div>
              <div className="rounded-2xl border border-emerald-700/30 bg-emerald-950/15 px-6 py-4 text-center">
                <p className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {priceUSD !== null ? `≈$${priceUSD}` : "$10.000 ARS"}
                  <span className="text-lg">{lang === "en" ? "/mo" : "/mes"}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {lang === "en" ? "TripCopilot monitoring" : "TripCopilot monitoreando"}
                </p>
                {priceUSD !== null && (
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    $10.000 ARS · {lang === "en" ? "today's rate" : "cotización del día"}
                  </p>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              {lang === "en" ? (
                <>TripCopilot pays for itself by preventing{" "}<span className="text-white font-bold">a single situation.</span></>
              ) : (
                <>TripCopilot se paga solo con prevenir{" "}<span className="text-white font-bold">una sola situación.</span></>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────── */}
      <SocialProofSection lang={lang} />

      {/* ── TRUST BADGES ─────────────────────────────────────────────────── */}
      <TrustBadges lang={lang} />

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <FaqSection lang={lang} />

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section ref={loginRef} id="empezar" className="py-20 px-4 text-center">
        <div className="max-w-sm mx-auto">
          <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-16 w-auto mx-auto mb-4" />
          <h2 className="text-2xl font-black tracking-tight mb-2">
            {lang === "en" ? "Ready to fly stress-free?" : "¿Listo para volar tranquilo?"}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            {lang === "en" ? (
              <>Verify with your email and you&apos;re in seconds —<br /><span className="text-gray-400">no password, no hassle.</span></>
            ) : (
              <>Verificá con tu email y entrás en segundos —<br /><span className="text-gray-400">sin contraseña, sin complicaciones.</span></>
            )}
          </p>
          <button
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-3 text-sm font-bold text-white transition-colors"
          >
            <LogIn className="h-4 w-4" />
            {lang === "en" ? "Start free" : "Empezar gratis"}
          </button>
          <p className="mt-4 text-xs text-gray-700">
            {lang === "en" ? "No password · Secure data · Free to start" : "Sin contraseña · Datos seguros · Gratis para empezar"}
          </p>
        </div>
      </section>

      {/* ── JSON-LD structured data ──────────────────────────────────────── */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "TripCopilot",
            description:
              "Monitoreo de vuelos en tiempo real. Alertas de demoras FAA, importá tu boarding pass con IA, y gestioná todos tus viajes.",
            applicationCategory: "TravelApplication",
            operatingSystem: "Web, iOS, Android",
            url: "https://tripcopilot.app",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
          }),
        }}
      />

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top row: logo + links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/tripcopliot-avatar.svg" alt="TripCopilot" className="h-6 w-auto" />
              <span className="text-sm font-black tracking-tight text-gray-400">TripCopilot</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-gray-600">
              <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacidad</a>
              <span className="h-3 w-px bg-gray-800" />
              <a href="/terms" className="hover:text-gray-400 transition-colors">Términos</a>
              <span className="h-3 w-px bg-gray-800" />
              <a href="/support" className="hover:text-gray-400 transition-colors">Soporte</a>
              <span className="h-3 w-px bg-gray-800" />
              <a href="mailto:hola@tripcopilot.app" className="hover:text-gray-400 transition-colors">hola@tripcopilot.app</a>
            </div>
          </div>
          {/* Bottom row: copyright + tagline */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-700">
            <p>© 2026 TripCopilot</p>
            <p>Hecho con ❤️ para viajeros</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
