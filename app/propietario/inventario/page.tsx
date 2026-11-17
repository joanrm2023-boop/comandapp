"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  Plus,
  ArrowUp,
  ArrowDown,
  Settings,
  Trash2,
  Loader2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  History,
  Search,
  Filter,
  X,
  Edit,
  Save,
  Calendar
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Tipos
interface Insumo {
  id: string;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  precio_compra: number;
  proveedor: string | null;
  ubicacion: string | null;
  activo: boolean;
}

interface Movimiento {
  id: string;
  insumo_id: string;
  tipo_movimiento: string;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: string | null;
  created_at: string;
  insumos: {
    nombre: string;
    unidad_medida: string;
  };
  usuarios: {
    nombre: string;
  } | null;
}

const CATEGORIAS = [
  "Carnes",
  "Lácteos",
  "Verduras",
  "Granos",
  "Empaques",
  "Bebidas",
  "Condimentos",
  "Otros"
];

const UNIDADES_MEDIDA = ["kg", "g", "L", "ml", "unidad", "caja", "paquete", "sobre"];

const TIPOS_MOVIMIENTO = [
  { value: "entrada", label: "📥 Entrada", color: "bg-green-500" },
  { value: "salida", label: "📤 Salida", color: "bg-red-500" },
  { value: "ajuste", label: "⚙️ Ajuste", color: "bg-blue-500" },
  { value: "merma", label: "💀 Merma", color: "bg-gray-500" }
];

