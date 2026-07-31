"use client";

/**
 * app/[slug]/error.tsx
 *
 * Next.js activa automáticamente este archivo (convención especial)
 * cuando algo revienta sin capturar en cualquier parte de esta ruta
 * (page.tsx, o cualquier componente que use, como
 * ConfirmacionPedidoWhatsapp). Reemplaza la pantalla técnica de
 * "Application error: a client-side exception has occurred" por una
 * pantalla amigable, y de paso deja el error registrado en Supabase
 * para poder revisarlo después sin depender de que el cliente mande
 * captura de pantalla.
 */

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error capturado en la página del slug:", error);

    const registrarError = async () => {
      try {
        const { error: errorSupabase } = await supabase.from("errores_frontend").insert({
          mensaje: error.message || "Error desconocido",
          stack: error.stack || null,
          pagina: typeof window !== "undefined" ? window.location.pathname : null,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        });

        if (errorSupabase) {
          // 🆕 supabase-js NO lanza excepción cuando el insert falla
          // (ej: bloqueado por RLS) — devuelve { error } en la respuesta.
          // Sin este chequeo explícito, un fallo aquí queda en silencio
          // total, sin dejar rastro en ningún lado.
          console.error("Supabase rechazó el insert en errores_frontend:", errorSupabase);
        }
      } catch (errGuardando) {
        // Si ni siquiera esto funciona, no hay nada más que hacer —
        // al menos ya quedó en la consola con el console.error de arriba.
        console.error("No se pudo registrar el error en Supabase:", errGuardando);
      }
    };

    registrarError();
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full border border-gray-100">
        <div className="text-6xl mb-4">😅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Algo no cargó bien</h2>
        <p className="text-gray-600 text-sm mb-1">
          Tuvimos un problema mostrando esta pantalla.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Si ya habías confirmado tu pedido, tranquilo — seguramente ya quedó
          registrado. Si tienes dudas, contáctanos directamente para confirmarlo.
        </p>
        <button
          onClick={() => reset()}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-6 py-3 rounded-xl w-full mb-3"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}