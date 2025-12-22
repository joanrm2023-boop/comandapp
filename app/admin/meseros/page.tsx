"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Plus, Edit, Trash2, Loader2, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

interface Mesero {
  id: string;
  nombre: string;
  email: string;
  auth_user_id: string;
  activo: boolean;
  created_at: string;
}

export default function MeserosPage() {
  const [meseros, setMeseros] = useState<Mesero[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [meseroAEditar, setMeseroAEditar] = useState<Mesero | null>(null);
  const [meseroAEliminar, setMeseroAEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Estados del formulario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarMeseros();
  }, []);

  const cargarMeseros = async () => {
    try {
      setLoading(true);

      // 🔥 Obtener negocio_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!usuarioData) return;

      const negocioId = usuarioData.negocio_id;

      // Cargar meseros DEL NEGOCIO (solo activos)
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'mesero')
        .eq('negocio_id', negocioId)
        .eq('activo', true) // 👈 Solo meseros activos
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeseros(data || []);
    } catch (err) {
      console.error('Error cargando meseros:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrear = () => {
    setMeseroAEditar(null);
    setNombre("");
    setEmail("");
    setError("");
    setModalOpen(true);
  };

  const abrirModalEditar = (mesero: Mesero) => {
    setMeseroAEditar(mesero);
    setNombre(mesero.nombre);
    setEmail(mesero.email);
    setError("");
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setMeseroAEditar(null);
    setNombre("");
    setEmail("");
    setError("");
  };

  const guardarMesero = async () => {
    if (!nombre.trim() || !email.trim()) {
      setError("Todos los campos son obligatorios");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Email inválido");
      return;
    }

    try {
      setGuardando(true);
      setError("");

      if (meseroAEditar) {
        // ============================================
        // EDITAR mesero existente
        // ============================================
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({
            nombre: nombre.trim(),
            email: email.trim(),
          })
          .eq('id', meseroAEditar.id);

        if (updateError) throw updateError;

        console.log('✅ Mesero actualizado exitosamente');

      } else {
        // ============================================
        // CREAR nuevo mesero (O REACTIVAR si existe)
        // ============================================

        console.log('📝 Verificando si mesero existe:', email.trim());

        // Obtener negocio_id del usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('negocio_id')
          .eq('auth_user_id', user.id)
          .single();

        if (!usuarioData) throw new Error('No se pudo obtener el negocio');

        const negocioId = usuarioData.negocio_id;

        // 🔍 VERIFICAR si ya existe un mesero con ese email (activo o inactivo)
        const { data: meseroExistente, error: buscarError } = await supabase
          .from('usuarios')
          .select('id, activo, auth_user_id')
          .eq('email', email.trim())
          .eq('negocio_id', negocioId)
          .eq('rol', 'mesero')
          .maybeSingle();

        if (buscarError) throw buscarError;

        if (meseroExistente) {
          // ✅ EL MESERO YA EXISTE
          console.log('👤 Mesero encontrado:', meseroExistente);

          if (meseroExistente.activo) {
            // Si ya está activo, mostrar error
            setError('Este email ya está registrado como mesero activo');
            setGuardando(false);
            return;
          } else {
            // 🔄 REACTIVAR mesero inactivo
            console.log('🔄 Reactivando mesero inactivo...');

            const { error: reactivarError } = await supabase
              .from('usuarios')
              .update({
                nombre: nombre.trim(),
                activo: true
              })
              .eq('id', meseroExistente.id);

            if (reactivarError) throw reactivarError;

            console.log('✅ Mesero reactivado exitosamente');
          }

        } else {
          // ➕ CREAR NUEVO MESERO
          console.log('➕ Creando nuevo mesero...');

          // 1. Crear usuario en Supabase Auth
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password: '123456',
            options: {
              emailRedirectTo: undefined,
              data: {
                nombre: nombre.trim(),
                rol: 'mesero'
              }
            }
          });

          if (signUpError) {
            console.error('❌ Error en signUp:', signUpError);
            throw new Error(signUpError.message);
          }

          if (!authData.user) {
            throw new Error('No se pudo crear el usuario en Auth');
          }

          console.log('✅ Usuario auth creado:', authData.user.id);

          // 2. Crear en tabla usuarios
          const { error: insertError } = await supabase
            .from('usuarios')
            .insert([{
              auth_user_id: authData.user.id,
              negocio_id: negocioId,
              nombre: nombre.trim(),
              email: email.trim(),
              rol: 'mesero',
              activo: true
            }]);

          if (insertError) {
            console.error('❌ Error insertando usuario:', insertError);
            throw new Error(insertError.message);
          }

          console.log('✅ Mesero creado exitosamente');
        }
      }

      // Recargar lista y cerrar modal
      await cargarMeseros();
      cerrarModal();

    } catch (err: any) {
      console.error('❌ Error guardando mesero:', err);
      
      if (err.message?.includes('ya está registrado')) {
        setError('Este email ya está registrado como mesero');
      } else if (err.code === '23505') {
        setError('Este email ya existe en el sistema');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Error al guardar el mesero. Verifica tu conexión e intenta de nuevo.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const eliminarMesero = async (id: string) => {
    try {
      setEliminando(true);

      const mesero = meseros.find(m => m.id === id);
      if (!mesero) return;

      // Desactivar en tabla usuarios
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ activo: false })
        .eq('id', id);

      if (updateError) throw updateError;

      await cargarMeseros();
      setMeseroAEliminar(null);

    } catch (err) {
      console.error('Error eliminando mesero:', err);
      alert('Error al eliminar el mesero');
    } finally {
      setEliminando(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl shadow-lg shadow-orange-500/30">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Meseros
              </h1>
              <p className="text-zinc-600 text-sm">Gestiona los meseros del restaurante</p>
            </div>
          </div>

          <Button
            onClick={abrirModalCrear}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Mesero
          </Button>
        </div>

        {/* Tabla de meseros */}
        {meseros.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-zinc-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b-2 border-zinc-200">
                  <tr>
                    <th className="text-left p-4 font-semibold text-zinc-700">Nombre</th>
                    <th className="text-left p-4 font-semibold text-zinc-700">Email</th>
                    <th className="text-left p-4 font-semibold text-zinc-700">Estado</th>
                    <th className="text-left p-4 font-semibold text-zinc-700">Fecha creación</th>
                    <th className="text-right p-4 font-semibold text-zinc-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {meseros.map((mesero) => (
                    <tr key={mesero.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                            <span className="text-orange-600 font-semibold">
                              {mesero.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-zinc-900">{mesero.nombre}</span>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-600">{mesero.email}</td>
                      <td className="p-4">
                        {mesero.activo ? (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-zinc-200 text-zinc-700">
                            <UserX className="w-3 h-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-zinc-600 text-sm">
                        {formatearFecha(mesero.created_at)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalEditar(mesero)}
                            className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-400 border-zinc-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setMeseroAEliminar(mesero.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-zinc-200">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">
              No hay meseros registrados
            </h3>
            <p className="text-zinc-600 mb-6">
              Comienza agregando tu primer mesero
            </p>
            <Button onClick={abrirModalCrear} className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/30">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Mesero
            </Button>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px] border-2 border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              {meseroAEditar ? 'Editar Mesero' : 'Agregar Mesero'}
            </DialogTitle>
            <DialogDescription className="text-zinc-600">
              {meseroAEditar 
                ? 'Modifica los datos del mesero' 
                : 'Completa la información del nuevo mesero'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-zinc-700">Nombre completo</Label>
              <Input
                id="nombre"
                placeholder="Ej: Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={guardando}
                className="border-zinc-300 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="juan@restaurante.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={guardando}
                className="border-zinc-300 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {!meseroAEditar && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  <strong>🔑 Contraseña temporal:</strong> El mesero podrá iniciar sesión con su email y la contraseña <code className="bg-orange-100 px-2 py-1 rounded font-mono">123456</code>
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal} disabled={guardando} className="border-zinc-300">
              Cancelar
            </Button>
            <Button
              onClick={guardarMesero}
              disabled={guardando}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                meseroAEditar ? 'Actualizar' : 'Crear Mesero'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={!!meseroAEliminar} onOpenChange={() => setMeseroAEliminar(null)}>
        <AlertDialogContent className="border-2 border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900">¿Eliminar mesero?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600">
              Esta acción desactivará el mesero y no podrá iniciar sesión. Los pedidos realizados por este mesero se mantendrán en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando} className="border-zinc-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => meseroAEliminar && eliminarMesero(meseroAEliminar)}
              disabled={eliminando}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Sí, eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}