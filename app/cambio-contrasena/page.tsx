"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail, Lock, Eye, EyeOff, ChefHat, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

function CambioContrasenaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState<'email' | 'password' | 'success'>(token ? 'password' : 'email');
  
  // Estados para enviar email
  const [email, setEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [errorEmail, setErrorEmail] = useState("");
  const [emailEnviado, setEmailEnviado] = useState(false);

  // Estados para cambiar contraseña
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verificar si hay hash en la URL (token de recuperación)
  useEffect(() => {
    // Supabase pone el token en el hash de la URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken) {
      // Hay un token de recuperación válido
      setStep('password');
    } else if (token) {
      // Fallback: intenta verificar el token del query param
      verificarToken();
    }
  }, [token]);

  const verificarToken = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        setErrorPassword("Token inválido o expirado. Solicita un nuevo enlace de recuperación.");
        setStep('email');
      } else {
        setStep('password');
      }
    } catch (error) {
      console.error('Error verificando token:', error);
      setErrorPassword("Error al verificar el token");
      setStep('email');
    }
  };

  const enviarEmailRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setErrorEmail("Por favor ingresa tu correo electrónico");
      return;
    }

    try {
      setLoadingEmail(true);
      setErrorEmail("");

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' 
          ? `${window.location.origin}/cambio-contrasena`
          : 'https://dishhubapp.vercel.app/cambio-contrasena',
      });

      if (error) throw error;

      setEmailEnviado(true);
      
    } catch (err: any) {
      console.error("Error enviando email:", err);
      setErrorEmail("Error al enviar el correo. Verifica que el email sea correcto.");
    } finally {
      setLoadingEmail(false);
    }
  };

  const cambiarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setErrorPassword("Por favor completa todos los campos");
      return;
    }

    if (password.length < 6) {
      setErrorPassword("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setErrorPassword("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoadingPassword(true);
      setErrorPassword("");

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setStep('success');
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: any) {
      console.error("Error cambiando contraseña:", err);
      setErrorPassword("Error al cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-orange-600/10 rounded-full blur-2xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl shadow-orange-500/20 border border-zinc-800 bg-zinc-900">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex flex-col items-center gap-3">
            {/* Logo */}
            <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-5 rounded-2xl shadow-xl shadow-orange-500/50">
              <ChefHat className="w-10 h-10 text-white" />
            </div>

            {/* Título según el paso */}
            <div className="text-center space-y-1">
              <CardTitle className="text-3xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                {step === 'email' && 'Recuperar Contraseña'}
                {step === 'password' && 'Nueva Contraseña'}
                {step === 'success' && '¡Contraseña Actualizada!'}
              </CardTitle>
              <CardDescription className="text-sm text-zinc-400">
                {step === 'email' && 'Ingresa tu correo para recibir instrucciones'}
                {step === 'password' && 'Crea una nueva contraseña segura'}
                {step === 'success' && 'Tu contraseña ha sido cambiada exitosamente'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          
          {/* PASO 1: Solicitar email */}
          {step === 'email' && !emailEnviado && (
            <form onSubmit={enviarEmailRecuperacion} className="space-y-5">
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
                    disabled={loadingEmail}
                    className="pl-10 h-12 bg-zinc-950 border-zinc-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {errorEmail && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {errorEmail}
                </div>
              )}

              <Button
                type="submit"
                disabled={loadingEmail}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-xl shadow-orange-500/50 hover:shadow-orange-500/75 transition-all duration-300"
              >
                {loadingEmail ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Enviar correo de recuperación
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}

          {/* Email enviado exitosamente */}
          {step === 'email' && emailEnviado && (
            <div className="space-y-5">
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg text-center space-y-3">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-400 mb-2">
                    ¡Correo enviado!
                  </h3>
                  <p className="text-sm text-zinc-300">
                    Te hemos enviado un correo a <span className="font-bold text-orange-400">{email}</span> con instrucciones para recuperar tu contraseña.
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
                  </p>
                </div>
              </div>

              <div className="text-center space-y-3">
                <Button
                  onClick={() => setEmailEnviado(false)}
                  variant="outline"
                  className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                >
                  Enviar de nuevo
                </Button>
                
                <Link
                  href="/login"
                  className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          )}

          {/* PASO 2: Cambiar contraseña */}
          {step === 'password' && (
            <form onSubmit={cambiarContrasena} className="space-y-5">
              {/* Nueva contraseña */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                  Nueva contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loadingPassword}
                    className="pl-10 pr-10 h-12 bg-zinc-950 border-zinc-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    disabled={loadingPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
                  Confirmar contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loadingPassword}
                    className="pl-10 pr-10 h-12 bg-zinc-950 border-zinc-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    disabled={loadingPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Validación visual */}
              {password && (
                <div className="space-y-2 text-xs">
                  <div className={`flex items-center gap-2 ${password.length >= 6 ? 'text-green-400' : 'text-zinc-500'}`}>
                    <CheckCircle className="w-4 h-4" />
                    Mínimo 6 caracteres
                  </div>
                  {confirmPassword && (
                    <div className={`flex items-center gap-2 ${password === confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                      <CheckCircle className="w-4 h-4" />
                      Las contraseñas {password === confirmPassword ? 'coinciden' : 'no coinciden'}
                    </div>
                  )}
                </div>
              )}

              {errorPassword && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {errorPassword}
                </div>
              )}

              <Button
                type="submit"
                disabled={loadingPassword || !password || !confirmPassword || password !== confirmPassword || password.length < 6}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-xl shadow-orange-500/50 hover:shadow-orange-500/75 transition-all duration-300 disabled:opacity-50"
              >
                {loadingPassword ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Cambiando contraseña...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Cambiar contraseña
                  </>
                )}
              </Button>
            </form>
          )}

          {/* PASO 3: Éxito */}
          {step === 'success' && (
            <div className="space-y-5">
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg text-center space-y-3">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-400 mb-2">
                    ¡Contraseña actualizada!
                  </h3>
                  <p className="text-sm text-zinc-300">
                    Tu contraseña ha sido cambiada exitosamente.
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    Serás redirigido al inicio de sesión en unos segundos...
                  </p>
                </div>
              </div>

              <Link href="/login">
                <Button className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Ir a inicio de sesión
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Versión */}
      <div className="absolute bottom-4 text-zinc-600 text-sm">
        DishHub v1.0
      </div>
    </div>
  );
}

// Componente principal con Suspense
export default function CambioContrasenaPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
        </div>
      }
    >
      <CambioContrasenaContent />
    </Suspense>
  );
}