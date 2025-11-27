"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  UtensilsCrossed,
  DollarSign,
  ListChecks,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Users,
  ChefHat
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState("Cargando...");
  const [nombreNegocio, setNombreNegocio] = useState("DishHub");
  const [logoNegocio, setLogoNegocio] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Cargar datos del usuario
        const { data: usuarioData, error: usuarioError } = await supabase
          .from('usuarios')
          .select('nombre, negocio_id')
          .eq('auth_user_id', user.id)
          .single();

        if (usuarioData && !usuarioError) {
          setNombreUsuario(usuarioData.nombre);

          // Cargar datos del negocio
          const { data: negocioData, error: negocioError } = await supabase
            .from('negocios')
            .select('nombre, logo_url')
            .eq('id', usuarioData.negocio_id)
            .single();

          if (negocioData && !negocioError) {
            setNombreNegocio(negocioData.nombre);
            setLogoNegocio(negocioData.logo_url);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setNombreUsuario("Admin");
      setNombreNegocio("DishHub");
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    window.location.href = '/login';
  };

  const links = [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/menu", label: "Menú", icon: UtensilsCrossed },
    { href: "/admin/ventas", label: "Ventas", icon: DollarSign },
    { href: "/admin/pedidos", label: "Pedidos", icon: ListChecks },
    { href: "/admin/meseros", label: "Meseros", icon: Users }
  ];

  return (
    <div className="flex min-h-screen bg-black">
      
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Dark theme */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        flex flex-col w-72 bg-zinc-950 border-r border-zinc-800
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        shadow-2xl md:shadow-none
      `}>
        
        {/* Header del sidebar con logo y nombre del negocio */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {/* Logo del negocio */}
              {logoNegocio ? (
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-900 border-2 border-zinc-800 shadow-lg shadow-orange-500/20">
                  <img 
                    src={logoNegocio} 
                    alt={nombreNegocio} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/50">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
              )}
              
              <div>
                <h2 className="text-xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  {nombreNegocio}
                </h2>
                <p className="text-xs text-zinc-500">Panel Admin</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-zinc-900 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center justify-between px-4 py-3.5 rounded-xl
                  transition-all duration-200 relative overflow-hidden
                  ${
                    active
                      ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/50"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-orange-400 border border-transparent hover:border-zinc-800"
                  }
                `}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`
                    p-2 rounded-lg transition-colors
                    ${active ? "bg-white/20" : "bg-zinc-900 group-hover:bg-zinc-800"}
                  `}>
                    <Icon className={`w-5 h-5 ${active ? "text-white" : "text-zinc-400 group-hover:text-orange-500"}`} />
                  </div>
                  <span className="font-semibold text-[15px]">{label}</span>
                </div>
                
                {active && (
                  <ChevronRight className="w-5 h-5 text-white relative z-10" />
                )}
                
                {!active && (
                  <ChevronRight className="w-5 h-5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          {/* Info del usuario */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/30">
                {nombreUsuario.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{nombreUsuario}</p>
                <p className="text-xs text-zinc-500 truncate">Administrador</p>
              </div>
            </div>
          </div>

          {/* Botón cerrar sesión */}
          <button
            onClick={cerrarSesion}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-semibold transition-colors border border-red-500/20 hover:border-red-500/30"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Header móvil - Dark theme */}
        <header className="md:hidden bg-zinc-950 border-b border-zinc-800 px-4 py-3 sticky top-0 z-30 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-zinc-400" />
              </button>
              <div className="flex items-center gap-2">
                {logoNegocio ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                    <img 
                      src={logoNegocio} 
                      alt={nombreNegocio} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2 rounded-xl shadow-lg shadow-orange-500/50">
                    <ChefHat className="w-5 h-5 text-white" />
                  </div>
                )}
                <h1 className="text-lg font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  {nombreNegocio}
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}