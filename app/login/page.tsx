"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail, Lock, Eye, EyeOff, ChefHat } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para búsqueda de negocio
  const [emailBuscando, setEmailBuscando] = useState(false);
  const [negocioEncontrado, setNegocioEncontrado] = useState<{
    nombre: string;
    logo_url: string | null;
  } | null>(null);

  // Debounce: Buscar negocio 500ms después de que el usuario deje de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email.includes('@') && email.length >= 5) {
        buscarNegocioPorEmail(email);
      } else {
        setNegocioEncontrado(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  const buscarNegocioPorEmail = async (emailBuscar: string) => {
    try {
      setEmailBuscando(true);

      console.log('🔍 Buscando negocio para email:', emailBuscar);

      // Llamar a la función SQL
      const { data, error } = await supabase
        .rpc('obtener_negocio_por_email', {
          email_buscar: emailBuscar.trim()
        });

      console.log('📊 Respuesta función SQL:', { data, error });

      if (error) {
        console.error('❌ Error en función:', error);
        setNegocioEncontrado(null);
        return;
      }

      if (data && data.length > 0) {
        const negocio = data[0];
        console.log('🏢 Negocio encontrado:', negocio.negocio_nombre);
        setNegocioEncontrado({
          nombre: negocio.negocio_nombre,
          logo_url: negocio.negocio_logo_url
        });
      } else {
        console.log('❌ Negocio no encontrado');
        setNegocioEncontrado(null);
      }

    } catch (error) {
      console.error('Error buscando negocio:', error);
      setNegocioEncontrado(null);
    } finally {
      setEmailBuscando(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('========== INICIO LOGIN ==========');
    
    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log('1️⃣ Intentando autenticar con:', { email: email.trim() });

      // 1. Autenticar con Supabase Auth
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      console.log('2️⃣ Respuesta de auth:', {
        success: !!authData,
        error: signInError,
        session: authData?.session ? 'Existe' : 'No existe',
        user_id: authData?.user?.id
      });

      if (signInError) {
        console.error('❌ Error en signInWithPassword:', signInError);
        throw signInError;
      }

      // 2. Guardar token en cookie manualmente (para el middleware)
      if (authData.session) {
        document.cookie = `sb-access-token=${authData.session.access_token}; path=/; max-age=3600`;
        console.log('3️⃣ Cookie guardada');
      }

      console.log('4️⃣ Buscando usuario en tabla usuarios con auth_user_id:', authData.user.id);

      // 3. Obtener el rol del usuario desde la tabla 'usuarios'
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('rol, nombre, auth_user_id')
        .eq('auth_user_id', authData.user.id)
        .single();

      console.log('5️⃣ Respuesta de tabla usuarios:', {
        success: !!usuarioData,
        error: usuarioError,
        data: usuarioData
      });

      if (usuarioError) {
        console.error('❌ Error buscando usuario:', usuarioError);
        throw usuarioError;
      }

      if (!usuarioData) {
        console.error('❌ Usuario no encontrado en tabla usuarios');
        throw new Error('Usuario no encontrado en la base de datos');
      }

      console.log('6️⃣ Usuario encontrado:', {
        nombre: usuarioData.nombre,
        rol: usuarioData.rol
      });

      // 4. Pequeño delay para asegurar que la cookie se guarde
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Redirigir según el rol
      console.log('7️⃣ Redirigiendo según rol:', usuarioData.rol);

      if (usuarioData.rol === 'admin') {
        console.log('✅ Redirigiendo a /admin/menu');
        window.location.href = '/admin/menu';
      } else if (usuarioData.rol === 'mesero') {
        console.log('✅ Redirigiendo a /mesero');
        window.location.href = '/mesero';
      } else {
        console.error('❌ Rol no válido:', usuarioData.rol);
        setError('Rol de usuario no válido');
        await supabase.auth.signOut();
      }

    } catch (err: any) {
      console.error("========== ERROR EN LOGIN ==========");
      console.error('Error completo:', err);
      
      if (err.message.includes("Invalid login credentials")) {
        setError("Email o contraseña incorrectos");
      } else if (err.message.includes("Email not confirmed")) {
        setError("Por favor confirma tu email");
      } else if (err.message.includes("no encontrado")) {
        setError("Usuario no encontrado en la base de datos. Contacta al administrador.");
      } else {
        setError("Error al iniciar sesión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
      console.log('========== FIN LOGIN ==========');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow effects - Dark theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-orange-600/10 rounded-full blur-2xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl shadow-orange-500/20 border border-zinc-800 bg-zinc-900">
        <CardHeader className="space-y-4 pb-6">
          {/* Logo dinámico */}
          <div className="flex flex-col items-center gap-3">
            {/* Marca DishHub (siempre visible, pequeña) */}
            <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">
              DishHub
            </span>
            
            {/* Logo del negocio (dinámico) */}
            <div className="relative">
              {emailBuscando ? (
                // Loading state
                <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
              ) : negocioEncontrado?.logo_url ? (
                // Logo del negocio encontrado
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-xl shadow-orange-500/30">
                  <img 
                    src={negocioEncontrado.logo_url} 
                    alt={negocioEncontrado.nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                // Logo por defecto (ChefHat)
                <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-5 rounded-2xl shadow-xl shadow-orange-500/50">
                  <ChefHat className="w-10 h-10 text-white" />
                </div>
              )}
            </div>

            {/* Nombre del negocio (dinámico) */}
            <div className="text-center space-y-1">
              <CardTitle className="text-3xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                {negocioEncontrado?.nombre || 'DishHub'}
              </CardTitle>
              <CardDescription className="text-sm text-zinc-400">
                Ingresa tus credenciales para continuar
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                Correo electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 h-12 bg-zinc-950 border-zinc-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder:text-zinc-600"
                />
                {/* Indicador de búsqueda */}
                {emailBuscando && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
                )}
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10 pr-10 h-12 bg-zinc-950 border-zinc-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Botón de login */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-xl shadow-orange-500/50 hover:shadow-orange-500/75 transition-all duration-300"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>

            {/* Olvidé mi contraseña */}
            <div className="text-center pt-2">
              <button
                type="button"
                className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors"
                disabled={loading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-center text-sm text-zinc-500">
              ¿No tienes cuenta?{" "}
              <button className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                Contacta al administrador
              </button>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Versión */}
      <div className="absolute bottom-4 text-zinc-600 text-sm">
        DishHub v1.0
      </div>
    </div>
  );
}