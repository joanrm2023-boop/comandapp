"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  activo: boolean;
}

interface ModalCategoriaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriaCreada: () => void;
  categoriaAEditar?: Categoria | null; // 👈 Nueva prop
}

// Emojis sugeridos para categorías
const emojisSugeridos = ["🍔", "🍕", "🌭", "🍟", "🥤", "🍗", "🌮", "🍰", "🍜", "☕"];

// Colores predefinidos
const coloresPredefinidos = [
  { nombre: "Naranja", valor: "from-amber-500 to-orange-600" },
  { nombre: "Rojo", valor: "from-red-500 to-pink-600" },
  { nombre: "Amarillo", valor: "from-yellow-500 to-amber-600" },
  { nombre: "Verde", valor: "from-green-500 to-emerald-600" },
  { nombre: "Azul", valor: "from-blue-500 to-cyan-600" },
  { nombre: "Morado", valor: "from-purple-500 to-pink-600" },
  { nombre: "Gris", valor: "from-gray-500 to-gray-600" },
];

export default function ModalCategoria({ 
  open, 
  onOpenChange, 
  onCategoriaCreada,
  categoriaAEditar // 👈 Nueva prop
}: ModalCategoriaProps) {
  const [nombre, setNombre] = useState("");
  const [icono, setIcono] = useState("📦");
  const [color, setColor] = useState("from-gray-500 to-gray-600");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 👇 Cargar datos cuando se va a editar
  useEffect(() => {
    if (categoriaAEditar) {
      setNombre(categoriaAEditar.nombre);
      setIcono(categoriaAEditar.icono);
      setColor(categoriaAEditar.color);
    } else {
      limpiarFormulario();
    }
  }, [categoriaAEditar, open]);

  const limpiarFormulario = () => {
    setNombre("");
    setIcono("📦");
    setColor("from-gray-500 to-gray-600");
    setError("");
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (categoriaAEditar) {
        // 👇 EDITAR categoría existente
        const { error: updateError } = await supabase
          .from('categorias')
          .update({
            nombre: nombre.trim(),
            icono: icono,
            color: color,
          })
          .eq('id', categoriaAEditar.id);

        if (updateError) throw updateError;
      } else {
        // 👇 CREAR nueva categoría
        const { error: insertError } = await supabase
          .from('categorias')
          .insert([
            {
              nombre: nombre.trim(),
              icono: icono,
              color: color,
              activo: true
            }
          ]);

        if (insertError) throw insertError;
      }

      // Éxito
      limpiarFormulario();
      onCategoriaCreada();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error al guardar categoría:', err);
      
      if (err.code === '23505') {
        setError('Ya existe una categoría con ese nombre');
      } else {
        setError('Error al guardar la categoría. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    limpiarFormulario();
    onOpenChange(false);
  };

  // 👇 Título dinámico según si es crear o editar
  const esEdicion = !!categoriaAEditar;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {esEdicion ? 'Editar Categoría' : 'Agregar Categoría'}
          </DialogTitle>
          <DialogDescription>
            {esEdicion 
              ? 'Modifica los datos de la categoría' 
              : 'Crea una nueva categoría para organizar tus productos'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la categoría</Label>
            <Input
              id="nombre"
              placeholder="Ej: Hamburguesas, Pizzas..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={loading}
              className="h-11"
            />
          </div>

          {/* Icono */}
          <div className="space-y-2">
            <Label>Icono (Emoji)</Label>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-3 rounded-xl border-2 border-gray-300">
                <span className="text-3xl">{icono}</span>
              </div>
              <Input
                placeholder="Pega un emoji aquí"
                value={icono}
                onChange={(e) => setIcono(e.target.value || "📦")}
                disabled={loading}
                className="h-11 flex-1"
                maxLength={2}
              />
            </div>
            
            {/* Emojis sugeridos */}
            <div className="flex flex-wrap gap-2">
              {emojisSugeridos.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcono(emoji)}
                  className="text-2xl p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={loading}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color del gradiente</Label>
            <div className="grid grid-cols-4 gap-3">
              {coloresPredefinidos.map((colorItem) => (
                <button
                  key={colorItem.valor}
                  type="button"
                  onClick={() => setColor(colorItem.valor)}
                  disabled={loading}
                  className={`
                    h-16 rounded-xl bg-gradient-to-r ${colorItem.valor}
                    transition-all duration-200
                    ${color === colorItem.valor 
                      ? 'ring-4 ring-purple-500 ring-offset-2 scale-105' 
                      : 'hover:scale-105 hover:shadow-lg'
                    }
                  `}
                >
                  <span className="sr-only">{colorItem.nombre}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Seleccionado: {coloresPredefinidos.find(c => c.valor === color)?.nombre}
            </p>
          </div>

          {/* Vista previa */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600 mb-3 font-medium">Vista previa:</p>
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-r ${color} p-3 rounded-xl shadow-lg`}>
                <span className="text-3xl">{icono}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {nombre || "Nombre de categoría"}
                </h3>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              esEdicion ? 'Actualizar categoría' : 'Guardar categoría'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
