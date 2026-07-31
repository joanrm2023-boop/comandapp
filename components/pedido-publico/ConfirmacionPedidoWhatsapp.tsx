"use client";

/**
 * components/pedido-publico/ConfirmacionPedidoWhatsapp.tsx
 *
 * Pantalla de "¡Pedido enviado!" + envío del pedido por WhatsApp.
 * Se sacó de la página del slug porque ya estaba muy cargada de lógica.
 *
 * Comportamiento:
 * - En celular (Android/iOS): después de la cuenta regresiva, intenta
 *   abrir la app nativa de WhatsApp directo (whatsapp://), sin pasar
 *   por la página intermedia de wa.me. Si después de ~1.8s la página
 *   sigue visible (osea que no saltó a la app), cae automáticamente
 *   al link de wa.me de siempre, simulando un clic real.
 * - En PC/escritorio: se comporta exactamente como antes, simulando
 *   un clic sobre el link de wa.me tras la cuenta regresiva.
 * - SIEMPRE, sin importar el dispositivo, queda visible un botón chico
 *   "¿No se abrió WhatsApp? Toca aquí" — un <a> real, para que un toque
 *   genuino del cliente garantice el envío incluso si el intento
 *   automático falla en algún celular particular.
 */

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

interface ConfirmacionPedidoWhatsappProps {
  numeroPedido: number | string;
  linkWhatsapp: string | null; // link wa.me ya armado (con número + texto codificado)
  telefonoLimpio: string | null; // solo dígitos, con código de país (ej: 573001234567)
  mensajeTexto: string | null; // el mismo mensaje, SIN codificar (para armar el whatsapp://)
  onNuevoPedido: () => void;
}

const esIOS = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(window as any).MSStream;

const esAndroid = () =>
  typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);

const esMobile = () => esIOS() || esAndroid();

export default function ConfirmacionPedidoWhatsapp({
  numeroPedido,
  linkWhatsapp,
  telefonoLimpio,
  mensajeTexto,
  onNuevoPedido,
}: ConfirmacionPedidoWhatsappProps) {
  const [segundosParaWhatsapp, setSegundosParaWhatsapp] = useState<number | null>(null);

  useEffect(() => {
    if (!linkWhatsapp) return;

    setSegundosParaWhatsapp(3);
    const intervalo = setInterval(() => {
      setSegundosParaWhatsapp((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timeout = setTimeout(() => {
      dispararEnvioWhatsapp();
    }, 3000);

    return () => {
      clearInterval(intervalo);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkWhatsapp]);

  const abrirConClicSimulado = (url: string) => {
    // Un clic real simulado sobre un <a> preserva la misma ruta de
    // codificación que un toque manual del usuario — es lo que ya
    // funcionaba bien antes para que los símbolos del mensaje no se
    // corrompieran en iOS Safari.
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  };

  const dispararEnvioWhatsapp = () => {
    if (!linkWhatsapp) return;

    // En PC/escritorio: mismo comportamiento de siempre, directo a wa.me.
    if (!esMobile() || !telefonoLimpio || !mensajeTexto) {
      abrirConClicSimulado(linkWhatsapp);
      return;
    }

    // En celular: se intenta abrir la app nativa directo, sin pasar
    // por la página intermedia de wa.me.
    const urlApp = `whatsapp://send?phone=${telefonoLimpio}&text=${encodeURIComponent(mensajeTexto)}`;

    let yaSalioDeLaPagina = false;
    const marcarSalida = () => {
      if (document.hidden) yaSalioDeLaPagina = true;
    };
    document.addEventListener("visibilitychange", marcarSalida);

    window.location.href = urlApp;

    // Si después de ~1.8s la página sigue visible, el intento directo
    // no funcionó (WhatsApp no instalado, o el navegador bloqueó el
    // salto automático) — se cae al link de wa.me de siempre.
    setTimeout(() => {
      document.removeEventListener("visibilitychange", marcarSalida);
      if (!yaSalioDeLaPagina && !document.hidden) {
        abrirConClicSimulado(linkWhatsapp);
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full border border-gray-100">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">¡Pedido enviado!</h2>
        <p className="text-gray-600 mb-1">
          Pedido <span className="font-bold text-orange-600">#{numeroPedido}</span>
        </p>
        <p className="text-gray-500 text-sm mb-5">
          Ya está en cocina, te lo llevamos pronto. El costo de tu domicilio depende de la distancia, te lo confirmamos ahora mismo por WhatsApp, antes de despachar tu pedido.
        </p>

        {linkWhatsapp ? (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-3">
              <div className="flex items-center justify-center gap-2 text-emerald-700 mb-1">
                <MessageCircle className="w-5 h-5" />
                <span className="font-semibold text-sm">
                  {segundosParaWhatsapp && segundosParaWhatsapp > 0
                    ? `Enviando a WhatsApp en ${segundosParaWhatsapp}...`
                    : "Abriendo WhatsApp..."}
                </span>
              </div>
              <p className="text-emerald-600 text-xs">
                Tu pedido se enviará automáticamente al negocio por WhatsApp para confirmarlo.
              </p>
            </div>

            {/* Red de seguridad: un toque real siempre funciona, aunque
                el intento automático falle en algún celular particular. */}
            <a
              href={linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl py-2.5 px-4 mb-4 font-medium transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              ¿No se abrió WhatsApp? Toca aquí
            </a>
          </>
        ) : (
          <p className="text-xs text-gray-400 mb-3">
            Este negocio aún no tiene un WhatsApp configurado. Contáctalo directamente para confirmar tu pedido.
          </p>
        )}

        <button
          onClick={onNuevoPedido}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-6 py-3 rounded-xl w-full"
        >
          Hacer otro pedido
        </button>
      </div>
    </div>
  );
}