export default function InventarioPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [negocioId, setNegocioId] = useState<string>("");
  const [usuarioId, setUsuarioId] = useState<string>("");

  // Estados de filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [mostrarSoloAlertas, setMostrarSoloAlertas] = useState(false);

  // Estados de modales
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);

  // Estados de formularios
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(null);
  const [nuevoInsumo, setNuevoInsumo] = useState({
    nombre: "",
    categoria: "Otros",
    unidad_medida: "kg",
    stock_actual: 0,
    stock_minimo: 0,
    precio_compra: 0,
    proveedor: "",
    ubicacion: ""
  });
  const [movimientoForm, setMovimientoForm] = useState({
    tipo_movimiento: "entrada",
    cantidad: 0,
    motivo: ""
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Obtener negocio_id y usuario_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('negocio_id, id')
        .eq('auth_user_id', user.id)
        .single();

      if (!usuarioData) return;

      setNegocioId(usuarioData.negocio_id);
      setUsuarioId(usuarioData.id);

      // Cargar insumos
      await cargarInsumos(usuarioData.negocio_id);

      // Cargar últimos movimientos
      await cargarMovimientos(usuarioData.negocio_id);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarInsumos = async (negocioId: string) => {
    const { data, error } = await supabase
      .from('insumos')
      .select('*')
      .eq('negocio_id', negocioId)
      .eq('activo', true)
      .order('nombre');

    if (error) {
      console.error('Error cargando insumos:', error);
      return;
    }

    setInsumos(data || []);
  };

  const cargarMovimientos = async (negocioId: string, insumoId?: string) => {
    let query = supabase
      .from('movimientos_inventario')
      .select(`
        *,
        insumos (nombre, unidad_medida),
        usuarios (nombre)
      `)
      .eq('negocio_id', negocioId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (insumoId) {
      query = query.eq('insumo_id', insumoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error cargando movimientos:', error);
      return;
    }

    setMovimientos(data as any || []);
  };

  const agregarInsumo = async () => {
    try {
      if (!nuevoInsumo.nombre || !negocioId) return;

      const { error } = await supabase
        .from('insumos')
        .insert({
          ...nuevoInsumo,
          negocio_id: negocioId
        });

      if (error) throw error;

      await cargarInsumos(negocioId);
      setModalAgregar(false);
      resetFormularioInsumo();
    } catch (error) {
      console.error('Error agregando insumo:', error);
      alert('Error al agregar insumo');
    }
  };

  const editarInsumo = async () => {
    try {
      if (!insumoSeleccionado) return;

      const { error } = await supabase
        .from('insumos')
        .update({
          nombre: nuevoInsumo.nombre,
          categoria: nuevoInsumo.categoria,
          unidad_medida: nuevoInsumo.unidad_medida,
          stock_minimo: nuevoInsumo.stock_minimo,
          precio_compra: nuevoInsumo.precio_compra,
          proveedor: nuevoInsumo.proveedor,
          ubicacion: nuevoInsumo.ubicacion
        })
        .eq('id', insumoSeleccionado.id);

      if (error) throw error;

      await cargarInsumos(negocioId);
      setModalEditar(false);
      setInsumoSeleccionado(null);
      resetFormularioInsumo();
    } catch (error) {
      console.error('Error editando insumo:', error);
      alert('Error al editar insumo');
    }
  };

  const eliminarInsumo = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este insumo?')) return;

    try {
      const { error } = await supabase
        .from('insumos')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;

      await cargarInsumos(negocioId);
    } catch (error) {
      console.error('Error eliminando insumo:', error);
      alert('Error al eliminar insumo');
    }
  };

  const registrarMovimiento = async () => {
    try {
      if (!insumoSeleccionado || !movimientoForm.cantidad) return;

      const cantidad = movimientoForm.tipo_movimiento === 'entrada' 
        ? Math.abs(movimientoForm.cantidad)
        : -Math.abs(movimientoForm.cantidad);

      const stockAnterior = insumoSeleccionado.stock_actual;
      const stockNuevo = stockAnterior + cantidad;

      if (stockNuevo < 0) {
        alert('El stock no puede ser negativo');
        return;
      }

      const { error } = await supabase
        .from('movimientos_inventario')
        .insert({
          insumo_id: insumoSeleccionado.id,
          tipo_movimiento: movimientoForm.tipo_movimiento,
          cantidad: cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          motivo: movimientoForm.motivo || null,
          usuario_id: usuarioId,
          negocio_id: negocioId
        });

      if (error) throw error;

      await cargarInsumos(negocioId);
      await cargarMovimientos(negocioId);
      setModalMovimiento(false);
      setInsumoSeleccionado(null);
      resetFormularioMovimiento();
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      alert('Error al registrar movimiento');
    }
  };

  const abrirModalEditar = (insumo: Insumo) => {
    setInsumoSeleccionado(insumo);
    setNuevoInsumo({
      nombre: insumo.nombre,
      categoria: insumo.categoria,
      unidad_medida: insumo.unidad_medida,
      stock_actual: insumo.stock_actual,
      stock_minimo: insumo.stock_minimo,
      precio_compra: insumo.precio_compra,
      proveedor: insumo.proveedor || "",
      ubicacion: insumo.ubicacion || ""
    });
    setModalEditar(true);
  };

  const abrirModalMovimiento = (insumo: Insumo, tipo: string) => {
    setInsumoSeleccionado(insumo);
    setMovimientoForm({
      tipo_movimiento: tipo,
      cantidad: 0,
      motivo: ""
    });
    setModalMovimiento(true);
  };

  const abrirHistorial = async (insumo: Insumo) => {
    setInsumoSeleccionado(insumo);
    await cargarMovimientos(negocioId, insumo.id);
    setModalHistorial(true);
  };

  const resetFormularioInsumo = () => {
    setNuevoInsumo({
      nombre: "",
      categoria: "Otros",
      unidad_medida: "kg",
      stock_actual: 0,
      stock_minimo: 0,
      precio_compra: 0,
      proveedor: "",
      ubicacion: ""
    });
  };

  const resetFormularioMovimiento = () => {
    setMovimientoForm({
      tipo_movimiento: "entrada",
      cantidad: 0,
      motivo: ""
    });
  };

  // Filtros
  const insumosFiltrados = insumos.filter(insumo => {
    const matchBusqueda = insumo.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = filtroCategoria === "todas" || insumo.categoria === filtroCategoria;
    const matchAlerta = !mostrarSoloAlertas || insumo.stock_actual < insumo.stock_minimo;
    
    return matchBusqueda && matchCategoria && matchAlerta;
  });

  // Métricas
  const insumosConAlerta = insumos.filter(i => i.stock_actual < i.stock_minimo);
  const valorTotalInventario = insumos.reduce((sum, i) => sum + (i.stock_actual * i.precio_compra), 0);

  const obtenerIconoCategoria = (categoria: string) => {
    const iconos: { [key: string]: string } = {
      "Carnes": "🥩",
      "Lácteos": "🧀",
      "Verduras": "🥬",
      "Granos": "🌾",
      "Empaques": "📦",
      "Bebidas": "🥤",
      "Condimentos": "🧂",
      "Otros": "📋"
    };
    return iconos[categoria] || "📦";
  };

  const obtenerColorTipoMovimiento = (tipo: string) => {
    const colores: { [key: string]: string } = {
      "entrada": "text-green-600 bg-green-50",
      "salida": "text-red-600 bg-red-50",
      "ajuste": "text-blue-600 bg-blue-50",
      "merma": "text-gray-600 bg-gray-50"
    };
    return colores[tipo] || "text-gray-600 bg-gray-50";
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Inventario
              </h1>
              <p className="text-zinc-600 text-sm">
                Gestión de insumos y materias primas
              </p>
            </div>
          </div>

          <Button
            onClick={() => setModalAgregar(true)}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/30"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar Insumo
          </Button>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Total Insumos */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Total Insumos
                </CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {insumos.length}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Activos
              </p>
            </CardContent>
          </Card>

          {/* Valor Total */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Valor Total
                </CardTitle>
                <div className="bg-zinc-900 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-900">
                ${Math.round(valorTotalInventario).toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Inventario
              </p>
            </CardContent>
          </Card>

          {/* Alertas de Stock */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Alertas de Stock
                </CardTitle>
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {insumosConAlerta.length}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Stock bajo
              </p>
            </CardContent>
          </Card>

          {/* Últimos Movimientos */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Movimientos
                </CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {movimientos.length}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Registrados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alertas de Stock Bajo */}
        {insumosConAlerta.length > 0 && (
          <Card className="mb-6 border-2 border-red-200 bg-red-50">
            <CardHeader className="bg-red-100 border-b border-red-200">
              <CardTitle className="flex items-center gap-2 text-lg text-red-900">
                <AlertTriangle className="w-5 h-5" />
                ⚠️ Insumos con Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {insumosConAlerta.map(insumo => (
                  <div
                    key={insumo.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{obtenerIconoCategoria(insumo.categoria)}</span>
                      <div>
                        <p className="font-semibold text-zinc-900">{insumo.nombre}</p>
                        <p className="text-sm text-zinc-600">
                          Stock actual: <span className="font-bold text-red-600">{insumo.stock_actual} {insumo.unidad_medida}</span>
                          {" / "}
                          Mínimo: {insumo.stock_minimo} {insumo.unidad_medida}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => abrirModalMovimiento(insumo, 'entrada')}
                      size="sm"
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Reabastecer
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card className="mb-6 border-2 border-zinc-200">
          <CardHeader className="bg-zinc-50 border-b border-zinc-200">
            <CardTitle className="flex items-center gap-2 text-lg text-zinc-900">
              <Filter className="w-5 h-5 text-orange-500" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              
              {/* Buscar */}
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Buscar insumo..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10 border-zinc-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Filtro Categoría */}
              <div className="w-48">
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full h-10 px-3 border border-zinc-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="todas">Todas las categorías</option>
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{obtenerIconoCategoria(cat)} {cat}</option>
                  ))}
                </select>
              </div>

              {/* Mostrar solo alertas */}
              <Button
                onClick={() => setMostrarSoloAlertas(!mostrarSoloAlertas)}
                variant={mostrarSoloAlertas ? "default" : "outline"}
                className={mostrarSoloAlertas 
                  ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
                }
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {mostrarSoloAlertas ? 'Mostrando alertas' : 'Solo alertas'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Insumos */}
        <Card className="border-2 border-zinc-200">
          <CardHeader className="bg-zinc-50 border-b border-zinc-200">
            <CardTitle className="flex items-center gap-2 text-lg text-zinc-900">
              <Package className="w-5 h-5 text-orange-500" />
              Todos los Insumos ({insumosFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {insumosFiltrados.length > 0 ? (
              <div className="space-y-3">
                {insumosFiltrados.map(insumo => {
                  const stockBajo = insumo.stock_actual < insumo.stock_minimo;
                  
                  return (
                    <div
                      key={insumo.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        stockBajo 
                          ? 'bg-red-50 border-red-200 hover:border-red-300' 
                          : 'bg-zinc-50 border-zinc-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        
                        {/* Info del insumo */}
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-3xl">{obtenerIconoCategoria(insumo.categoria)}</span>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg text-zinc-900">{insumo.nombre}</h3>
                              {stockBajo && (
                                <Badge className="bg-red-500 hover:bg-red-600 text-white">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Stock bajo
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-2 text-sm mt-2">
                              {/* Primera fila: Stock */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-zinc-500 text-xs block mb-1">Stock actual:</span>
                                  <p className={`font-bold ${stockBajo ? 'text-red-600' : 'text-orange-600'}`}>
                                    {insumo.stock_actual} {insumo.unidad_medida}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-zinc-500 text-xs block mb-1">Stock mínimo:</span>
                                  <p className="font-bold text-zinc-900">
                                    {insumo.stock_minimo} {insumo.unidad_medida}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Segunda fila: Precio y Categoría */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="min-w-0">
                                  <span className="text-zinc-500 text-xs block mb-1">Precio:</span>
                                  <p className="font-bold text-zinc-900 text-xs break-all">
                                    ${insumo.precio_compra.toLocaleString()}/{insumo.unidad_medida}
                                  </p>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-zinc-500 text-xs block mb-1">Categoría:</span>
                                  <p className="font-bold text-zinc-900 text-xs break-words">{insumo.categoria}</p>
                                </div>
                              </div>
                            </div>

                            {insumo.proveedor && (
                              <p className="text-xs text-zinc-500 mt-2">
                                Proveedor: {insumo.proveedor}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => abrirModalMovimiento(insumo, 'entrada')}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                              title="Registrar entrada"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => abrirModalMovimiento(insumo, 'salida')}
                              size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white"
                              title="Registrar salida"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => abrirHistorial(insumo)}
                              size="sm"
                              variant="outline"
                              className="border-zinc-300 hover:bg-zinc-100"
                              title="Ver historial"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => abrirModalEditar(insumo)}
                              size="sm"
                              variant="outline"
                              className="border-zinc-300 hover:bg-zinc-100 flex-1"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              onClick={() => eliminarInsumo(insumo.id)}
                              size="sm"
                              variant="outline"
                              className="border-red-300 hover:bg-red-50 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-900 mb-2">
                  No hay insumos
                </h3>
                <p className="text-zinc-600">
                  {busqueda || filtroCategoria !== "todas" || mostrarSoloAlertas
                    ? "No se encontraron insumos con los filtros aplicados"
                    : "Agrega tu primer insumo para comenzar"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* MODAL: Agregar Insumo */}
        {modalAgregar && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl border-2 border-zinc-200 max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-zinc-50 border-b border-zinc-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Plus className="w-6 h-6 text-orange-500" />
                    Agregar Insumo
                  </CardTitle>
                  <Button
                    onClick={() => {
                      setModalAgregar(false);
                      resetFormularioInsumo();
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="sm:col-span-2">
                    <Label>Nombre del Insumo *</Label>
                    <Input
                      value={nuevoInsumo.nombre}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, nombre: e.target.value})}
                      placeholder="Ej: Queso Mozzarella"
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <Label>Categoría *</Label>
                    <select
                      value={nuevoInsumo.categoria}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, categoria: e.target.value})}
                      className="w-full h-10 px-3 border border-zinc-300 rounded-md focus:ring-2 focus:ring-orange-500"
                    >
                      {CATEGORIAS.map(cat => (
                        <option key={cat} value={cat}>{obtenerIconoCategoria(cat)} {cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unidad de Medida */}
                  <div>
                    <Label>Unidad de Medida *</Label>
                    <select
                      value={nuevoInsumo.unidad_medida}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, unidad_medida: e.target.value})}
                      className="w-full h-10 px-3 border border-zinc-300 rounded-md focus:ring-2 focus:ring-orange-500"
                    >
                      {UNIDADES_MEDIDA.map(unidad => (
                        <option key={unidad} value={unidad}>{unidad}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stock Inicial */}
                  <div>
                    <Label>Stock Inicial *</Label>
                    <Input
                      type="number"
                      value={nuevoInsumo.stock_actual}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, stock_actual: parseFloat(e.target.value) || 0})}
                      placeholder="0"
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Stock Mínimo */}
                  <div>
                    <Label>Stock Mínimo *</Label>
                    <Input
                      type="number"
                      value={nuevoInsumo.stock_minimo}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, stock_minimo: parseFloat(e.target.value) || 0})}
                      placeholder="0"
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Precio de Compra */}
                  <div>
                    <Label>Precio de Compra *</Label>
                    <Input
                      type="number"
                      value={nuevoInsumo.precio_compra}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, precio_compra: parseFloat(e.target.value) || 0})}
                      placeholder="0"
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Proveedor */}
                  <div>
                    <Label>Proveedor (opcional)</Label>
                    <Input
                      value={nuevoInsumo.proveedor}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, proveedor: e.target.value})}
                      placeholder="Nombre del proveedor"
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Ubicación */}
                  <div className="sm:col-span-2">
                    <Label>Ubicación (opcional)</Label>
                    <Input
                      value={nuevoInsumo.ubicacion}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, ubicacion: e.target.value})}
                      placeholder="Ej: Nevera 1, Bodega, Estante 3"
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setModalAgregar(false);
                      resetFormularioInsumo();
                    }}
                    variant="outline"
                    className="border-zinc-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={agregarInsumo}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Insumo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL: Editar Insumo */}
        {modalEditar && insumoSeleccionado && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl border-2 border-zinc-200 max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-zinc-50 border-b border-zinc-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Edit className="w-6 h-6 text-orange-500" />
                    Editar Insumo
                  </CardTitle>
                  <Button
                    onClick={() => {
                      setModalEditar(false);
                      setInsumoSeleccionado(null);
                      resetFormularioInsumo();
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="sm:col-span-2">
                    <Label>Nombre del Insumo *</Label>
                    <Input
                      value={nuevoInsumo.nombre}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, nombre: e.target.value})}
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <Label>Categoría *</Label>
                    <select
                      value={nuevoInsumo.categoria}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, categoria: e.target.value})}
                      className="w-full h-10 px-3 border border-zinc-300 rounded-md focus:ring-2 focus:ring-orange-500"
                    >
                      {CATEGORIAS.map(cat => (
                        <option key={cat} value={cat}>{obtenerIconoCategoria(cat)} {cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unidad de Medida */}
                  <div>
                    <Label>Unidad de Medida *</Label>
                    <select
                      value={nuevoInsumo.unidad_medida}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, unidad_medida: e.target.value})}
                      className="w-full h-10 px-3 border border-zinc-300 rounded-md focus:ring-2 focus:ring-orange-500"
                    >
                      {UNIDADES_MEDIDA.map(unidad => (
                        <option key={unidad} value={unidad}>{unidad}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stock Actual (solo lectura) */}
                  <div>
                    <Label>Stock Actual (solo lectura)</Label>
                    <Input
                      type="number"
                      value={insumoSeleccionado.stock_actual}
                      disabled
                      className="border-zinc-300 bg-zinc-100"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Usa entradas/salidas para modificar el stock
                    </p>
                  </div>

                  {/* Stock Mínimo */}
                  <div>
                    <Label>Stock Mínimo *</Label>
                    <Input
                      type="number"
                      value={nuevoInsumo.stock_minimo}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, stock_minimo: parseFloat(e.target.value) || 0})}
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Precio de Compra */}
                  <div>
                    <Label>Precio de Compra *</Label>
                    <Input
                      type="number"
                      value={nuevoInsumo.precio_compra}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, precio_compra: parseFloat(e.target.value) || 0})}
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Proveedor */}
                  <div>
                    <Label>Proveedor (opcional)</Label>
                    <Input
                      value={nuevoInsumo.proveedor}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, proveedor: e.target.value})}
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Ubicación */}
                  <div className="sm:col-span-2">
                    <Label>Ubicación (opcional)</Label>
                    <Input
                      value={nuevoInsumo.ubicacion}
                      onChange={(e) => setNuevoInsumo({...nuevoInsumo, ubicacion: e.target.value})}
                      className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setModalEditar(false);
                      setInsumoSeleccionado(null);
                      resetFormularioInsumo();
                    }}
                    variant="outline"
                    className="border-zinc-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={editarInsumo}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL: Registrar Movimiento */}
        {modalMovimiento && insumoSeleccionado && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg border-2 border-zinc-200">
              <CardHeader className="bg-zinc-50 border-b border-zinc-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    {movimientoForm.tipo_movimiento === 'entrada' && <ArrowUp className="w-6 h-6 text-green-500" />}
                    {movimientoForm.tipo_movimiento === 'salida' && <ArrowDown className="w-6 h-6 text-red-500" />}
                    {movimientoForm.tipo_movimiento === 'ajuste' && <Settings className="w-6 h-6 text-blue-500" />}
                    Registrar {movimientoForm.tipo_movimiento}
                  </CardTitle>
                  <Button
                    onClick={() => {
                      setModalMovimiento(false);
                      setInsumoSeleccionado(null);
                      resetFormularioMovimiento();
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                {/* Info del insumo */}
                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{obtenerIconoCategoria(insumoSeleccionado.categoria)}</span>
                    <div>
                      <h3 className="font-bold text-lg">{insumoSeleccionado.nombre}</h3>
                      <p className="text-sm text-zinc-600">
                        Stock actual: <span className="font-bold text-orange-600">
                          {insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tipo de movimiento */}
                <div>
                  <Label>Tipo de Movimiento *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {TIPOS_MOVIMIENTO.map(tipo => (
                      <button
                        key={tipo.value}
                        onClick={() => setMovimientoForm({...movimientoForm, tipo_movimiento: tipo.value})}
                        className={`p-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                          movimientoForm.tipo_movimiento === tipo.value
                            ? `${tipo.color} border-current`
                            : 'border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {tipo.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cantidad */}
                <div>
                  <Label>Cantidad *</Label>
                  <Input
                    type="number"
                    value={movimientoForm.cantidad || ''}
                    onChange={(e) => setMovimientoForm({...movimientoForm, cantidad: parseFloat(e.target.value) || 0})}
                    placeholder={`Cantidad en ${insumoSeleccionado.unidad_medida}`}
                    className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Motivo */}
                <div>
                  <Label>Motivo (opcional)</Label>
                  <Input
                    value={movimientoForm.motivo}
                    onChange={(e) => setMovimientoForm({...movimientoForm, motivo: e.target.value})}
                    placeholder="Ej: Compra a proveedor, Producción del día, etc."
                    className="border-zinc-300 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Preview del nuevo stock */}
                {movimientoForm.cantidad > 0 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm font-semibold text-orange-900 mb-1">
                      Nuevo stock:
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {movimientoForm.tipo_movimiento === 'entrada'
                        ? insumoSeleccionado.stock_actual + movimientoForm.cantidad
                        : insumoSeleccionado.stock_actual - movimientoForm.cantidad
                      } {insumoSeleccionado.unidad_medida}
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      {movimientoForm.tipo_movimiento === 'entrada' ? '📥 +' : '📤 -'}
                      {movimientoForm.cantidad} {insumoSeleccionado.unidad_medida}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setModalMovimiento(false);
                      setInsumoSeleccionado(null);
                      resetFormularioMovimiento();
                    }}
                    variant="outline"
                    className="border-zinc-300"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={registrarMovimiento}
                    disabled={!movimientoForm.cantidad || movimientoForm.cantidad <= 0}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Registrar Movimiento
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL: Historial de Movimientos */}
        {modalHistorial && insumoSeleccionado && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl border-2 border-zinc-200 max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-zinc-50 border-b border-zinc-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <History className="w-6 h-6 text-orange-500" />
                    Historial de Movimientos
                  </CardTitle>
                  <Button
                    onClick={() => {
                      setModalHistorial(false);
                      setInsumoSeleccionado(null);
                      cargarMovimientos(negocioId);
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                
                {/* Info del insumo */}
                <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{obtenerIconoCategoria(insumoSeleccionado.categoria)}</span>
                    <div>
                      <h3 className="font-bold text-lg">{insumoSeleccionado.nombre}</h3>
                      <p className="text-sm text-zinc-600">
                        Stock actual: <span className="font-bold text-orange-600">
                          {insumoSeleccionado.stock_actual} {insumoSeleccionado.unidad_medida}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de movimientos */}
                {movimientos.length > 0 ? (
                  <div className="space-y-3">
                    {movimientos.map(mov => (
                      <div
                        key={mov.id}
                        className="p-4 bg-white rounded-lg border-2 border-zinc-200 hover:border-orange-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={obtenerColorTipoMovimiento(mov.tipo_movimiento)}>
                                {mov.tipo_movimiento === 'entrada' && '📥 Entrada'}
                                {mov.tipo_movimiento === 'salida' && '📤 Salida'}
                                {mov.tipo_movimiento === 'ajuste' && '⚙️ Ajuste'}
                                {mov.tipo_movimiento === 'merma' && '💀 Merma'}
                              </Badge>
                              <span className="text-sm text-zinc-500">
                                {formatearFecha(mov.created_at)}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-zinc-500">Cantidad:</span>
                                <p className={`font-bold ${mov.cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {mov.cantidad > 0 ? '+' : ''}{mov.cantidad} {mov.insumos.unidad_medida}
                                </p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Stock anterior:</span>
                                <p className="font-bold text-zinc-900">
                                  {mov.stock_anterior} {mov.insumos.unidad_medida}
                                </p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Stock nuevo:</span>
                                <p className="font-bold text-orange-600">
                                  {mov.stock_nuevo} {mov.insumos.unidad_medida}
                                </p>
                              </div>
                            </div>

                            {mov.motivo && (
                              <p className="text-sm text-zinc-600 mt-2 italic">
                                Motivo: {mov.motivo}
                              </p>
                            )}

                            {mov.usuarios && (
                              <p className="text-xs text-zinc-500 mt-2">
                                Por: {mov.usuarios.nombre}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-zinc-900 mb-2">
                      Sin movimientos
                    </h3>
                    <p className="text-zinc-600">
                      No hay movimientos registrados para este insumo
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}