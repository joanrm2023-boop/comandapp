"use client";

/**
 * components/ui/SubirPortada.tsx
 *
 * Análogo a SubirLogo, pero para la foto de portada del negocio
 * (columna `negocios.imagen_portada`), usada en el hero de la página
 * pública de domicilios (app/[slug]/page.tsx).
 *
 * Reutiliza el mismo bucket de Storage que ya usa SubirLogo
 * ("logos-negocios"), solo que con un prefijo de archivo distinto
 * ("portada-...") para no chocar con los logos.
 *
 * No modifica ni depende de SubirLogo — es un componente independiente.
 */

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ImageIcon, Loader2, Upload } from "lucide-react";

interface SubirPortadaProps {
  negocioId: string;
  portadaActual: string | null;
  onPortadaActualizada: (nuevaUrl: string) => void;
}

export default function SubirPortada({ negocioId, portadaActual, onPortadaActualizada }: SubirPortadaProps) {
  const [subiendo, setSubiendo] = useState(false);

  const manejarArchivo = async (archivo: File) => {
    try {
      setSubiendo(true);

      if (!archivo.type.startsWith("image/")) {
        toast.error("Selecciona un archivo de imagen válido");
        return;
      }
      if (archivo.size > 5 * 1024 * 1024) {
        toast.error("La imagen no debe superar 5MB");
        return;
      }

      const extension = archivo.name.split(".").pop();
      const nombreArchivo = `portada-${negocioId}-${Date.now()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from("logos-negocios")
        .upload(nombreArchivo, archivo, { upsert: true });

      if (errorSubida) throw errorSubida;

      const { data: urlData } = supabase.storage.from("logos-negocios").getPublicUrl(nombreArchivo);
      const urlPublica = urlData.publicUrl;

      const { error: errorUpdate } = await supabase
        .from("negocios")
        .update({ imagen_portada: urlPublica })
        .eq("id", negocioId);

      if (errorUpdate) throw errorUpdate;

      onPortadaActualizada(urlPublica);
      toast.success("Foto de portada actualizada");
    } catch (err: any) {
      console.error("Error subiendo portada:", err);
      toast.error("Error al subir la portada: " + (err?.message || "desconocido"));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div>
      <label
        htmlFor="input-portada"
        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 rounded-xl p-6 cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors"
      >
        {subiendo ? (
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        ) : (
          <Upload className="w-6 h-6 text-zinc-400" />
        )}
        <span className="text-sm text-zinc-600 font-medium">
          {subiendo ? "Subiendo..." : portadaActual ? "Cambiar foto de portada" : "Subir foto de portada"}
        </span>
        <span className="text-xs text-zinc-400">Recomendado: horizontal, máx. 5MB</span>
        <input
          id="input-portada"
          type="file"
          accept="image/*"
          className="hidden"
          disabled={subiendo}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) manejarArchivo(archivo);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}