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
  LogOut
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const links = [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/menu", label: "Menú", icon: UtensilsCrossed },
    { href: "/admin/ventas", label: "Ventas", icon: DollarSign },
    { href: "/admin/pedidos", label: "Pedidos", icon: ListChecks }
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      
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
        flex flex-col w-72 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        shadow-xl md:shadow-none
      `}>
        
        {/* Header del sidebar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 rounded-xl shadow-lg">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ComandasApp
                </h2>
                <p className="text-xs text-gray-500">Panel Admin</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                      ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30"
                      : "text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-600"
                  }
                `}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`
                    p-2 rounded-lg transition-colors
                    ${active ? "bg-white/20" : "bg-gray-100 group-hover:bg-white"}
                  `}>
                    <Icon className={`w-5 h-5 ${active ? "text-white" : "text-gray-700 group-hover:text-purple-600"}`} />
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
        <div className="p-4 border-t border-gray-200 space-y-3">
          {/* Info del usuario */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-semibold shadow-md">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">Admin</p>
                <p className="text-xs text-gray-500 truncate">admin@restau.app</p>
              </div>
            </div>
          </div>

          {/* Botón cerrar sesión */}
          <button
            onClick={cerrarSesion}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors border border-red-200"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Header móvil */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg shadow-md">
                  <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  RestauApp
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
