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

      // Cargar meseros DEL NEGOCIO
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'mesero')
        .eq('negocio_id', negocioId) // 👈 FILTRAR POR NEGOCIO
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
        // EDITAR mesero existente
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
        // CREAR nuevo mesero usando función SQL

        console.log('📝 Creando mesero:', { nombre: nombre.trim(), email: email.trim() });

        // 1. Verificar que el email no exista ya
        const { data: existeEmail } = await supabase
          .from('usuarios')
          .select('email')
          .eq('email', email.trim())
          .single();

        if (existeEmail) {
          throw new Error('Este email ya está registrado');
        }

        // 🔥 NUEVO: Obtener negocio_id del usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('negocio_id')
          .eq('auth_user_id', user.id)
          .single();

        if (!usuarioData) throw new Error('No se pudo obtener el negocio');

        const negocioId = usuarioData.negocio_id;

        // 2. Llamar a la función SQL para crear el usuario completo
        const { data: resultado, error: funcionError } = await supabase
          .rpc('crear_usuario_mesero', {
            p_email: email.trim(),
            p_password: '123456',
            p_nombre: nombre.trim(),
            p_negocio_id: negocioId // 👈 AGREGAR NEGOCIO_ID
          });

        console.log('📊 Resultado de crear_usuario_mesero:', resultado);

        if (funcionError) {
          console.error('❌ Error en función SQL:', funcionError);
          throw new Error(funcionError.message);
        }

        if (!resultado || !resultado.success) {
          throw new Error(resultado?.error || 'Error al crear el usuario');
        }

        console.log('✅ Mesero creado exitosamente con ID:', resultado.user_id);
      }

      // Recargar lista
      await cargarMeseros();
      cerrarModal();

    } catch (err: any) {
      console.error('Error guardando mesero:', err);
      
      if (err.message?.includes('already registered') || err.message?.includes('ya está registrado')) {
        setError('Este email ya está registrado');
      } else if (err.code === '23505') {
        setError('Este email ya existe en el sistema');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Error al guardar el mesero. Intenta de nuevo.');
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-xl shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Meseros
              </h1>
              <p className="text-gray-600 text-sm">Gestiona los meseros del restaurante</p>
            </div>
          </div>

          <Button
            onClick={abrirModalCrear}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Mesero
          </Button>
        </div>

        {/* Tabla de meseros */}
        {meseros.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">Nombre</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Email</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Estado</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Fecha creación</th>
                    <th className="text-right p-4 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {meseros.map((mesero) => (
                    <tr key={mesero.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {mesero.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-800">{mesero.nombre}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{mesero.email}</td>
                      <td className="p-4">
                        {mesero.activo ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <UserX className="w-3 h-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-gray-600 text-sm">
                        {formatearFecha(mesero.created_at)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalEditar(mesero)}
                            className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
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
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay meseros registrados
            </h3>
            <p className="text-gray-500 mb-6">
              Comienza agregando tu primer mesero
            </p>
            <Button onClick={abrirModalCrear} className="bg-gradient-to-r from-blue-600 to-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Mesero
            </Button>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {meseroAEditar ? 'Editar Mesero' : 'Agregar Mesero'}
            </DialogTitle>
            <DialogDescription>
              {meseroAEditar 
                ? 'Modifica los datos del mesero' 
                : 'Completa la información del nuevo mesero'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                placeholder="Ej: Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={guardando}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="juan@restau.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={guardando}
              />
            </div>

            {!meseroAEditar && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Contraseña automática:</strong> Todos los meseros tendrán la contraseña: <code className="bg-blue-100 px-2 py-1 rounded">123456</code>
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
            <Button variant="outline" onClick={cerrarModal} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              onClick={guardarMesero}
              disabled={guardando}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar mesero?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el mesero y no podrá iniciar sesión. Los pedidos realizados por este mesero se mantendrán en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
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