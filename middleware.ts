import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔒 MIDDLEWARE ejecutándose en:', pathname)

  // Solo aplicar en rutas protegidas
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/mesero') && !pathname.startsWith('/vitrina')) {
    console.log('✅ Ruta no protegida, permitiendo acceso')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return NextResponse.next()
  }

  // Buscar cookies de Supabase
  const cookies = req.cookies.getAll()
  console.log('🍪 Cookies encontradas:', cookies.length)

  const hasAuth = cookies.some(cookie => 
    cookie.name.includes('auth-token') || 
    cookie.name.includes('access-token') ||
    cookie.name.startsWith('sb-')
  )

  console.log('🔐 ¿Tiene auth?:', hasAuth)

  if (!hasAuth) {
    console.log('❌ Sin auth, redirigiendo a /login')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 🆕 VALIDAR ROL desde cookie personalizada
  const rolCookie = req.cookies.get('user-role')
  console.log('👤 Rol detectado:', rolCookie?.value || 'NO ENCONTRADO')

  // Si no hay cookie de rol, permitir acceso (primera vez después del login)
  if (!rolCookie) {
    console.log('⚠️ Cookie de rol no encontrada, permitiendo acceso (se creará en el cliente)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return NextResponse.next()
  }

  const rol = rolCookie.value

  // 🚨 Validar acceso según rol: cada rol solo entra a su sección
  const inicioPorRol: Record<string, string> = {
    admin: '/admin/menu',
    mesero: '/mesero/menumesero',
    vitrina: '/vitrina',
  }

  const permitido =
    (pathname.startsWith('/admin') && rol === 'admin') ||
    (pathname.startsWith('/mesero') && rol === 'mesero') ||
    (pathname.startsWith('/vitrina') && rol === 'vitrina')

  if (!permitido) {
    console.log('🚨 BLOQUEADO: rol', rol, 'intentó entrar a', pathname)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return NextResponse.redirect(new URL(inicioPorRol[rol] ?? '/login', req.url))
  }

  console.log('✅ ACCESO PERMITIDO - Rol:', rol)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/mesero/:path*',
    '/vitrina/:path*'
  ]
}