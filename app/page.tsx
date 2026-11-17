import Link from "next/link";

import {
  Printer,
  Zap,
  ChefHat,
  Smartphone,
  Globe,
  Pizza,
  Tablet,
  Building2,
  BarChart3,
  FileDown,
  Package,
  Wallet,
  Receipt,
  Users,
  UserCog,
  Crown,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Clock,
  CreditCard,
  LayoutDashboard,
  LineChart,
  StickyNote,
  MessageCircle,
  Layers,
  Lock,
  Handshake,
  QrCode,
  Utensils,
  ClipboardList,
  Rocket,
} from "lucide-react";

// 👉 Cambia este enlace por tu número de WhatsApp (formato internacional, sin + ni espacios)
const WHATSAPP_URL =
  "https://wa.me/573152720293?text=Hola%2C%20quiero%20conocer%20DishHub%20para%20mi%20restaurante";

const canales = [
  {
    icon: Smartphone,
    titulo: "Meseros",
    texto: "Toman el pedido en la mesa desde el celular, con notas, sabores y medio de pago.",
  },
  {
    icon: Globe,
    titulo: "Tu página de domicilios",
    texto: "Tus clientes piden desde tu propia página web con tu marca, fotos y horarios.",
  },
  {
    icon: Tablet,
    titulo: "Vitrina / mostrador",
    texto: "Pantalla rápida para ventas para llevar. Imprime ticket solo si lo necesitas.",
  },
];

const perfiles = [
  {
    icon: Smartphone,
    rol: "Mesero",
    items: ["Tomar pedidos por mesa", "Notas por producto", "Ver sus pedidos del día"],
  },
  {
    icon: Tablet,
    rol: "Vitrina",
    items: ["Venta para llevar en segundos", "Categorías ordenables", "Ticket opcional"],
  },
  {
    icon: UserCog,
    rol: "Administrador",
    items: ["Menú, mesas y meseros", "Pedidos en tiempo real", "Página de domicilios"],
  },
  {
    icon: Crown,
    rol: "Propietario",
    items: ["Dashboard y ventas", "Inventario y egresos", "Reportes en PDF"],
  },
];

