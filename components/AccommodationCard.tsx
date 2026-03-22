"use client";

import { useState, useRef } from "react";
import { Hotel, Pencil, Trash2, X, Plus, Upload, RotateCcw, MapPin, Hash, Sun, Moon } from "lucide-react";
import { analytics } from "@/lib/analytics";

function TripCopilotIcon({ spinning, size = 16 }: { spinning?: boolean; size?: number }) {
  return (
    <img
      src="/tripcopliot-avatar.svg"
      alt="TripCopilot"
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${spinning ? "animate-spin" : ""}`}
      style={spinning ? { animationDuration: "2s" } : undefined}
    />
  );
}
import { Accommodation } from "@/lib/types";

// ── Labels ────────────────────────────────────────────────────────────────────

export type AccommodationLabels = {
  accNamePlaceholder: string;
  accCheckIn:         string;
  accCheckOut:        string;
  accRemove:          string;
  accEdit:            string;
  accSave:            string;
  accCancel:          string;
  accNights:          (n: number) => string;
  accErrName:         string;
  accAdd:             string;
  accConfCode:        string;
  accAddress:         string;
  accTabAI:           string;
  accTabManual:       string;
  accAIPlaceholder:   string;
  accAILoading:       string;
  accAIError:         string;
  accAIPhoto:         string;
  accAIReview:        string;
  accAIRetry:         string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function estimateArrivalDate(isoDate: string, departureTime: string, arrivalBuffer: number): string {
  if (departureTime && departureTime >= "20:00" && arrivalBuffer >= 2) {
    const d = new Date(isoDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return isoDate;
}

export function nightsBetween(isoA: string, isoB: string): number {
  return Math.round(
    (new Date(isoB + "T00:00:00").getTime() - new Date(isoA + "T00:00:00").getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

export type AccommodationFormData = {
  name: string;
  checkInTime?: string;
  checkOutTime?: string;
  confirmationCode?: string;
  address?: string;
};

// ── AccommodationInline ───────────────────────────────────────────────────────

export function AccommodationInline({
  acc,
  checkInDate,
  checkOutDate,
  locale,
  onRemove,
  onEdit,
  L,
}: {
  acc: Accommodation;
  checkInDate: string;
  checkOutDate?: string;
  locale: "es" | "en";
  onRemove: () => void;
  onEdit: (name: string, checkInTime?: string, checkOutTime?: string, confirmationCode?: string, address?: string) => void;
  L: AccommodationLabels;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(acc.name);
  const [editCheckIn, setEditCheckIn] = useState(acc.checkInTime ?? "");
  const [editCheckOut, setEditCheckOut] = useState(acc.checkOutTime ?? "");
  const [editConfCode, setEditConfCode] = useState(acc.confirmationCode ?? "");
  const [editAddress, setEditAddress] = useState(acc.address ?? "");
  const nights = checkOutDate ? nightsBetween(checkInDate, checkOutDate) : null;
  const inputCls = "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500/60 transition-colors";
  const timeCls  = "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-1.5 py-1 text-[11px] text-white outline-none focus:border-blue-500/60 transition-colors";

  void locale;

  function saveEdit() {
    onEdit(editName.trim(), editCheckIn || undefined, editCheckOut || undefined, editConfCode || undefined, editAddress || undefined);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-2">
        <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
          placeholder={L.accNamePlaceholder} className={inputCls}
          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
        />
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600 mb-1">{L.accCheckIn}</p>
            <input type="time" value={editCheckIn} onChange={(e) => setEditCheckIn(e.target.value)} className={timeCls} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600 mb-1">{L.accCheckOut}</p>
            <input type="time" value={editCheckOut} onChange={(e) => setEditCheckOut(e.target.value)} className={timeCls} />
          </div>
        </div>
        <input value={editConfCode} onChange={(e) => setEditConfCode(e.target.value)}
          placeholder={L.accConfCode} className={inputCls} />
        <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)}
          placeholder={L.accAddress} className={inputCls} />
        <div className="flex gap-2">
          <button onClick={saveEdit}
            className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 py-1.5 text-xs font-medium text-white transition-colors">
            {L.accSave}
          </button>
          <button onClick={() => setEditing(false)}
            className="px-3 rounded-lg border border-white/[0.08] py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            {L.accCancel}
          </button>
        </div>
      </div>
    );
  }

  const checkinDateFormatted = checkInDate
    ? new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
        day: "numeric", month: "short",
      }).format(new Date(checkInDate + "T00:00:00"))
    : "";
  const checkoutDateFormatted = checkOutDate
    ? new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
        day: "numeric", month: "short",
      }).format(new Date(checkOutDate + "T00:00:00"))
    : "";

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05]">
      {/* Name row */}
      <div className="flex items-start gap-2 mb-2">
        <Hotel className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{acc.name}</p>
          {nights !== null && (
            <p className="text-[10px] text-gray-600">{L.accNights(nights)}</p>
          )}
          {acc.confirmationCode && (
            <p className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
              <Hash className="h-2.5 w-2.5" />{acc.confirmationCode}
            </p>
          )}
          {acc.address && (
            <p className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="h-2.5 w-2.5 shrink-0" />{acc.address}
            </p>
          )}
        </div>
        <button onClick={() => setEditing(true)} title={L.accEdit}
          className="shrink-0 p-1 rounded-md text-gray-600 hover:text-blue-400 transition-colors flex items-center justify-center">
          <Pencil className="h-3 w-3" />
        </button>
        <button onClick={onRemove} title={L.accRemove}
          className="shrink-0 p-1 rounded-md text-gray-600 hover:text-red-400 transition-colors flex items-center justify-center">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Time blocks grid */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-gray-500 mb-1">
            <Sun className="w-3 h-3" /> {L.accCheckIn}
          </p>
          <p className="text-xl font-bold tabular-nums text-white">{acc.checkInTime || "--:--"}</p>
          {checkinDateFormatted && (
            <p className="text-xs text-gray-400 mt-0.5">{checkinDateFormatted}</p>
          )}
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-gray-500 mb-1">
            <Moon className="w-3 h-3" /> {L.accCheckOut}
          </p>
          <p className="text-xl font-bold tabular-nums text-white">{acc.checkOutTime || "--:--"}</p>
          {checkoutDateFormatted && (
            <p className="text-xs text-gray-400 mt-0.5">{checkoutDateFormatted}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AddAccommodationInlineForm ────────────────────────────────────────────────

type ParsedAccommodation = {
  name: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  confirmation_code: string | null;
  address: string | null;
};

export function AddAccommodationInlineForm({
  destCity,
  onAdd,
  onClose,
  locale,
  L,
}: {
  destCity: string;
  onAdd: (data: AccommodationFormData) => void;
  onClose: () => void;
  locale: "es" | "en";
  L: AccommodationLabels;
}) {
  const [tab, setTab] = useState<"ai" | "manual">("ai");

  // AI state
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedAccommodation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state (shared between AI review + manual)
  const [name, setName] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [confCode, setConfCode] = useState("");
  const [address, setAddress] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const inputCls = "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500/60 transition-colors";
  const timeCls  = "w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-1.5 py-1 text-[11px] text-white outline-none focus:border-blue-500/60 transition-colors";

  void locale;

  async function handleAIParse(text?: string, imageBase64?: string, mimeType?: string) {
    setAiLoading(true);
    setAiError(null);
    try {
      const body: Record<string, string> = {};
      if (text) body.text = text;
      if (imageBase64) { body.imageBase64 = imageBase64; body.mimeType = mimeType!; }
      body.tripContext = destCity ? `destination: ${destCity}` : "";

      const res = await fetch("/api/parse-accommodation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiError(data.error ?? L.accAIError);
        return;
      }
      setParsed(data);
      setName(data.name ?? "");
      setCheckInTime(data.check_in_time ?? "");
      setCheckOutTime(data.check_out_time ?? "");
      setConfCode(data.confirmation_code ?? "");
      setAddress(data.address ?? "");
    } catch {
      setAiError(L.accAIError);
    } finally {
      setAiLoading(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      handleAIParse(undefined, base64, mimeType);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSubmit() {
    if (!name.trim()) { setErr(L.accErrName); return; }
    analytics.accommodationAdded({ via: parsed ? "ai" : "manual" });
    onAdd({
      name: name.trim(),
      checkInTime: checkInTime || undefined,
      checkOutTime: checkOutTime || undefined,
      confirmationCode: confCode || undefined,
      address: address || undefined,
    });
    onClose();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
          <Hotel className="h-3 w-3" />
          {locale === "es" ? `Hotel en ${destCity}` : `Hotel in ${destCity}`}
        </span>
        <button onClick={onClose} className="p-0.5 text-gray-600 hover:text-gray-300 transition-colors flex items-center justify-center">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5 gap-0.5">
        <button
          onClick={() => { setTab("ai"); setParsed(null); setAiError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-[11px] font-semibold transition-all ${
            tab === "ai" ? "bg-violet-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <TripCopilotIcon size={20} />
          {L.accTabAI}
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-semibold transition-all ${
            tab === "manual" ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Pencil className="h-3 w-3" />
          {L.accTabManual}
        </button>
      </div>

      {/* ── AI TAB ── */}
      {tab === "ai" && !parsed && (
        <div className="space-y-2">
          {aiLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <TripCopilotIcon spinning size={36} />
              <p className="text-xs text-violet-300 font-medium">{L.accAILoading}</p>
            </div>
          ) : (
            <>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder={L.accAIPlaceholder}
                rows={3}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-violet-500/60 transition-colors resize-none leading-relaxed"
              />

              {aiError && (
                <p className="text-[11px] text-red-400 flex items-center gap-1">
                  <span>{aiError}</span>
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => aiText.trim() && handleAIParse(aiText)}
                  disabled={!aiText.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 py-2 text-xs font-bold text-white transition-colors"
                >
                  <TripCopilotIcon size={13} />
                  {L.accTabAI}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-xs text-gray-300 transition-colors"
                  title={L.accAIPhoto}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {L.accAIPhoto}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── AI REVIEW FORM ── */}
      {tab === "ai" && parsed && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1">
              <TripCopilotIcon size={12} />
              {L.accAIReview}
            </p>
            <button
              onClick={() => { setParsed(null); setAiError(null); }}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              {L.accAIRetry}
            </button>
          </div>

          <input value={name} onChange={(e) => { setName(e.target.value); setErr(null); }}
            placeholder={L.accNamePlaceholder} className={inputCls} autoFocus />

          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 mb-1">{L.accCheckIn}</p>
              <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className={timeCls} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 mb-1">{L.accCheckOut}</p>
              <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className={timeCls} />
            </div>
          </div>
          <input value={confCode} onChange={(e) => setConfCode(e.target.value)}
            placeholder={L.accConfCode} className={inputCls} />
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder={L.accAddress} className={inputCls} />

          {err && <p className="text-[11px] text-red-400">{err}</p>}

          <button onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            {L.accAdd}
          </button>
        </div>
      )}

      {/* ── MANUAL TAB ── */}
      {tab === "manual" && (
        <div className="space-y-2">
          <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr(null); }}
            placeholder={L.accNamePlaceholder} className={inputCls}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 mb-1">{L.accCheckIn}</p>
              <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className={timeCls} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 mb-1">{L.accCheckOut}</p>
              <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className={timeCls} />
            </div>
          </div>
          <input value={confCode} onChange={(e) => setConfCode(e.target.value)}
            placeholder={L.accConfCode} className={inputCls} />
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder={L.accAddress} className={inputCls} />
          {err && <p className="text-[11px] text-red-400">{err}</p>}
          <button onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            {L.accAdd}
          </button>
        </div>
      )}
    </div>
  );
}
