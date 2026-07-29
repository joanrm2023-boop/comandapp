// lib/supabase-admin.ts
//
// Cliente de Supabase con la clave `service_role`. SOLO se importa
// desde código que corre en el servidor (API routes de Next.js) —
// nunca desde un componente "use client", porque esta clave tiene
// permisos totales y se saltaría RLS por completo si se expusiera
// al navegador.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});