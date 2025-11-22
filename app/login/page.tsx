"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail, Lock, UtensilsCrossed, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      console.log('3️⃣ Cookie guardada:', {
        token_length: authData.session.access_token.length,
        expires: new Date(Date.now() + 3600000).toISOString()
      });
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

    if (usuarioData.rol === 'superadmin') {
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
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-yellow-400 to-blue-400 flex items-center justify-center p-4">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 right-1/4 w-60 h-60 bg-yellow-300/20 rounded-full blur-2xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0">
        <CardHeader className="space-y-4 pb-6">
          {/* Logo - Bob Esponja */}
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 p-6 rounded-2xl shadow-lg border-4 border-yellow-600">
              <span className="text-6xl">🧽</span>
            </div>
          </div>

          <div className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-blue-600 bg-clip-text text-transparent">
              Bienvenido
            </CardTitle>
            <CardDescription className="text-base">
              Ingresa tus credenciales para continuar
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 h-12 border-gray-200 focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10 pr-10 h-12 border-gray-200 focus:ring-2 focus:ring-yellow-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Botón de login */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-yellow-400 via-yellow-500 to-blue-500 hover:from-yellow-500 hover:to-blue-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
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
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                disabled={loading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              ¿No tienes cuenta?{" "}
              <button className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Contacta al administrador
              </button>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Versión */}
      <div className="absolute bottom-4 text-white/80 text-sm">
        RestauApp v1.0
      </div>
    </div>
  );
}