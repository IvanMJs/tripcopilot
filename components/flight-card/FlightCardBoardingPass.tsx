"use client";

import { useState, useRef } from "react";
import { Plane, ImagePlus } from "lucide-react";
import toast from "react-hot-toast";
import { TripFlight } from "@/lib/types";
import { BoardingPassView } from "@/components/BoardingPassView";
import { createClient } from "@/utils/supabase/client";

export interface FlightCardBoardingPassProps {
  flight: TripFlight;
  showButton: boolean;
  locale: "es" | "en";
  onBoardingPassSaved: (url: string | null) => void;
}

export function FlightCardBoardingPass({
  flight,
  showButton,
  locale,
  onBoardingPassSaved,
}: FlightCardBoardingPassProps) {
  const [showBoardingPass, setShowBoardingPass] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const hasBoardingPass = Boolean(flight.boardingPassUrl);
  const showSection = showButton || hasBoardingPass;

  async function handleOpen() {
    if (hasBoardingPass && flight.boardingPassUrl) {
      const supabase = createClient();
      const { data } = await supabase.storage
        .from("boarding-passes")
        .createSignedUrl(flight.boardingPassUrl, 3600);
      setSignedUrl(data?.signedUrl ?? null);
    }
    setShowBoardingPass(true);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userData.user.id}/${flight.id}.${ext}`;

    const { error } = await supabase.storage
      .from("boarding-passes")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error(locale === "es" ? "Error al subir el boarding pass" : "Error uploading boarding pass");
      setUploading(false);
      return;
    }

    const { data: urlData } = await supabase.storage
      .from("boarding-passes")
      .createSignedUrl(path, 3600);

    setSignedUrl(urlData?.signedUrl ?? null);
    onBoardingPassSaved(path);
    setUploading(false);
    toast.success(locale === "es" ? "Boarding pass guardado ✓" : "Boarding pass saved ✓");
  }

  async function handleDelete() {
    if (!flight.boardingPassUrl) return;
    const supabase = createClient();
    await supabase.storage.from("boarding-passes").remove([flight.boardingPassUrl]);
    setSignedUrl(null);
    onBoardingPassSaved(null);
    setShowBoardingPass(false);
    toast.success(locale === "es" ? "Boarding pass eliminado" : "Boarding pass removed");
  }

  return (
    <>
      {showSection && (
        <div className="px-4 pb-4 pt-2 border-t border-violet-800/20">
          <button
            onClick={handleOpen}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-950/40 border border-violet-700/40 hover:bg-violet-950/60 py-2.5 text-xs font-bold text-violet-300 transition-colors"
          >
            {hasBoardingPass ? (
              <>
                <Plane className="h-3.5 w-3.5" />
                {locale === "es" ? "Ver boarding pass" : "View boarding pass"}
              </>
            ) : (
              <>
                <ImagePlus className="h-3.5 w-3.5" />
                {locale === "es" ? "Agregar boarding pass" : "Add boarding pass"}
              </>
            )}
          </button>
        </div>
      )}
      {showBoardingPass && (
        <BoardingPassView
          flight={flight}
          onClose={() => setShowBoardingPass(false)}
          imageUrl={signedUrl}
          uploading={uploading}
          onUpload={handleUpload}
          onDelete={hasBoardingPass ? handleDelete : undefined}
          locale={locale}
        />
      )}
    </>
  );
}
