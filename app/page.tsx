import Link from "next/link";

import { 
  Printer, 
  Zap,
  Clock,
  CheckCircle2,
  ChefHat,
  Smartphone,
  Bell,
  TrendingUp,
  Shield,
  Receipt,
  Wifi,
  DollarSign,
  Users,
  ArrowRight,
  Star,
  Sparkles,
  Gauge,
  CircleDot
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      {/* Navigation - Dark theme */}
      <nav className="fixed top-0 w-full bg-black/95 backdrop-blur-lg border-b border-zinc-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/50">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black"></div>
              </div>
              <div>
                <span className="text-2xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  DishHub
                </span>
                <div className="text-xs text-zinc-500 -mt-1">Kitchen OS</div>
              </div>
            </div>
            <Link
              href="/login"
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-full transition-all shadow-lg shadow-orange-500/50 hover:shadow-orange-500/75 hover:scale-105"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Dark theme con neón effect */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Ambient glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-pulse">
                <Sparkles className="w-4 h-4" />
                Impresión automática en tiempo real
              </div>
              
              <h1 className="text-6xl lg:text-7xl font-black mb-6 leading-tight">
                <span className="text-white">Tu cocina,</span>
                <br />
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                  100% digital
                </span>
              </h1>
              
              <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
                Sistema completo de comandas con <strong className="text-white">impresión térmica automática</strong>. 
                Del iPhone del mesero a la cocina en menos de 1 segundo.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  href="/login"
                  className="group px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-full transition-all shadow-xl shadow-orange-500/50 hover:shadow-orange-500/75 text-lg flex items-center justify-center gap-2"
                >
                  Empezar gratis
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-8 text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Sin instalación
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Setup en 10 min
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Soporte 24/7
                </div>
              </div>
            </div>

            {/* Right: Visual/Stats Card - Dark themed */}
            <div className="relative">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-orange-500/10">
                {/* Live indicator */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    EN VIVO
                  </div>
                  <span className="text-sm text-zinc-400">Mesa 5 - Pedido #42</span>
                </div>

                {/* Simulated ticket */}
                <div className="bg-zinc-950 border-2 border-dashed border-zinc-700 rounded-2xl p-6 shadow-lg mb-6 font-mono text-sm">
                  <div className="text-center mb-4 pb-4 border-b-2 border-zinc-700">
                    <div className="text-2xl font-black text-white">DISHHUB</div>
                    <div className="text-xs text-zinc-500">Pedido #42</div>
                  </div>
                  
                  <div className="space-y-2 mb-4 text-zinc-300">
                    <div className="flex justify-between">
                      <span>2x Hamburguesa Clásica</span>
                      <span className="font-bold text-white">$56.000</span>
                    </div>
                    <div className="text-xs text-orange-400 ml-4">
                      • Sin cebolla
                    </div>
                    <div className="flex justify-between">
                      <span>1x Pizza Margarita</span>
                      <span className="font-bold text-white">$32.000</span>
                    </div>
                  </div>
                  
                  <div className="border-t-2 border-zinc-700 pt-4">
                    <div className="flex justify-between text-lg font-bold text-white">
                      <span>TOTAL:</span>
                      <span>$88.000</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">
                      Mesa: 5 | Mesero: Juan | 14:23
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center">
                    <div className="text-3xl font-black text-orange-500">0.8s</div>
                    <div className="text-xs text-zinc-500 mt-1">Tiempo de impresión</div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center">
                    <div className="text-3xl font-black text-green-500">100%</div>
                    <div className="text-xs text-zinc-500 mt-1">Pedidos correctos</div>
                  </div>
                </div>

                {/* Animated pulse */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-orange-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-red-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Dark bento box */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-bold mb-4">
              CARACTERÍSTICAS
            </div>
            <h2 className="text-5xl font-black text-white mb-4">
              Tecnología que funciona
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              No más órdenes perdidas. No más gritos a la cocina. Solo eficiencia pura.
            </p>
          </div>

          {/* Feature cards - Dark bento box */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 - Large gradient */}
            <div className="md:col-span-2 bg-gradient-to-br from-orange-600 to-red-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-orange-500/20">
              <div className="relative z-10">
                <Printer className="w-12 h-12 mb-4" />
                <h3 className="text-3xl font-black mb-3">
                  Impresión automática
                </h3>
                <p className="text-lg text-white/90 mb-6">
                  Cada pedido se imprime automáticamente en la cocina en menos de 1 segundo. 
                  Sin clicks, sin esperas, sin errores.
                </p>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-bold">
                    <Gauge className="w-4 h-4 inline mr-2" />
                    0.8s promedio
                  </div>
                  <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-bold">
                    ✓ 100% confiable
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 opacity-10">
                <Printer className="w-64 h-64" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all">
              <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">
                Tiempo Real
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                Actualización instantánea en todos los dispositivos. Admin, meseros y cocina sincronizados al segundo.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all">
              <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
                <Receipt className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">
                Notas Especiales
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                "Sin cebolla", "término medio", "para llevar". Cada detalle llega claramente a la cocina.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all">
              <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
                <DollarSign className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">
                Medios de Pago
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                Efectivo, Nequi, Daviplata, Bold. Registra y controla cada venta automáticamente.
              </p>
            </div>

            {/* Card 5 - Large dark */}
            <div className="md:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <Clock className="w-12 h-12 mb-4 text-orange-500" />
                <h3 className="text-3xl font-black mb-3">
                  Numeración inteligente
                </h3>
                <p className="text-lg text-zinc-400 mb-6">
                  Cada pedido tiene un número único que se reinicia diariamente. 
                  Fácil seguimiento, sin confusiones.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-full font-bold text-zinc-300">
                    Pedido #1, #2, #3...
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-full font-bold text-zinc-300">
                    Se reinicia a medianoche
                  </div>
                </div>
              </div>
            </div>

            {/* Card 6 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all">
              <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center mb-4">
                <Smartphone className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">
                Mesas y Domicilios
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                Gestiona mesas del local y pedidos a domicilio desde la misma plataforma.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - Dark timeline */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-bold mb-4">
              CÓMO FUNCIONA
            </div>
            <h2 className="text-5xl font-black text-white mb-4">
              Del pedido al ticket<br />en 3 simples pasos
            </h2>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 via-red-500 to-green-500"></div>

            {/* Step 1 */}
            <div className="relative pl-24 pb-16">
              <div className="absolute left-0 w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-orange-500/50">
                1
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-orange-500" />
                  Mesero toma el pedido
                </h3>
                <p className="text-zinc-400">
                  Desde su iPhone, el mesero selecciona productos, agrega notas especiales, 
                  elige la mesa y registra el medio de pago. Todo en menos de 30 segundos.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative pl-24 pb-16">
              <div className="absolute left-0 w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-red-500/50">
                2
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                  <Zap className="w-6 h-6 text-red-500" />
                  Sistema procesa en tiempo real
                </h3>
                <p className="text-zinc-400">
                  El pedido llega a Supabase, se asigna un número consecutivo del día, 
                  y se dispara la impresión automática. Todo en menos de 1 segundo.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative pl-24">
              <div className="absolute left-0 w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-green-500/50">
                3
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                  <Printer className="w-6 h-6 text-green-500" />
                  Cocina recibe el ticket impreso
                </h3>
                <p className="text-zinc-400">
                  La impresora térmica imprime automáticamente el ticket con todos los detalles: 
                  productos, notas, mesa, mesero y número de orden.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof - Dark gradient */}
      <section className="py-20 bg-gradient-to-br from-orange-600 to-red-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white rounded-full"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-8 h-8 text-yellow-300 fill-current" />
            ))}
          </div>
          
          <blockquote className="text-3xl md:text-4xl font-bold text-white mb-8 leading-relaxed">
            "Pasamos de gritar órdenes a la cocina a un sistema completamente digital. 
            Los errores bajaron a cero y nuestro servicio mejoró un 200%."
          </blockquote>
          
          <div className="flex items-center justify-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <div className="text-white font-bold text-lg">Carlos Martínez</div>
              <div className="text-white/80">Pizzas Napolitanas, Bogotá</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Ultra dark and bold */}
      <section className="py-32 bg-black relative overflow-hidden border-t border-zinc-900">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight text-white">
            ¿Listo para digitalizar<br />tu cocina?
          </h2>
          
          <p className="text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto">
            Únete a los restaurantes que ya dejaron atrás los gritos y los papeles perdidos
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/login"
              className="group px-10 py-5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-black rounded-full transition-all shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/75 text-xl flex items-center justify-center gap-3"
            >
              Empezar gratis ahora
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-zinc-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Sin tarjeta de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Setup en 10 minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Soporte 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Dark and clean */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/50">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  DishHub
                </span>
              </div>
              <p className="text-zinc-500 max-w-sm">
                El sistema de comandas más rápido y confiable del mercado. 
                Impresión automática, tiempo real, cero errores.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">Producto</h4>
              <div className="space-y-2 text-zinc-500">
                <div><a href="#caracteristicas" className="hover:text-orange-500 transition">Características</a></div>
                <div><a href="#demo" className="hover:text-orange-500 transition">Demo</a></div>
                <div><Link href="/login" className="hover:text-orange-500 transition">Precios</Link></div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">Empresa</h4>
              <div className="space-y-2 text-zinc-500">
                <div><a href="#" className="hover:text-orange-500 transition">Sobre nosotros</a></div>
                <div><a href="#" className="hover:text-orange-500 transition">Contacto</a></div>
                <div><a href="#" className="hover:text-orange-500 transition">Soporte</a></div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-zinc-600 text-sm">
              © 2024 DishHub. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm text-zinc-600">
              <a href="#" className="hover:text-orange-500 transition">Términos</a>
              <a href="#" className="hover:text-orange-500 transition">Privacidad</a>
              <a href="#" className="hover:text-orange-500 transition">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}