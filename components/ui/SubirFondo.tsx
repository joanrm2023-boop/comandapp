"use client";

/**
 * components/ui/SubirFondo.tsx
 *
 * Análogo a SubirLogo y SubirPortada, pero para la imagen de fondo
 * general de la página pública de domicilios (columna
 * `negocios.imagen_fondo`) — el fondo detrás de las tarjetas de
 * categorías, hoy blanco por defecto.
 *
 * Reutiliza el mismo bucket de Storage "logos-negocios", con un
 * prefijo de archivo distinto ("fondo-...") para no chocar con logos
 * ni portadas.
 */

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

interface SubirFondoProps {
  negocioId: string;
  fondoActual: string | null;
  onFondoActualizado: (nuevaUrl: string) => void;
}

export default function SubirFondo({ negocioId, fondoActual, onFondoActualizado }: SubirFondoProps) {
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
      const nombreArchivo = `fondo-${negocioId}-${Date.now()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from("logos-negocios")
        .upload(nombreArchivo, archivo, { upsert: true });

      if (errorSubida) throw errorSubida;

      const { data: urlData } = supabase.storage.from("logos-negocios").getPublicUrl(nombreArchivo);
      const urlPublica = urlData.publicUrl;

      const { error: errorUpdate } = await supabase
        .from("negocios")
        .update({ imagen_fondo: urlPublica })
        .eq("id", negocioId);

      if (errorUpdate) throw errorUpdate;

      onFondoActualizado(urlPublica);
      toast.success("Fondo actualizado");
    } catch (err: any) {
      console.error("Error subiendo fondo:", err);
      toast.error("Error al subir el fondo: " + (err?.message || "desconocido"));
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div>
      <label
        htmlFor="input-fondo"
        className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 rounded-xl p-6 cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors"
      >
        {subiendo ? (
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        ) : (
          <Upload className="w-6 h-6 text-zinc-400" />
        )}
        <span className="text-sm text-zinc-600 font-medium">
          {subiendo ? "Subiendo..." : fondoActual ? "Cambiar fondo" : "Subir imagen de fondo"}
        </span>
        <span className="text-xs text-zinc-400">Recomendado: patrón sutil o textura, máx. 5MB</span>
        <input
          id="input-fondo"
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