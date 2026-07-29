// app/[slug]/layout.tsx
//
// Genera la metadata (título, descripción, imagen) dinámicamente según
// el negocio del slug, para que al compartir el link (WhatsApp,
// Instagram, etc.) se vea el nombre y logo del NEGOCIO en vez del
// genérico "Create Next App" que trae Next.js por defecto.
//
// Esto vive en un layout (Server Component) porque page.tsx es
// "use client" y un componente de cliente no puede exportar
// generateMetadata directamente.

import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;

  const { data: negocio } = await supabaseServer
    .from("negocios")
    .select("nombre, logo_url, imagen_portada")
    .eq("slug", slug)
    .single();

  if (!negocio) {
    return {
      title: "Pedido a domicilio",
      description: "Haz tu pedido a domicilio aquí",
    };
  }

  const imagenVistaPrevia = negocio.imagen_portada || negocio.logo_url || undefined;

  return {
    title: `${negocio.nombre} - Pide a domicilio`,
    description: `¡Mira el menú de ${negocio.nombre} y pide a domicilio aquí!`,
    icons: negocio.logo_url
      ? {
          icon: negocio.logo_url,
          shortcut: negocio.logo_url,
          apple: negocio.logo_url,
        }
      : undefined,
    openGraph: {
      title: `${negocio.nombre} - Pide a domicilio`,
      description: `¡Mira el menú de ${negocio.nombre} y pide a domicilio aquí!`,
      images: imagenVistaPrevia ? [{ url: imagenVistaPrevia }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${negocio.nombre} - Pide a domicilio`,
      description: `¡Mira el menú de ${negocio.nombre} y pide a domicilio aquí!`,
      images: imagenVistaPrevia ? [imagenVistaPrevia] : [],
    },
  };
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}