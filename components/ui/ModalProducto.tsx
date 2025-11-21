"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { Loader2, DollarSign } from "lucide-react";

interface ModalProductoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProductoCreado: () => void;
    productoAEditar?: {
        id: string;
        nombre: string;
        precio: number;
        categoria_id: string;
        descripcion?: string | null;
    } | null;
    }

interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  color: string;
}

export default function ModalProducto({ 
  open, 
  onOpenChange, 
  onProductoCreado,
  productoAEditar = null
}: ModalProductoProps) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [error, setError] = useState("");

  // Cargar categorías cuando se abre el modal
  useEffect(() => {
    if (open) {
      cargarCategorias();
    }
  }, [open]);

  // Cargar datos del producto cuando se abre en modo editar
    useEffect(() => {
    if (open && productoAEditar) {
        setNombre(productoAEditar.nombre);
        setPrecio(String(productoAEditar.precio));
        setCategoriaId(productoAEditar.categoria_id);
        setDescripcion(productoAEditar.descripcion || "");
    }
    }, [open, productoAEditar]);

  const cargarCategorias = async () => {
    try {
      setLoadingCategorias(true);
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error('Error cargando categorías:', err);
      setError('Error al cargar las categorías');
    } finally {
      setLoadingCategorias(false);
    }
  };

  const limpiarFormulario = () => {
    setNombre("");
    setPrecio("");
    setCategoriaId("");
    setDescripcion("");
    setError("");
  };

  const formatearPrecio = (valor: string) => {
    // Remover todo excepto números
    const soloNumeros = valor.replace(/\D/g, '');
    return soloNumeros;
  };

  const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormateado = formatearPrecio(e.target.value);
    setPrecio(valorFormateado);
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!nombre.trim()) {
        setError("El nombre es obligatorio");
        return;
    }

    if (!precio || Number(precio) <= 0) {
        setError("El precio debe ser mayor a 0");
        return;
    }

    if (!categoriaId) {
        setError("Debes seleccionar una categoría");
        return;
    }

    try {
        setLoading(true);
        setError("");

        if (productoAEditar) {
        // Modo EDITAR - UPDATE
        const { error: updateError } = await supabase
            .from('productos')
            .update({
            nombre: nombre.trim(),
            precio: Number(precio),
            categoria_id: categoriaId,
            descripcion: descripcion.trim() || null,
            })
            .eq('id', productoAEditar.id);

        if (updateError) throw updateError;
        } else {
        // Modo CREAR - INSERT
        const { error: insertError } = await supabase
            .from('productos')
            .insert([
            {
                nombre: nombre.trim(),
                precio: Number(precio),
                categoria_id: categoriaId,
                descripcion: descripcion.trim() || null,
                activo: true
            }
            ]);

        if (insertError) throw insertError;
        }

        // Éxito
        limpiarFormulario();
        onProductoCreado();
        onOpenChange(false);
    } catch (err: any) {
        console.error('Error al guardar producto:', err);
        setError('Error al guardar el producto. Intenta de nuevo.');
    } finally {
        setLoading(false);
    }
    };

  const handleCancel = () => {
    limpiarFormulario();
    onOpenChange(false);
  };

  const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {productoAEditar ? 'Editar Producto' : 'Agregar Producto'}
            </DialogTitle>
          <DialogDescription>
            Crea un nuevo producto para tu menú
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del producto *</Label>
            <Input
              id="nombre"
              placeholder="Ej: Hamburguesa Clásica, Pizza Pepperoni..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={loading}
              className="h-11"
            />
          </div>

          {/* Precio */}
          <div className="space-y-2">
            <Label htmlFor="precio">Precio *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="precio"
                type="text"
                placeholder="15000"
                value={precio ? Number(precio).toLocaleString('es-CO') : ''}
                onChange={handlePrecioChange}
                disabled={loading}
                className="h-11 pl-10"
              />
            </div>
            {precio && (
              <p className="text-xs text-gray-500">
                Precio: ${Number(precio).toLocaleString('es-CO')} COP
              </p>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría *</Label>
            {loadingCategorias ? (
              <div className="flex items-center justify-center h-11 border border-gray-200 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : categorias.length === 0 ? (
              <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-700">
                  No hay categorías disponibles. Crea una primero.
                </p>
              </div>
            ) : (
              <Select value={categoriaId} onValueChange={setCategoriaId} disabled={loading}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icono} {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea
              id="descripcion"
              placeholder="Describe tu producto..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={loading}
              className="min-h-[80px] resize-none"
            />
            <p className="text-xs text-gray-500">
              {descripcion.length}/200 caracteres
            </p>
          </div>

          {/* Vista previa */}
          {nombre && precio && categoriaSeleccionada && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600 mb-3 font-medium">Vista previa:</p>
              <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${categoriaSeleccionada.color || 'from-gray-500 to-gray-600'}`}></div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{nombre}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span>{categoriaSeleccionada.icono}</span>
                    <span>{categoriaSeleccionada.nombre}</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    ${Number(precio).toLocaleString('es-CO')}
                  </p>
                  {descripcion && (
                    <p className="text-sm text-gray-600 mt-3">{descripcion}</p>
                  )}
                </div>
              </div>
            </div>
          )}

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
            disabled={loading || categorias.length === 0}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? (
            <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
            </>
            ) : (
            productoAEditar ? "Guardar cambios" : "Guardar producto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}