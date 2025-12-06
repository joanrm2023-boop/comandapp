"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Loader2, Edit, Trash2, Armchair } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ModalMesa from "@/components/ui/ModalMesa";

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

// Tipos
interface Mesa {
  id: string;
  numero: string;
  capacidad: number;
  activo: boolean;
  created_at: string;
  negocio_id: string;
}

export default function MesasPage() {
  const [busqueda, setBusqueda] = useState("");
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMesaOpen, setModalMesaOpen] = useState(false);
  const [mesaAEliminar, setMesaAEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [mesaAEditar, setMesaAEditar] = useState<Mesa | null>(null);

  useEffect(() => {
    cargarMesas();
  }, []);

  const cargarMesas = async () => {
    try {
      setLoading(true);

      // Obtener negocio_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError || !usuarioData) {
        setError('Usuario no encontrado en el sistema');
        setLoading(false);
        return;
      }

      const negocioId = usuarioData.negocio_id;
      
      // Cargar mesas DEL NEGOCIO
      const { data: mesasData, error: errorMesas } = await supabase
        .from('mesas')
        .select('*')
        .eq('activo', true)
        .eq('negocio_id', negocioId);

      if (errorMesas) throw errorMesas;

      // Ordenar las mesas de forma natural (Domicilio primero, luego mesas numéricamente)
      const mesasOrdenadas = (mesasData as Mesa[] ?? []).sort((a, b) => {
        // Extraer números de los nombres
        const numeroA = a.numero.match(/\d+/);
        const numeroB = b.numero.match(/\d+/);
        
        // Si ambos tienen números, comparar numéricamente
        if (numeroA && numeroB) {
          return parseInt(numeroA[0]) - parseInt(numeroB[0]);
        }
        
        // Si solo uno tiene número, el que tiene va después
        if (numeroA) return 1;
        if (numeroB) return -1;
        
        // Si ninguno tiene número, ordenar alfabéticamente
        return a.numero.localeCompare(b.numero);
      });

      setMesas(mesasOrdenadas);
      setError(null);
    } catch (err) {
      console.error('Error cargando mesas:', err);
      setError('Error al cargar las mesas. Por favor, recarga la página.');
    } finally {
      setLoading(false);
    }
  };

  const eliminarMesa = async (id: string) => {
    try {
      setEliminando(true);
      
      const { error } = await supabase
        .from('mesas')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;

      await cargarMesas();
      setMesaAEliminar(null);
    } catch (err) {
      console.error('Error al eliminar mesa:', err);
      alert('Error al eliminar la mesa');
    } finally {
      setEliminando(false);
    }
  };

  // Obtener icono según el nombre/número de la mesa
  const obtenerIconoMesa = (numero: string): string => {
    const numeroLower = numero.toLowerCase();
    
    if (numeroLower.includes('domicilio')) return '🏠';
    if (numeroLower.includes('llevar')) return '🛍️';
    if (numeroLower.includes('moto')) return '🏍️';
    if (numeroLower.includes('carro')) return '🚗';
    
    return '🪑'; // Por defecto
  };

  // Obtener color según el tipo de mesa
  const obtenerColorMesa = (numero: string): string => {
    const numeroLower = numero.toLowerCase();
    
    if (numeroLower.includes('domicilio')) return 'from-orange-500 to-red-500';
    if (numeroLower.includes('llevar')) return 'from-zinc-500 to-zinc-700';
    if (numeroLower.includes('moto')) return 'from-blue-500 to-blue-600';
    
    return 'from-orange-500 to-red-500'; // Por defecto
  };

  const mesasFiltradas = mesas.filter((mesa) => {
    const busquedaLower = busqueda.toLowerCase();
    return mesa.numero.toLowerCase().includes(busquedaLower);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-zinc-600">Cargando mesas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg border-2 border-zinc-200">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-zinc-900 mb-2">Error al cargar</h3>
          <p className="text-zinc-600 mb-4">{error}</p>
          <Button 
            onClick={cargarMesas}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            Reintentar
          </Button>
        </div>
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
              <Armchair className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Mesas
              </h1>
              <p className="text-zinc-600 text-sm">Gestiona tus mesas y puntos de venta</p>
            </div>
          </div>

          <Button 
            onClick={() => setModalMesaOpen(true)}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Mesa
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-zinc-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <Input
              placeholder="Buscar mesa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 h-12 border-zinc-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Grid de mesas */}
        {mesasFiltradas.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mesasFiltradas.map((mesa) => {
              const icono = obtenerIconoMesa(mesa.numero);
              const color = obtenerColorMesa(mesa.numero);
              
              return (
                <Card 
                  key={mesa.id} 
                  className="group hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 border-2 border-zinc-200 hover:border-orange-300 bg-white overflow-hidden"
                >
                  <div className={`h-2 bg-gradient-to-r ${color}`}></div>
                  <CardHeader className="pb-4 p-4">
                    <div className="flex justify-center mb-3">
                      <div className={`bg-gradient-to-r ${color} p-4 rounded-2xl shadow-lg`}>
                        <span className="text-5xl">{icono}</span>
                      </div>
                    </div>
                    <CardTitle className="text-center text-lg font-bold text-zinc-900 group-hover:text-orange-600 transition-colors">
                      {mesa.numero}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-400 transition-all border-zinc-300 h-9 px-2"
                        onClick={() => setMesaAEditar(mesa)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="flex-1 bg-red-500 hover:bg-red-600 transition-all h-9 px-2"
                        onClick={() => setMesaAEliminar(mesa.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-zinc-200">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">
              No se encontraron mesas
            </h3>
            <p className="text-zinc-600">
              {mesas.length === 0 
                ? 'No hay mesas registradas. Agrega tu primera mesa.' 
                : 'Intenta con otros términos de búsqueda'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Mesa */}
      <ModalMesa 
        open={modalMesaOpen || !!mesaAEditar}
        onOpenChange={(open) => {
          setModalMesaOpen(open);
          if (!open) setMesaAEditar(null);
        }}
        onMesaCreada={cargarMesas}
        mesaAEditar={mesaAEditar}
      />

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={!!mesaAEliminar} onOpenChange={() => setMesaAEliminar(null)}>
        <AlertDialogContent className="border-2 border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600">
              Esta acción desactivará la mesa. No aparecerá en la lista pero podrás reactivarla después desde la base de datos si lo necesitas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando} className="border-zinc-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => mesaAEliminar && eliminarMesa(mesaAEliminar)}
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