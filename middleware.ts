import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  console.log('🔒 Middleware ejecutándose en:', pathname);

  // Buscar token de Supabase en todas las cookies posibles
  const cookies = req.cookies.getAll();
  console.log('🍪 Cookies disponibles:', cookies.map(c => c.name));

  // Buscar cualquier cookie de Supabase que contenga 'auth-token' o 'access-token'
  const hasSupabaseAuth = cookies.some(cookie => 
    cookie.name.includes('auth-token') || 
    cookie.name.includes('access-token') ||
    cookie.name.startsWith('sb-')
  );

  console.log('🔐 ¿Tiene auth de Supabase?:', hasSupabaseAuth);

  // Rutas públicas
  const rutasPublicas = ['/login', '/']
  const esRutaPublica = rutasPublicas.includes(pathname)

  // Si no hay auth y no es ruta pública, redirigir a login
  if (!hasSupabaseAuth && !esRutaPublica) {
    console.log('❌ Sin auth, redirigiendo a /login desde:', pathname);
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Si hay auth y está en login, redirigir a dashboard
  if (hasSupabaseAuth && pathname === '/login') {
    console.log('✅ Con auth en /login, redirigiendo a /admin/menu');
    return NextResponse.redirect(new URL('/admin/menu', req.url))
  }

  console.log('✅ Permitiendo acceso a:', pathname);
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/mesero/:path*',
    '/login'
  ]
}