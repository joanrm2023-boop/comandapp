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
import { Loader2, DollarSign, Plus, X } from "lucide-react";

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
        max_sabores?: number;
        porciones_min?: number | null;
        porciones_max?: number | null;
    } | null;
    }

interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  color: string;
}

interface Sabor {
  id: string;
  nombre: string;
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

  // 🆕 Sabores de este producto
  const [saboresCategoria, setSaboresCategoria] = useState<Sabor[]>([]);
  const [saboresSeleccionados, setSaboresSeleccionados] = useState<string[]>([]);
  const [maxSabores, setMaxSabores] = useState("1");
  const [nuevoSaborNombre, setNuevoSaborNombre] = useState("");
  const [agregandoSabor, setAgregandoSabor] = useState(false);

  // 🆕 Porciones para dividir el producto (opcional, ej. pizzas)
  const [porcionesMin, setPorcionesMin] = useState("");
  const [porcionesMax, setPorcionesMax] = useState("");

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
        setMaxSabores(String(productoAEditar.max_sabores && productoAEditar.max_sabores > 0 ? productoAEditar.max_sabores : 1));
        setPorcionesMin(productoAEditar.porciones_min != null ? String(productoAEditar.porciones_min) : "");
        setPorcionesMax(productoAEditar.porciones_max != null ? String(productoAEditar.porciones_max) : "");
        cargarSaboresAsignados(productoAEditar.id);
    } else if (open && !productoAEditar) {
        setMaxSabores("1");
        setSaboresSeleccionados([]);
        setPorcionesMin("");
        setPorcionesMax("");
    }
    }, [open, productoAEditar]);

  // 🆕 Recargar el catálogo de sabores de la categoría cada vez que cambia la categoría seleccionada
  useEffect(() => {
    if (open && categoriaId) {
      cargarSaboresDeCategoria(categoriaId);
    } else {
      setSaboresCategoria([]);
    }
  }, [open, categoriaId]);

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

  // 🆕 Trae los sabores ya creados para la categoría seleccionada
  const cargarSaboresDeCategoria = async (catId: string) => {
    try {
      const { data } = await supabase
        .from('sabores')
        .select('id, nombre')
        .eq('activo', true)
        .eq('categoria_id', catId)
        .order('nombre');

      setSaboresCategoria(data || []);
    } catch (err) {
      console.error('Error cargando sabores de la categoría:', err);
    }
  };

  // 🆕 Trae los sabores ya asignados a este producto (modo editar)
  const cargarSaboresAsignados = async (productoId: string) => {
    try {
      const { data } = await supabase
        .from('producto_sabores')
        .select('sabor_id')
        .eq('producto_id', productoId);

      setSaboresSeleccionados((data || []).map((r) => r.sabor_id));
    } catch (err) {
      console.error('Error cargando sabores asignados:', err);
    }
  };

  // 🆕 Crea un sabor nuevo en el catálogo (ligado a la categoría actual) y lo marca de una vez para este producto
  const agregarSaborNuevo = async () => {
    if (!nuevoSaborNombre.trim()) return;
    if (!categoriaId) {
      setError("Selecciona una categoría primero");
      return;
    }

    try {
      setAgregandoSabor(true);
      setError("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError || !usuarioData) throw new Error('No se pudo obtener el negocio del usuario');

      const { data: nuevoSabor, error: insertError } = await supabase
        .from('sabores')
        .insert([{
          nombre: nuevoSaborNombre.trim(),
          categoria_id: categoriaId,
          negocio_id: usuarioData.negocio_id,
          activo: true,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setSaboresCategoria((prev) => [...prev, nuevoSabor]);
      setSaboresSeleccionados((prev) => [...prev, nuevoSabor.id]);
      setNuevoSaborNombre("");
    } catch (err: any) {
      console.error('Error creando sabor:', err);
      setError(err?.message || 'Error al crear el sabor');
    } finally {
      setAgregandoSabor(false);
    }
  };

  const toggleSabor = (saborId: string) => {
    setSaboresSeleccionados((prev) =>
      prev.includes(saborId) ? prev.filter((id) => id !== saborId) : [...prev, saborId]
    );
  };

  // 🆕 Quita un sabor por completo del catálogo de la categoría (no solo de este producto)
  const quitarSaborDelCatalogo = async (saborId: string) => {
    try {
      await supabase.from('sabores').update({ activo: false }).eq('id', saborId);
      setSaboresCategoria((prev) => prev.filter((s) => s.id !== saborId));
      setSaboresSeleccionados((prev) => prev.filter((id) => id !== saborId));
    } catch (err) {
      console.error('Error quitando sabor:', err);
    }
  };

  const limpiarFormulario = () => {
    setNombre("");
    setPrecio("");
    setCategoriaId("");
    setDescripcion("");
    setMaxSabores("1");
    setSaboresSeleccionados([]);
    setSaboresCategoria([]);
    setNuevoSaborNombre("");
    setPorcionesMin("");
    setPorcionesMax("");
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

  // 🆕 Guarda la relación producto-sabores y el máximo permitido
  const sincronizarSabores = async (productoId: string) => {
    await supabase.from('producto_sabores').delete().eq('producto_id', productoId);

    if (saboresSeleccionados.length > 0) {
      const { error: errorSabores } = await supabase
        .from('producto_sabores')
        .insert(
          saboresSeleccionados.map((saborId) => ({
            producto_id: productoId,
            sabor_id: saborId,
          }))
        );

      if (errorSabores) throw errorSabores;
    }

    const { error: errorMax } = await supabase
      .from('productos')
      .update({ max_sabores: saboresSeleccionados.length > 0 ? Number(maxSabores) : 0 })
      .eq('id', productoId);

    if (errorMax) throw errorMax;
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

    // 🆕 Validación de porciones
    const minVal = porcionesMin.trim() ? Number(porcionesMin) : null;
    const maxVal = porcionesMax.trim() ? Number(porcionesMax) : null;

    if ((minVal !== null) !== (maxVal !== null)) {
        setError("Si defines porciones, debes llenar mínimo y máximo");
        return;
    }
    if (minVal !== null && maxVal !== null) {
        if (minVal <= 0 || maxVal < minVal) {
            setError("El rango de porciones no es válido");
            return;
        }
    }

    try {
        setLoading(true);
        setError("");

        let productoId: string;

        if (productoAEditar) {
        // Modo EDITAR - UPDATE
        const { error: updateError } = await supabase
            .from('productos')
            .update({
            nombre: nombre.trim(),
            precio: Number(precio),
            categoria_id: categoriaId,
            descripcion: descripcion.trim() || null,
            porciones_min: minVal,
            porciones_max: maxVal,
            })
            .eq('id', productoAEditar.id);

        if (updateError) throw updateError;

        productoId = productoAEditar.id;
        } else {
          // Modo CREAR - INSERT
          // Obtener negocio_id del usuario actual
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Usuario no autenticado');

          const { data: usuarioData, error: usuarioError } = await supabase
            .from('usuarios')
            .select('negocio_id')
            .eq('auth_user_id', user.id)
            .single();

          if (usuarioError || !usuarioData) throw new Error('No se pudo obtener el negocio del usuario');

          const { data: nuevoProducto, error: insertError } = await supabase
              .from('productos')
              .insert([
              {
                  nombre: nombre.trim(),
                  precio: Number(precio),
                  categoria_id: categoriaId,
                  descripcion: descripcion.trim() || null,
                  negocio_id: usuarioData.negocio_id,
                  activo: true,
                  porciones_min: minVal,
                  porciones_max: maxVal,
              }
              ])
              .select()
              .single();

          if (insertError) throw insertError;
          if (!nuevoProducto) throw new Error('No se pudo crear el producto');

          productoId = nuevoProducto.id;
          }

        // 🆕 Guardar sabores de este producto
        await sincronizarSabores(productoId);

        // Éxito
        limpiarFormulario();
        onProductoCreado();
        onOpenChange(false);
    } catch (err: any) {
    console.error('Error completo:', err);
    console.error('Error mensaje:', err?.message);
    console.error('Error detalles:', err?.details);
    setError(err?.message || 'Error al guardar el producto. Intenta de nuevo.');
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

          {/* 🆕 Sabores de este producto */}
          {categoriaId && (
            <div className="space-y-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
              <Label>Sabores de este producto (opcional)</Label>

              {/* Agregar sabor nuevo directo */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: Hawaiana, Manzana..."
                  value={nuevoSaborNombre}
                  onChange={(e) => setNuevoSaborNombre(e.target.value)}
                  disabled={loading || agregandoSabor}
                  className="h-10 bg-white"
                  onKeyDown={(e) => e.key === 'Enter' && agregarSaborNuevo()}
                />
                <Button
                  type="button"
                  onClick={agregarSaborNuevo}
                  disabled={loading || agregandoSabor || !nuevoSaborNombre.trim()}
                  className="h-10 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shrink-0"
                >
                  {agregandoSabor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>

              {/* Lista de sabores existentes para esta categoría, con checkbox para marcar/desmarcar */}
              {saboresCategoria.length > 0 && (
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {saboresCategoria.map((sabor) => (
                    <div
                      key={sabor.id}
                      className="flex items-center gap-1.5 text-sm bg-white rounded-lg px-2 py-1.5 border border-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={saboresSeleccionados.includes(sabor.id)}
                        onChange={() => toggleSabor(sabor.id)}
                        disabled={loading}
                        className="shrink-0"
                      />
                      <span className="flex-1 truncate">{sabor.nombre}</span>
                      <button
                        type="button"
                        onClick={() => quitarSaborDelCatalogo(sabor.id)}
                        disabled={loading}
                        className="text-gray-400 hover:text-red-600 shrink-0"
                        title="Eliminar este sabor del catálogo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Máximo de sabores, solo si hay al menos uno marcado */}
              {saboresSeleccionados.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Máximo que puede combinar el cliente</Label>
                  <Select value={maxSabores} onValueChange={setMaxSabores} disabled={loading}>
                    <SelectTrigger className="h-9 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (un solo sabor)</SelectItem>
                      <SelectItem value="2">Hasta 2 (mitad y mitad)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* 🆕 Porciones para dividir el producto (opcional, ej. pizzas) */}
          <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <Label>Porciones para dividir (opcional)</Label>
            <p className="text-xs text-gray-500">
              Si el producto se puede cortar en partes (ej. pizzas), define el rango. El cliente verá opciones cada 2 unidades dentro de ese rango.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mínimo</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ej: 4"
                  value={porcionesMin}
                  onChange={(e) => setPorcionesMin(e.target.value)}
                  disabled={loading}
                  className="h-9 bg-white text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Máximo</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ej: 12"
                  value={porcionesMax}
                  onChange={(e) => setPorcionesMax(e.target.value)}
                  disabled={loading}
                  className="h-9 bg-white text-sm"
                />
              </div>
            </div>
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