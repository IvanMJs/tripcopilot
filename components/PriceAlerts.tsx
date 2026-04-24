"use client";

import { useState } from "react";
import { Plus, X, Bell, BellOff, ChevronDown } from "lucide-react";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";

const CURRENCIES = ["USD", "EUR", "ARS", "BRL", "UYU", "GBP"];

interface PriceAlertsProps {
  locale: "es" | "en";
}

export function PriceAlerts({ locale }: PriceAlertsProps) {
  const { alerts, loading, addAlert, removeAlert, toggleAlert } = usePriceAlerts();
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formOrigin, setFormOrigin]       = useState("");
  const [formDest, setFormDest]           = useState("");
  const [formMonth, setFormMonth]         = useState("");
  const [formMaxPrice, setFormMaxPrice]   = useState("");
  const [formCurrency, setFormCurrency]   = useState("USD");
  const [submitting, setSubmitting]       = useState(false);
  const [formError, setFormError]         = useState<string | null>(null);

  const IATA_RE = /^[A-Z]{3}$/;

  async function handleSubmit() {
    const origin = formOrigin.toUpperCase().trim();
    const dest   = formDest.toUpperCase().trim();

    if (!IATA_RE.test(origin) || !IATA_RE.test(dest)) {
      setFormError(locale === "es"
        ? "Ingresá códigos IATA válidos (3 letras)"
        : "Enter valid IATA codes (3 letters)");
      return;
    }
    if (!formMonth) {
      setFormError(locale === "es" ? "Seleccioná un mes" : "Select a month");
      return;
    }

    setFormError(null);
    setSubmitting(true);
    await addAlert({
      originCode:      origin,
      destinationCode: dest,
      targetDate:      `${formMonth}-01`,
      maxPrice:        formMaxPrice ? parseFloat(formMaxPrice) : null,
      currency:        formCurrency,
    });
    setSubmitting(false);
    setShowForm(false);
    setFormOrigin("");
    setFormDest("");
    setFormMonth("");
    setFormMaxPrice("");
    setFormCurrency("USD");
  }

  function formatMonth(dateStr: string): string {
    const [year, month] = dateStr.replace("-01", "").split("-");
    if (!year || !month) return dateStr;
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString(locale === "es" ? "es-AR" : "en-US", {
      month: "long",
      year:  "numeric",
    });
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="text-sm font-semibold text-white">
            {locale === "es" ? "Alertas de precio" : "Price alerts"}
          </span>
          {alerts.filter((a) => a.isActive).length > 0 && (
            <span className="rounded-full bg-[#FFB800] px-1.5 py-0.5 text-[10px] font-bold text-[#07070d] leading-none">
              {alerts.filter((a) => a.isActive).length}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.06] space-y-3 pt-3">
          {/* Add button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-700/40 bg-blue-950/20 hover:bg-blue-950/30 py-2.5 text-xs font-semibold text-blue-400 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {locale === "es" ? "Nueva alerta" : "New alert"}
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-3">
              <p className="text-xs font-semibold text-gray-400">
                {locale === "es" ? "Nueva alerta de precio" : "New price alert"}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">
                    {locale === "es" ? "Origen (IATA)" : "Origin (IATA)"}
                  </label>
                  <input
                    type="text"
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value.toUpperCase())}
                    maxLength={3}
                    placeholder="EZE"
                    className="w-full rounded-md border border-white/[0.08] bg-gray-900 px-2 py-1.5 text-xs text-white placeholder-gray-600 uppercase focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">
                    {locale === "es" ? "Destino (IATA)" : "Destination (IATA)"}
                  </label>
                  <input
                    type="text"
                    value={formDest}
                    onChange={(e) => setFormDest(e.target.value.toUpperCase())}
                    maxLength={3}
                    placeholder="MIA"
                    className="w-full rounded-md border border-white/[0.08] bg-gray-900 px-2 py-1.5 text-xs text-white placeholder-gray-600 uppercase focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-500 block mb-1">
                  {locale === "es" ? "Mes aproximado" : "Approximate month"}
                </label>
                <input
                  type="month"
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                  className="w-full rounded-md border border-white/[0.08] bg-gray-900 px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">
                    {locale === "es" ? "Precio máximo" : "Max price"}
                  </label>
                  <input
                    type="number"
                    value={formMaxPrice}
                    onChange={(e) => setFormMaxPrice(e.target.value)}
                    placeholder="500"
                    min={0}
                    className="w-full rounded-md border border-white/[0.08] bg-gray-900 px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1">
                    {locale === "es" ? "Moneda" : "Currency"}
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full rounded-md border border-white/[0.08] bg-gray-900 px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-[11px] text-red-400">{formError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#FFB800] hover:bg-[#FFC933] disabled:opacity-50 py-1.5 text-xs font-semibold text-[#07070d] transition-colors"
                >
                  {submitting
                    ? (locale === "es" ? "Guardando…" : "Saving…")
                    : (locale === "es" ? "Guardar alerta" : "Save alert")}
                </button>
                <button
                  onClick={() => { setShowForm(false); setFormError(null); }}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 py-1.5 text-xs text-gray-400 transition-colors"
                >
                  {locale === "es" ? "Cancelar" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {/* Alert list */}
          {loading && (
            <p className="text-xs text-gray-500 text-center py-2">
              {locale === "es" ? "Cargando…" : "Loading…"}
            </p>
          )}

          {!loading && alerts.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-3 leading-relaxed">
              {locale === "es"
                ? "Guardá rutas que te interesen y te recordamos cuándo revisar los precios"
                : "Save routes you're interested in and we'll remind you when to check prices"}
            </p>
          )}

          {!loading && alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-3 flex items-start justify-between gap-3 transition-colors ${
                    alert.isActive
                      ? "border-blue-800/30 bg-blue-950/10"
                      : "border-white/[0.06] bg-white/[0.02] opacity-60"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">
                      {alert.originCode} → {alert.destinationCode}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatMonth(alert.targetDate)}
                      {alert.maxPrice !== null && (
                        <> · {alert.currency} {alert.maxPrice.toLocaleString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      title={alert.isActive
                        ? (locale === "es" ? "Pausar" : "Pause")
                        : (locale === "es" ? "Activar" : "Activate")}
                      className="p-1 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      {alert.isActive
                        ? <Bell className="h-3.5 w-3.5" />
                        : <BellOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      title={locale === "es" ? "Eliminar" : "Delete"}
                      className="p-1 rounded-md hover:bg-red-950/30 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
