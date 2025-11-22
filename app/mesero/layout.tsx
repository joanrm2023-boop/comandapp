"use client";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  ListChecks,
  Menu,
  X,
  ChevronRight,
  LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState("Cargando...");

  useEffect(() => {
      cargarNombreUsuario();
    }, []);

    const cargarNombreUsuario = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('usuarios')
            .select('nombre')
            .eq('auth_user_id', user.id)
            .single();

          if (data && !error) {
            setNombreUsuario(data.nombre);
          }
        }
      } catch (error) {
        console.error('Error cargando nombre:', error);
        setNombreUsuario("Mesero");
      }
    };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    // Eliminar cookie manualmente
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    window.location.href = '/login'; // 👈 Usa window.location
  };

  const links = [
    { href: "/mesero", label: "Menú", icon: UtensilsCrossed },
    { href: "/mesero/pedidos", label: "Mis Pedidos", icon: ListChecks }
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-yellow-50 to-blue-50">
      
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        flex flex-col w-72 bg-white border-r border-yellow-200
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        shadow-xl md:shadow-none
      `}>
        
        {/* Header del sidebar */}
        <div className="p-6 border-b border-yellow-200 bg-gradient-to-br from-yellow-50 to-blue-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 p-2.5 rounded-2xl shadow-lg border-4 border-yellow-600">
                <span className="text-3xl">🧽</span>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-blue-600 bg-clip-text text-transparent">
                  ComandasApp
                </h2>
                <p className="text-xs text-gray-600 font-medium">Panel Mesero</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-yellow-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
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
                      ? "bg-gradient-to-r from-yellow-400 to-blue-500 text-white shadow-lg shadow-yellow-400/30"
                      : "text-gray-700 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-blue-50 hover:text-yellow-700"
                  }
                `}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`
                    p-2 rounded-lg transition-colors
                    ${active ? "bg-white/20" : "bg-yellow-100 group-hover:bg-yellow-200"}
                  `}>
                    <Icon className={`w-5 h-5 ${active ? "text-white" : "text-yellow-700 group-hover:text-blue-600"}`} />
                  </div>
                  <span className="font-medium text-[15px]">{label}</span>
                </div>
                
                {active && (
                  <ChevronRight className="w-5 h-5 text-white relative z-10" />
                )}
                
                {!active && (
                  <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-4 border-t border-yellow-200 space-y-3">
          {/* Info del usuario */}
          <div className="bg-gradient-to-br from-yellow-50 to-blue-50 rounded-xl p-4 border-2 border-yellow-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-blue-500 flex items-center justify-center text-white font-semibold shadow-md">
                M
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{nombreUsuario}</p>
                <p className="text-xs text-gray-600 truncate">Mesero</p>
              </div>
            </div>
          </div>

          {/* Botón cerrar sesión */}
          <button
            onClick={cerrarSesion}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors border-2 border-red-200"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Header móvil */}
        <header className="md:hidden bg-white border-b border-yellow-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 p-2 rounded-lg shadow-md border-2 border-yellow-600">
                  <span className="text-2xl">🧽</span>
                </div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-yellow-600 to-blue-600 bg-clip-text text-transparent">
                  ComandasApp
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