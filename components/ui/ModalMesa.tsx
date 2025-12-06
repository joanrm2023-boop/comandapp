"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Mesa {
  id: string;
  numero: string;
  capacidad: number;
  activo: boolean;
  negocio_id: string;
}

interface ModalMesaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMesaCreada: () => void;
  mesaAEditar?: Mesa | null;
}

// Iconos disponibles para seleccionar
const ICONOS_DISPONIBLES = [
  { emoji: "🪑", nombre: "Mesa", sugerencia: "Mesa" },
  { emoji: "🏠", nombre: "Domicilio", sugerencia: "Domicilio" },
  { emoji: "🛍️", nombre: "Para Llevar", sugerencia: "Para Llevar" },
  { emoji: "🏍️", nombre: "Moto", sugerencia: "Domicilio Moto" },
  { emoji: "🚗", nombre: "Carro", sugerencia: "Domicilio Carro" },
  { emoji: "🍕", nombre: "Pizza", sugerencia: "Mesa VIP" },
];

export default function ModalMesa({ open, onOpenChange, onMesaCreada, mesaAEditar }: ModalMesaProps) {
  const [numero, setNumero] = useState("");
  const [iconoSeleccionado, setIconoSeleccionado] = useState("🪑");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos si es edición
  useEffect(() => {
    if (mesaAEditar) {
      setNumero(mesaAEditar.numero);
      
      // Determinar icono basado en el nombre
      const numeroLower = mesaAEditar.numero.toLowerCase();
      if (numeroLower.includes('domicilio')) setIconoSeleccionado('🏠');
      else if (numeroLower.includes('llevar')) setIconoSeleccionado('🛍️');
      else if (numeroLower.includes('moto')) setIconoSeleccionado('🏍️');
      else if (numeroLower.includes('carro')) setIconoSeleccionado('🚗');
      else setIconoSeleccionado('🪑');
    } else {
      // Limpiar formulario
      setNumero("");
      setIconoSeleccionado("🪑");
    }
    setError(null);
  }, [mesaAEditar, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!numero.trim()) {
      setError('El nombre/número de la mesa es requerido');
      return;
    }

    try {
      setLoading(true);

      // Obtener negocio_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError || !usuarioData) throw new Error('No se pudo obtener el negocio del usuario');

      if (mesaAEditar) {
        // EDITAR mesa existente (solo el nombre, capacidad se mantiene)
        const { error: updateError } = await supabase
          .from('mesas')
          .update({
            numero: numero.trim(),
          })
          .eq('id', mesaAEditar.id);

        if (updateError) throw updateError;
      } else {
        // CREAR nueva mesa (capacidad por defecto = 4)
        const { error: insertError } = await supabase
          .from('mesas')
          .insert([{
            numero: numero.trim(),
            capacidad: 4, // Valor por defecto
            negocio_id: usuarioData.negocio_id,
            activo: true
          }]);

        if (insertError) throw insertError;
      }

      // Limpiar y cerrar
      setNumero("");
      setIconoSeleccionado("🪑");
      onMesaCreada();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error completo:', err);
      setError(err?.message || 'Error al guardar la mesa. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const aplicarSugerencia = (sugerencia: string, emoji: string) => {
    setNumero(sugerencia);
    setIconoSeleccionado(emoji);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto border-2 border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            {mesaAEditar ? 'Editar Mesa' : 'Agregar Nueva Mesa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Selector de Icono */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-zinc-700">
              Selecciona el tipo de mesa
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {ICONOS_DISPONIBLES.map((icono) => (
                <button
                  key={icono.emoji}
                  type="button"
                  onClick={() => aplicarSugerencia(icono.sugerencia, icono.emoji)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    iconoSeleccionado === icono.emoji
                      ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/20'
                      : 'border-zinc-200 hover:border-orange-300 bg-white'
                  }`}
                >
                  <div className="text-4xl mb-2">{icono.emoji}</div>
                  <div className="text-xs font-medium text-zinc-700">{icono.nombre}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre/Número */}
          <div className="space-y-2">
            <Label htmlFor="numero" className="text-sm font-semibold text-zinc-700">
              Nombre / Número de Mesa
            </Label>
            <Input
              id="numero"
              placeholder="Ej: Mesa 1, Domicilio, Para Llevar..."
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="h-12 border-zinc-300 focus:ring-2 focus:ring-orange-500"
              required
            />
            <p className="text-xs text-zinc-500">
              💡 Tip: Puedes usar nombres como "Mesa 1", "Domicilio", "Para Llevar", etc.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Preview */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
            <p className="text-xs font-semibold text-zinc-700 mb-3">Vista previa:</p>
            <div className="bg-white rounded-lg p-4 border-2 border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl">
                  <span className="text-3xl">{iconoSeleccionado}</span>
                </div>
                <div>
                  <p className="font-bold text-lg text-zinc-900">
                    {numero || "Nombre de la mesa"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-zinc-300"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              mesaAEditar ? 'Guardar Cambios' : 'Agregar Mesa'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}