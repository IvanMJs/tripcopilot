"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Save } from "lucide-react";

const MAX_CHARS = 2000;

interface TripNotesProps {
  tripId: string;
  locale: "es" | "en";
}

interface NoteTemplate {
  emoji: string;
  header: { es: string; en: string };
}

const NOTE_TEMPLATES: NoteTemplate[] = [
  { emoji: "📍", header: { es: "Dirección del hotel",     en: "Hotel address"       } },
  { emoji: "📞", header: { es: "Contacto de emergencia",  en: "Emergency contact"   } },
  { emoji: "🔑", header: { es: "Código de reserva",       en: "Booking code"        } },
  { emoji: "📝", header: { es: "Notas generales",         en: "General notes"       } },
];

function applyBasicMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // headers: lines starting with #
    .replace(/^(#{1,3})\s+(.+)$/gm, (_, hashes: string, content: string) => {
      const level = hashes.length;
      const size = level === 1 ? "text-base font-bold text-white" : level === 2 ? "text-sm font-bold text-[#FFB800]" : "text-xs font-bold text-gray-300";
      return `<span class="${size} block mt-2">${content}</span>`;
    })
    // bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    // newlines
    .replace(/\n/g, "<br />");
}

export function TripNotes({ tripId, locale }: TripNotesProps) {
  const storageKey = `tc-trip-notes-${tripId}`;
  const [notes, setNotes] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setNotes(stored);
      }
    }
  }, [storageKey]);

  function persistNotes(value: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, value);
      setSaved(true);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value.slice(0, MAX_CHARS);
    setNotes(value);
    setSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistNotes(value), 800);
  }

  function handleManualSave() {
    persistNotes(notes);
  }

  function insertTemplate(template: NoteTemplate) {
    const header = `\n\n## ${template.emoji} ${template.header[locale]}\n`;
    const textarea = textareaRef.current;
    if (!textarea) {
      const next = (notes + header).slice(0, MAX_CHARS);
      setNotes(next);
      setSaved(false);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => persistNotes(next), 800);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = notes.slice(0, start);
    const after = notes.slice(end);
    const next = (before + header + after).slice(0, MAX_CHARS);
    setNotes(next);
    setSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistNotes(next), 800);
    // Restore cursor after state update
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = (before + header).length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }

  const remaining = MAX_CHARS - notes.length;
  const isNearLimit = remaining <= 200;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#FFB800]" />
          <h3 className="text-sm font-bold text-white">
            {locale === "es" ? "Notas del viaje" : "Trip notes"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
              showPreview
                ? "border-[rgba(255,184,0,0.25)] bg-[rgba(255,184,0,0.12)] text-[#FFB800]"
                : "border-white/10 bg-white/5 text-gray-400 hover:text-gray-300"
            }`}
          >
            {showPreview
              ? locale === "es" ? "Editar" : "Edit"
              : locale === "es" ? "Vista previa" : "Preview"}
          </button>
          <button
            onClick={handleManualSave}
            disabled={saved}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-gray-300 disabled:opacity-40 transition-colors"
            title={locale === "es" ? "Guardar" : "Save"}
          >
            <Save className="h-3 w-3" />
            {saved
              ? locale === "es" ? "Guardado" : "Saved"
              : locale === "es" ? "Guardar" : "Save"}
          </button>
        </div>
      </div>

      {/* Quick-add templates */}
      <div className="flex flex-wrap gap-1.5">
        {NOTE_TEMPLATES.map((t) => (
          <button
            key={t.header.en}
            onClick={() => insertTemplate(t)}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-gray-200 transition-colors tap-scale"
          >
            <span>{t.emoji}</span>
            <span>{t.header[locale]}</span>
          </button>
        ))}
      </div>

      {/* Textarea or preview */}
      {showPreview ? (
        <div
          className="min-h-[180px] w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-gray-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: notes.trim() ? applyBasicMarkdown(notes) : `<span class="text-gray-600 italic">${locale === "es" ? "Sin notas todavía..." : "No notes yet..."}</span>` }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={handleChange}
          placeholder={
            locale === "es"
              ? "Anotá todo lo importante: dirección del hotel, contactos, códigos de reserva...\n\nUsá ## para títulos y **texto** para negrita."
              : "Jot down everything important: hotel address, contacts, booking codes...\n\nUse ## for headings and **text** for bold."
          }
          className="w-full min-h-[180px] rounded-xl border border-white/[0.08] bg-white/[0.03] focus:border-[rgba(255,184,0,0.25)] focus:bg-[rgba(255,184,0,0.06)] px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 leading-relaxed resize-y outline-none transition-colors"
          spellCheck={false}
        />
      )}

      {/* Character count */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-600">
          {locale === "es"
            ? "Formato: **negrita**, ## título"
            : "Formatting: **bold**, ## heading"}
        </p>
        <p className={`text-[11px] font-medium ${isNearLimit ? "text-amber-400" : "text-gray-600"}`}>
          {notes.length} / {MAX_CHARS}
        </p>
      </div>
    </motion.div>
  );
}
