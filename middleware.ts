import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { pathname } = req.nextUrl

  console.log('🔒 Middleware ejecutándose en:', pathname)

  // 1. Rutas públicas (no requieren autenticación)
  const rutasPublicas = ['/login', '/cambio-contrasena', '/']
  const esRutaPublica = rutasPublicas.includes(pathname)

  // 2. Verificar sesión de Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log('🔐 ¿Tiene sesión?:', !!session)

  // 3. Si NO hay sesión y NO es ruta pública → Login
  if (!session && !esRutaPublica) {
    console.log('❌ Sin sesión, redirigiendo a /login desde:', pathname)
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 4. Si hay sesión y está en /login → Redirigir según rol
  if (session && pathname === '/login') {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('auth_user_id', session.user.id)
      .eq('activo', true)
      .single()

    if (usuario?.rol === 'admin') {
      console.log('✅ Admin logueado, redirigiendo a /admin/menu')
      return NextResponse.redirect(new URL('/admin/menu', req.url))
    } else if (usuario?.rol === 'mesero') {
      console.log('✅ Mesero logueado, redirigiendo a /mesero/menumesero')
      return NextResponse.redirect(new URL('/mesero/menumesero', req.url))
    }
  }

  // 5. Si es ruta pública, permitir acceso
  if (esRutaPublica) {
    console.log('✅ Ruta pública, permitiendo acceso a:', pathname)
    return res
  }

  // 6. 🔥 VALIDACIÓN DE ROL (lo más importante)
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('rol, activo')
    .eq('auth_user_id', session!.user.id)
    .single()

  // Si no se encuentra el usuario o hay error
  if (error || !usuario) {
    console.log('❌ Usuario no encontrado en BD, cerrando sesión')
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Si el usuario está inactivo
  if (!usuario.activo) {
    console.log('❌ Usuario inactivo, cerrando sesión')
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  console.log('👤 Usuario:', usuario.rol, '| Ruta:', pathname)

  // 7. 🚨 BLOQUEAR meseros en rutas de admin
  if (pathname.startsWith('/admin') && usuario.rol === 'mesero') {
    console.log('🚨 BLOQUEADO: Mesero intentó acceder a', pathname)
    return NextResponse.redirect(new URL('/mesero/menumesero', req.url))
  }

  // 8. 🔄 Redirigir admins que van a rutas de mesero (opcional)
  if (pathname.startsWith('/mesero') && usuario.rol === 'admin') {
    console.log('⚠️ Admin en ruta de mesero, redirigiendo a /admin/menu')
    return NextResponse.redirect(new URL('/admin/menu', req.url))
  }

  // 9. ✅ Si pasa todas las validaciones, permitir acceso
  console.log('✅ Acceso permitido a:', pathname)
  return res
}

export const config = {
  matcher: [
    /*
     * Proteger todas las rutas EXCEPTO:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - Archivos públicos (.png, .jpg, .svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}