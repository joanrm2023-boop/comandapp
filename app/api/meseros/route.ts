// app/api/meseros/route.ts
//
// Crea un mesero nuevo desde el SERVIDOR, usando la clave de
// administrador de Supabase. Esto evita el problema de que
// `supabase.auth.signUp()` ejecutado en el navegador cambie la sesión
// activa del admin al mesero recién creado.
//
// Flujo:
// 1. Verifica quién llama (usando su token normal, con RLS activo)
//    y obtiene su negocio_id.
// 2. Si el correo ya existe en auth.users (cuenta huérfana de un
//    intento anterior), reutiliza ese auth_user_id en vez de fallar.
// 3. Inserta la fila en `usuarios` con la clave admin (evita RLS,
//    pero ya validamos arriba que el negocio_id es el correcto).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { nombre, email } = await req.json();

    if (!nombre?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
    }

    // 1. Identificar quién hace la petición, usando su propio token
    // (así respetamos RLS para saber su negocio_id real, sin adivinar).
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseCliente = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabaseCliente.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: usuarioActual, error: errorUsuarioActual } = await supabaseCliente
      .from("usuarios")
      .select("negocio_id, rol")
      .eq("auth_user_id", user.id)
      .single();

    if (errorUsuarioActual || !usuarioActual) {
      return NextResponse.json({ error: "No se pudo identificar tu negocio" }, { status: 403 });
    }

    // Solo admin/propietario pueden crear meseros
    if (!["admin", "propietario"].includes(usuarioActual.rol)) {
      return NextResponse.json({ error: "No tienes permisos para crear meseros" }, { status: 403 });
    }

    const negocioId = usuarioActual.negocio_id;

    // 2. Verificar si ya existe un mesero (activo o inactivo) con ese
    // email EN ESTE NEGOCIO — si existe inactivo, lo reactivamos en
    // vez de duplicar.
    const { data: meseroExistente } = await supabaseAdmin
      .from("usuarios")
      .select("id, activo")
      .eq("email", email.trim())
      .eq("negocio_id", negocioId)
      .eq("rol", "mesero")
      .maybeSingle();

    if (meseroExistente) {
      if (meseroExistente.activo) {
        return NextResponse.json({ error: "Este email ya está registrado como mesero activo" }, { status: 409 });
      }
      const { error: reactivarError } = await supabaseAdmin
        .from("usuarios")
        .update({ nombre: nombre.trim(), activo: true })
        .eq("id", meseroExistente.id);

      if (reactivarError) throw reactivarError;
      return NextResponse.json({ success: true, reactivado: true });
    }

    // 3. Verificar si el correo ya existe en auth.users (cuenta
    // huérfana de un intento anterior que falló a mitad de camino).
    const { data: listaUsuarios } = await supabaseAdmin.auth.admin.listUsers();
    const authUserExistente = listaUsuarios?.users.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    let authUserId: string;

    if (authUserExistente) {
      // Reutilizar la cuenta huérfana en vez de fallar con "already registered"
      authUserId = authUserExistente.id;
    } else {
      // Crear la cuenta de autenticación desde el servidor — esto NO
      // afecta la sesión de quien hace la petición (a diferencia de
      // signUp() ejecutado en el navegador).
      const { data: nuevoAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: "123456",
        email_confirm: true,
      });

      if (createError || !nuevoAuthUser.user) {
        throw createError ?? new Error("No se pudo crear la cuenta de autenticación");
      }
      authUserId = nuevoAuthUser.user.id;
    }

    // 4. Insertar en la tabla `usuarios` (con la clave admin, ya
    // validamos arriba que negocioId es el correcto para quien pidió esto).
    const { error: insertError } = await supabaseAdmin.from("usuarios").insert([
      {
        auth_user_id: authUserId,
        negocio_id: negocioId,
        nombre: nombre.trim(),
        email: email.trim(),
        rol: "mesero",
        activo: true,
      },
    ]);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error creando mesero:", err);
    return NextResponse.json({ error: err?.message || "Error desconocido" }, { status: 500 });
  }
}