const reportes = [
  { icon: BarChart3, titulo: "Ventas por tipo y medio de pago", texto: "Mesas, domicilios y para llevar; efectivo, Nequi, Daviplata y Bold." },
  { icon: Receipt, titulo: "Cierre del día impreso", texto: "Un clic y sale el resumen del período en la impresora térmica." },
  { icon: FileDown, titulo: "Reporte en PDF con tu marca", texto: "Membreteado con tu logo y sede, listo para guardar o enviar." },
  { icon: Package, titulo: "Inventario", texto: "Controla tus insumos y productos desde el mismo sistema." },
  { icon: LineChart, titulo: "Tableros de análisis", texto: "Indicadores avanzados conectados a tus datos para decidir mejor." },
  { icon: LayoutDashboard, titulo: "Dashboard del negocio", texto: "Lo importante del día de un vistazo, para cada sede." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      {/* Navegación */}
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
                <div className="text-xs text-zinc-500 -mt-1">Restaurant OS</div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-zinc-400">
              <a href="#canales" className="hover:text-orange-400 transition">Canales</a>
              <a href="#funciones" className="hover:text-orange-400 transition">Funciones</a>
              <a href="#perfiles" className="hover:text-orange-400 transition">Perfiles</a>
              <a href="#reportes" className="hover:text-orange-400 transition">Reportes</a>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex px-5 py-3 text-zinc-300 hover:text-white font-bold rounded-full border border-zinc-700 hover:border-zinc-500 transition-all"
              >
                Ingresar
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 sm:px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-full transition-all shadow-lg shadow-orange-500/50 hover:shadow-orange-500/75"
              >
                Solicitar demo
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Texto */}
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Sparkles className="w-4 h-4" />
                Comandas, domicilios, mostrador y ventas en un solo sistema
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
                <span className="text-white">Todo tu restaurante,</span>
                <br />
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                  en un solo lugar
                </span>
              </h1>

              <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
                Recibe pedidos de tus <strong className="text-white">meseros</strong>, de tu{" "}
                <strong className="text-white">página de domicilios</strong> y del{" "}
                <strong className="text-white">mostrador</strong>. Se imprimen solos en cocina y quedan
                registrados en tus ventas, en todas tus sedes.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-full transition-all shadow-xl shadow-orange-500/50 hover:shadow-orange-500/75 text-lg flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Quiero una demo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <Link
                  href="/login"
                  className="px-8 py-4 border border-zinc-700 hover:border-zinc-500 text-white font-bold rounded-full transition-all text-lg flex items-center justify-center"
                >
                  Ya soy cliente
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Funciona en el navegador
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Multi-sede
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Te lo configuramos
                </div>
              </div>
            </div>

            {/* Tarjeta visual */}
            <div className="relative">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-orange-500/10">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                  <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    NUEVO PEDIDO
                  </div>
                  <span className="text-sm text-zinc-400">Domicilio web · Sede Norte</span>
                </div>

                {/* Ticket simulado */}
                <div className="bg-zinc-950 border-2 border-dashed border-zinc-700 rounded-2xl p-6 shadow-lg mb-6 font-mono text-sm">
                  <div className="text-center mb-4 pb-4 border-b-2 border-zinc-700">
                    <div className="text-2xl font-black text-white">TU RESTAURANTE</div>
                    <div className="text-xs text-zinc-500">Pedido #42 · 7:23 p. m.</div>
                  </div>

                  <div className="space-y-2 mb-4 text-zinc-300">
                    <div className="flex justify-between gap-4">
                      <span>1x Pizza Grande</span>
                      <span className="font-bold text-white">$46.000</span>
                    </div>
                    <div className="text-xs text-purple-400 ml-4">Sabor: Hawaiana / Pepperoni</div>
                    <div className="text-xs text-orange-400 ml-4">Cortar en: 8 porciones</div>
                    <div className="flex justify-between gap-4">
                      <span>2x Gaseosa 400 ml</span>
                      <span className="font-bold text-white">$9.000</span>
                    </div>
                    <div className="text-xs text-orange-400 ml-4">Nota: bien frías</div>
                  </div>

                  <div className="border-t-2 border-zinc-700 pt-4">
                    <div className="flex justify-between text-lg font-bold text-white">
                      <span>TOTAL:</span>
                      <span>$55.000</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">Pago: Nequi · Dirección: Cra 15 # 45-20</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center">
                    <Printer className="w-6 h-6 text-orange-500 mx-auto" />
                    <div className="text-xs text-zinc-400 mt-2">Impreso en cocina</div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center">
                    <Zap className="w-6 h-6 text-green-500 mx-auto" />
                    <div className="text-xs text-zinc-400 mt-2">En tiempo real</div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center">
                    <BarChart3 className="w-6 h-6 text-purple-400 mx-auto" />
                    <div className="text-xs text-zinc-400 mt-2">Sumado a ventas</div>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 w-20 h-20 bg-orange-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-red-500 rounded-full blur-3xl opacity-30 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Canales de venta */}
      <section id="canales" className="py-20 relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-bold mb-4">
              TRES CANALES, UN SOLO SISTEMA
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Vende por donde te compren</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Todos los pedidos llegan al mismo lugar, se imprimen en cocina y quedan en tus ventas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {canales.map(({ icon: Icon, titulo, texto }) => (
              <div
                key={titulo}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-orange-500/40 transition-all"
              >
                <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7 text-orange-500" />
                </div>
                <h3 className="text-2xl font-black text-white mb-3">{titulo}</h3>
                <p className="text-zinc-400 leading-relaxed">{texto}</p>
              </div>
            ))}
          </div>

          {/* Llegan a */}
          <div className="mt-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-orange-500/20">
            <div className="flex items-center gap-4 text-white">
              <Printer className="w-10 h-10 shrink-0" />
              <div>
                <div className="text-2xl font-black">Impresión automática en cocina</div>
                <div className="text-white/85">Cada pedido nuevo sale impreso al instante, con sabores, porciones y notas.</div>
              </div>
            </div>
            <div className="flex gap-3 text-sm font-bold text-white">
              <span className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap">Impresoras térmicas</span>
              <span className="bg-white/20 px-4 py-2 rounded-full whitespace-nowrap">Una por sede</span>
            </div>
          </div>
        </div>
      </section>

      {/* Funciones */}
      <section id="funciones" className="py-20 relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-bold mb-4">
              FUNCIONES
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Pensado para la operación real</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Detalles que en un restaurante hacen la diferencia entre un buen servicio y un reclamo.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Grande: página de domicilios */}
            <div className="md:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <Globe className="w-12 h-12 mb-4 text-orange-500" />
                <h3 className="text-3xl font-black mb-3">Tu propia página de domicilios</h3>
                <p className="text-lg text-zinc-400 mb-6">
                  Una página con tu logo, fotos de tus platos, horarios y datos de tu sede. Tus clientes eligen,
                  escriben su dirección y el pedido llega directo a tu cocina, sin intermediarios.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-full font-bold text-zinc-300">
                    dishhubapp.vercel.app/tu-restaurante
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-full font-bold text-zinc-300">
                    Una página por sede
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 opacity-10">
                <Globe className="w-64 h-64" />
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all">
              <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
                <Pizza className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Sabores y porciones</h3>
              <p className="text-zinc-400 leading-relaxed">
                Pizzas mitad y mitad, varios sabores y en cuántas porciones cortarla. Todo llega claro a cocina.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all">
              <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
                <StickyNote className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Notas por producto</h3>
              <p className="text-zinc-400 leading-relaxed">
                &quot;Sin cebolla&quot;, &quot;bien asada&quot;, &quot;salsa aparte&quot;. Cada indicación queda impresa en su producto.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all">
              <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mb-4">
                <CreditCard className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Medios de pago</h3>
              <p className="text-zinc-400 leading-relaxed">
                Efectivo, Nequi, Daviplata y Bold. Cada venta queda con su medio de pago para cuadrar caja.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all">
              <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center mb-4">
                <Building2 className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Varias sedes</h3>
              <p className="text-zinc-400 leading-relaxed">
                Cada sede con su menú, impresora, usuarios y página. Información separada y ordenada.
              </p>
            </div>

            {/* Grande: vitrina */}
            <div className="md:col-span-2 bg-gradient-to-br from-orange-600 to-red-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-orange-500/20">
              <div className="relative z-10">
                <Tablet className="w-12 h-12 mb-4" />
                <h3 className="text-3xl font-black mb-3">Vitrina: venta de mostrador en segundos</h3>
                <p className="text-lg text-white/90 mb-6">
                  Una pantalla para tablet o celular con botones grandes, categorías en el orden que prefieras y un
                  interruptor para decidir si cada venta imprime ticket o no.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-white/20 px-4 py-2 rounded-full text-sm font-bold">Para llevar</div>
                  <div className="bg-white/20 px-4 py-2 rounded-full text-sm font-bold">Ticket opcional</div>
                  <div className="bg-white/20 px-4 py-2 rounded-full text-sm font-bold">Tablet o celular</div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 opacity-10">
                <Tablet className="w-64 h-64" />
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition-all">
              <div className="w-14 h-14 bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Numeración del día</h3>
              <p className="text-zinc-400 leading-relaxed">
                Pedido #1, #2, #3… cada día. Fácil de cantar en cocina y de buscar después.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Perfiles */}
      <section id="perfiles" className="py-20 relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2 rounded-full text-sm font-bold mb-4">
              PERFILES
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Cada quien ve lo que le toca</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              El equipo opera con lo que necesita; las cifras del negocio quedan solo para los dueños.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {perfiles.map(({ icon: Icon, rol, items }) => {
              const esPropietario = rol === "Propietario";
              return (
                <div
                  key={rol}
                  className={`rounded-3xl p-7 border transition-all ${
                    esPropietario
                      ? "bg-orange-500/10 border-orange-500/40"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-white">{rol}</h3>
                  </div>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-zinc-400 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {esPropietario && (
                    <div className="mt-5 flex items-center gap-2 text-xs font-bold text-orange-400">
                      <Lock className="w-4 h-4" />
                      Acceso exclusivo de los dueños
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reportes */}
      <section id="reportes" className="py-20 relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-bold mb-4">
              VENTAS Y REPORTES
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Tus números, claros y a la mano</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Cada pedido alimenta tus reportes. Sin hojas de cálculo, sin sumar a mano al cierre.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportes.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-7 hover:border-zinc-700 transition-all">
                <Icon className="w-8 h-8 text-green-500 mb-4" />
                <h3 className="text-xl font-black text-white mb-2">{titulo}</h3>
                <p className="text-zinc-400 leading-relaxed text-sm">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-20 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-bold mb-4">
              CÓMO FUNCIONA
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Del pedido al reporte
              <br />
              sin tocar un papel
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 via-red-500 to-green-500"></div>

            {[
              {
                icon: ClipboardList,
                color: "from-orange-500 to-red-500",
                titulo: "Llega el pedido",
                texto: "Desde el celular del mesero, la vitrina del mostrador o tu página de domicilios.",
              },
              {
                icon: Printer,
                color: "from-red-500 to-pink-500",
                titulo: "Cocina lo recibe impreso",
                texto: "El ticket sale solo, con número del día, productos, sabores, porciones, notas y medio de pago.",
              },
              {
                icon: BarChart3,
                color: "from-green-500 to-teal-500",
                titulo: "Queda en tus ventas",
                texto: "Se suma a tus reportes por tipo de pedido y medio de pago, listos para el cierre del día.",
              },
            ].map(({ icon: Icon, color, titulo, texto }, i, arr) => (
              <div key={titulo} className={`relative pl-24 ${i < arr.length - 1 ? "pb-16" : ""}`}>
                <div
                  className={`absolute left-0 w-16 h-16 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-orange-500/30`}
                >
                  {i + 1}
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                    <Icon className="w-6 h-6 text-orange-500" />
                    {titulo}
                  </h3>
                  <p className="text-zinc-400">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Acompañamiento + próximamente */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
            <Handshake className="w-12 h-12 text-orange-500 mb-4" />
            <h3 className="text-3xl font-black text-white mb-3">Te lo dejamos funcionando</h3>
            <p className="text-zinc-400 mb-6">
              No tienes que configurar nada solo. Te acompañamos desde el primer día.
            </p>
            <ul className="space-y-3">
              {[
                "Cargamos tu menú, fotos, sabores y precios",
                "Conectamos las impresoras de cada sede",
                "Creamos los usuarios de tu equipo",
                "Publicamos tu página de domicilios",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-zinc-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8">
            <Rocket className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-3xl font-black text-white mb-3">Lo que viene</h3>
            <p className="text-zinc-400 mb-6">DishHub sigue creciendo con las necesidades de los restaurantes.</p>
            <div className="space-y-4">
              {[
                { icon: Wallet, titulo: "Egresos", texto: "Proveedores, colaboradores y gastos para conocer tu utilidad real." },
                { icon: QrCode, titulo: "Facturación electrónica", texto: "Tiquete POS electrónico con QR de la DIAN desde el mismo sistema." },
                { icon: Layers, titulo: "Más integraciones", texto: "Conectamos DishHub con las herramientas que ya usas." },
              ].map(({ icon: Icon, titulo, texto }) => (
                <div key={titulo} className="flex items-start gap-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <Icon className="w-6 h-6 text-purple-400 shrink-0 mt-1" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white">{titulo}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-full">
                        Próximamente
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">{texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-32 bg-black relative overflow-hidden border-t border-zinc-900">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <Utensils className="w-12 h-12 text-orange-500 mx-auto mb-6" />
          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight text-white">
            ¿Listo para ordenar
            <br />
            tu restaurante?
          </h2>

          <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto">
            Escríbenos y te mostramos DishHub funcionando con un menú como el tuyo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group px-10 py-5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-black rounded-full transition-all shadow-2xl shadow-orange-500/50 hover:shadow-orange-500/75 text-xl flex items-center justify-center gap-3"
            >
              <MessageCircle className="w-6 h-6" />
              Hablar por WhatsApp
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-zinc-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Demo sin compromiso</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Implementación acompañada</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <span>Soporte directo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                Comandas, domicilios, mostrador, ventas e inventario para restaurantes, en una sola plataforma.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Producto</h4>
              <div className="space-y-2 text-zinc-500">
                <div><a href="#canales" className="hover:text-orange-500 transition">Canales</a></div>
                <div><a href="#funciones" className="hover:text-orange-500 transition">Funciones</a></div>
                <div><a href="#perfiles" className="hover:text-orange-500 transition">Perfiles</a></div>
                <div><a href="#reportes" className="hover:text-orange-500 transition">Reportes</a></div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Contacto</h4>
              <div className="space-y-2 text-zinc-500">
                <div>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition">
                    WhatsApp
                  </a>
                </div>
                <div><Link href="/login" className="hover:text-orange-500 transition">Ingresar</Link></div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-8">
            <p className="text-zinc-600 text-sm text-center md:text-left">
              © {new Date().getFullYear()} DishHub. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}