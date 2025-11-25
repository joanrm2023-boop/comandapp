"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Loader2, CheckCircle, XCircle, AlertCircle, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Tipos
interface Pedido {
  id: string;
  mesa_id: string;
  mesero_id: string | null;
  estado: string;
  total: number;
  notas: string | null;
  es_domicilio: boolean;              
  direccion_domicilio: string | null; 
  valor_domicilio: number;  
  created_at: string;
  mesas: {
    numero: string;
  };
  usuarios: {
    nombre: string;
  } | null;
  detalle_pedidos: Array<{
    id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    productos: {
      nombre: string;
    };
  }>;
}

const estadosConfig = {
  pendiente: { label: "Pendiente", color: "bg-yellow-500", icon: AlertCircle },
  en_preparacion: { label: "En Preparación", color: "bg-orange-500", icon: Package },
  listo: { label: "Listo", color: "bg-green-500", icon: CheckCircle },
  entregado: { label: "Entregado", color: "bg-gray-500", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "bg-red-500", icon: XCircle }
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    pendientes: true,
    enProceso: true,
    entregados: false,
    cancelados: false
  });

  useEffect(() => {
    cargarPedidos();
    
    const subscription = supabase
      .channel('pedidos-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          cargarPedidos();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const cargarPedidos = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          mesas (numero),
          usuarios (nombre),
          detalle_pedidos (
            id,
            cantidad,
            precio_unitario,
            subtotal,
            productos (nombre)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setPedidos(data as any || []);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (pedidoId: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', pedidoId);

      if (error) throw error;

      if (nuevoEstado === 'entregado' || nuevoEstado === 'cancelado') {
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (pedido) {
          await supabase
            .from('mesas')
            .update({ estado: 'libre' })
            .eq('id', pedido.mesa_id);
        }
      }

      await cargarPedidos();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar el estado del pedido');
    }
  };

  const pedidosFiltrados = pedidos.filter(pedido => {
    if (filtroEstado === 'todos') return true;
    return pedido.estado === filtroEstado;
  });

  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const obtenerSiguienteEstado = (estadoActual: string) => {
    const flujo = {
      'pendiente': 'en_preparacion',
      'en_preparacion': 'listo',
      'listo': 'entregado'
    };
    return flujo[estadoActual as keyof typeof flujo];
  };

  const obtenerTextoBoton = (estadoActual: string) => {
    const textos = {
      'pendiente': 'Iniciar Preparación',
      'en_preparacion': 'Marcar como Listo',
      'listo': 'Marcar como Entregado'
    };
    return textos[estadoActual as keyof typeof textos];
  };

  const toggleSeccion = (seccion: keyof typeof seccionesAbiertas) => {
    setSeccionesAbiertas(prev => ({
      ...prev,
      [seccion]: !prev[seccion]
    }));
  };

  const pedidosAgrupados = {
    pendientes: pedidosFiltrados.filter(p => p.estado === 'pendiente'),
    enPreparacion: pedidosFiltrados.filter(p => p.estado === 'en_preparacion'),
    listos: pedidosFiltrados.filter(p => p.estado === 'listo'),
    entregados: pedidosFiltrados.filter(p => p.estado === 'entregado'),
    cancelados: pedidosFiltrados.filter(p => p.estado === 'cancelado')
  };

  const enProceso = [...pedidosAgrupados.enPreparacion, ...pedidosAgrupados.listos];

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
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Pedidos
              </h1>
              <p className="text-gray-600 text-sm">
                {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
          </div>

          {/* Filtro por estado */}
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-full sm:w-64 h-12 border-gray-200 focus:ring-2 focus:ring-purple-500">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">📋 Todos los pedidos</SelectItem>
              <SelectItem value="pendiente">🟡 Pendientes</SelectItem>
              <SelectItem value="en_preparacion">🟠 En Preparación</SelectItem>
              <SelectItem value="listo">🟢 Listos</SelectItem>
              <SelectItem value="entregado">⚪ Entregados</SelectItem>
              <SelectItem value="cancelado">🔴 Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de pedidos */}
        <div className="space-y-6">
          {/* PENDIENTES - Siempre visible */}
          <div>
            <div className="flex items-center gap-3 mb-4 bg-yellow-100 border-2 border-yellow-400 rounded-xl p-4 shadow-md">
              <div className="bg-yellow-500 p-2 rounded-lg">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-yellow-800">
                PENDIENTES ({pedidosAgrupados.pendientes.length})
              </h2>
            </div>
            
            {pedidosAgrupados.pendientes.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pedidosAgrupados.pendientes.map((pedido) => {
                  const estadoConfig = estadosConfig[pedido.estado as keyof typeof estadosConfig];
                  const IconoEstado = estadoConfig?.icon || AlertCircle;
                  const siguienteEstado = obtenerSiguienteEstado(pedido.estado);

                  return (
                    <Card key={pedido.id} className="hover:shadow-xl transition-all duration-300 border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-3 rounded-xl">
                              <span className="text-2xl font-bold text-purple-600">
                                {pedido.mesas.numero}
                              </span>
                            </div>
                            <div>
                              <CardTitle className="text-lg">Mesa {pedido.mesas.numero}</CardTitle>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <Clock className="w-4 h-4" />
                                {formatearHora(pedido.created_at)}
                              </div>
                            </div>
                          </div>
                          <Badge className={`${estadoConfig?.color} text-white flex items-center gap-1`}>
                            <IconoEstado className="w-3 h-3" />
                            {estadoConfig?.label}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {pedido.usuarios && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                            <User className="w-4 h-4" />
                            <span>Mesero: <strong>{pedido.usuarios.nombre}</strong></span>
                          </div>
                        )}

                        <div className="space-y-2">
                          {pedido.detalle_pedidos.map((detalle) => (
                            <div key={detalle.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                              <span className="text-gray-700">
                                <strong className="text-purple-600">{detalle.cantidad}x</strong> {detalle.productos.nombre}
                              </span>
                              <span className="font-semibold text-gray-800">
                                ${Number(detalle.subtotal).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Información de domicilio */}
                          {pedido.es_domicilio && (
                            <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 space-y-1">
                              <div className="flex items-center gap-2 text-orange-800 font-semibold">
                                <span className="text-lg">🏠</span>
                                <span>PEDIDO A DOMICILIO</span>
                              </div>
                              {pedido.direccion_domicilio && (
                                <p className="text-xs text-gray-700">
                                  <strong>Dirección:</strong> {pedido.direccion_domicilio}
                                </p>
                              )}
                              <p className="text-xs text-orange-700 font-semibold">
                                Costo envío: ${Number(pedido.valor_domicilio || 0).toLocaleString()}
                              </p>
                            </div>
                          )}

                          {/* Notas generales */}
                          {pedido.notas && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <p className="text-xs text-yellow-800">
                                <strong>Nota:</strong> {pedido.notas}
                              </p>
                            </div>
                          )}

                        <div className="pt-3 border-t-2 border-gray-200">
                          {pedido.es_domicilio ? (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-gray-600 text-sm">
                                <span>Subtotal productos:</span>
                                <span className="font-semibold">
                                  ${Number(pedido.total - (pedido.valor_domicilio || 0)).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-orange-600 text-sm">
                                <span>Domicilio:</span>
                                <span className="font-semibold">
                                  ${Number(pedido.valor_domicilio || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                                <span className="text-lg font-bold text-gray-700">TOTAL:</span>
                                <span className="text-2xl font-bold text-green-700">
                                  ${Number(pedido.total).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-700">TOTAL:</span>
                              <span className="text-2xl font-bold text-green-700">
                                ${Number(pedido.total).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          {siguienteEstado && (
                            <Button
                              onClick={() => cambiarEstado(pedido.id, siguienteEstado)}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            >
                              {obtenerTextoBoton(pedido.estado)}
                            </Button>
                          )}
                          
                          {pedido.estado !== 'cancelado' && pedido.estado !== 'entregado' && (
                            <Button
                              variant="destructive"
                              onClick={() => cambiarEstado(pedido.id, 'cancelado')}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-yellow-300">
                <p className="text-gray-500">No hay pedidos pendientes</p>
              </div>
            )}
          </div>

          {/* EN PROCESO - Desplegable */}
          <div className="border-t-4 border-gray-300 pt-6">
            <button
              onClick={() => toggleSeccion('enProceso')}
              className="flex items-center justify-between w-full bg-orange-100 border-2 border-orange-400 rounded-xl p-4 shadow-md hover:bg-orange-200 transition-colors mb-4"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-2 rounded-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-orange-800">
                  EN PROCESO ({enProceso.length})
                </h2>
              </div>
              <span className="text-2xl text-orange-600">
                {seccionesAbiertas.enProceso ? '▼' : '▶'}
              </span>
            </button>
            
            {seccionesAbiertas.enProceso && (
              enProceso.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {enProceso.map((pedido) => {
                    const estadoConfig = estadosConfig[pedido.estado as keyof typeof estadosConfig];
                    const IconoEstado = estadoConfig?.icon || AlertCircle;
                    const siguienteEstado = obtenerSiguienteEstado(pedido.estado);

                    return (
                      <Card key={pedido.id} className="hover:shadow-xl transition-all duration-300 border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-3 rounded-xl">
                                <span className="text-2xl font-bold text-purple-600">
                                  {pedido.mesas.numero}
                                </span>
                              </div>
                              <div>
                                <CardTitle className="text-lg">Mesa {pedido.mesas.numero}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                  <Clock className="w-4 h-4" />
                                  {formatearHora(pedido.created_at)}
                                </div>
                              </div>
                            </div>
                            <Badge className={`${estadoConfig?.color} text-white flex items-center gap-1`}>
                              <IconoEstado className="w-3 h-3" />
                              {estadoConfig?.label}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {pedido.usuarios && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                              <User className="w-4 h-4" />
                              <span>Mesero: <strong>{pedido.usuarios.nombre}</strong></span>
                            </div>
                          )}

                          <div className="space-y-2">
                            {pedido.detalle_pedidos.map((detalle) => (
                              <div key={detalle.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                                <span className="text-gray-700">
                                  <strong className="text-purple-600">{detalle.cantidad}x</strong> {detalle.productos.nombre}
                                </span>
                                <span className="font-semibold text-gray-800">
                                  ${Number(detalle.subtotal).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Información de domicilio */}
                            {pedido.es_domicilio && (
                              <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 space-y-1">
                                <div className="flex items-center gap-2 text-orange-800 font-semibold">
                                  <span className="text-lg">🏠</span>
                                  <span>PEDIDO A DOMICILIO</span>
                                </div>
                                {pedido.direccion_domicilio && (
                                  <p className="text-xs text-gray-700">
                                    <strong>Dirección:</strong> {pedido.direccion_domicilio}
                                  </p>
                                )}
                                <p className="text-xs text-orange-700 font-semibold">
                                  Costo envío: ${Number(pedido.valor_domicilio || 0).toLocaleString()}
                                </p>
                              </div>
                            )}

                            {/* Notas generales */}
                            {pedido.notas && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-xs text-yellow-800">
                                  <strong>Nota:</strong> {pedido.notas}
                                </p>
                              </div>
                            )}

                          <div className="pt-3 border-t-2 border-gray-200">
                            {pedido.es_domicilio ? (
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-gray-600 text-sm">
                                  <span>Subtotal productos:</span>
                                  <span className="font-semibold">
                                    ${Number(pedido.total - (pedido.valor_domicilio || 0)).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-orange-600 text-sm">
                                  <span>Domicilio:</span>
                                  <span className="font-semibold">
                                    ${Number(pedido.valor_domicilio || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                                  <span className="text-lg font-bold text-gray-700">TOTAL:</span>
                                  <span className="text-2xl font-bold text-green-700">
                                    ${Number(pedido.total).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-700">TOTAL:</span>
                                <span className="text-2xl font-bold text-green-700">
                                  ${Number(pedido.total).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2">
                            {siguienteEstado && (
                              <Button
                                onClick={() => cambiarEstado(pedido.id, siguienteEstado)}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                              >
                                {obtenerTextoBoton(pedido.estado)}
                              </Button>
                            )}
                            
                            {pedido.estado !== 'cancelado' && pedido.estado !== 'entregado' && (
                              <Button
                                variant="destructive"
                                onClick={() => cambiarEstado(pedido.id, 'cancelado')}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-orange-300">
                  <p className="text-gray-500">No hay pedidos en proceso</p>
                </div>
              )
            )}
          </div>

          {/* ENTREGADOS - Desplegable */}
          <div className="border-t-4 border-gray-300 pt-6">
            <button
              onClick={() => toggleSeccion('entregados')}
              className="flex items-center justify-between w-full bg-green-100 border-2 border-green-400 rounded-xl p-4 shadow-md hover:bg-green-200 transition-colors mb-4"
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-green-800">
                  ENTREGADOS ({pedidosAgrupados.entregados.length})
                </h2>
              </div>
              <span className="text-2xl text-green-600">
                {seccionesAbiertas.entregados ? '▼' : '▶'}
              </span>
            </button>
            
            {seccionesAbiertas.entregados && (
              pedidosAgrupados.entregados.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pedidosAgrupados.entregados.map((pedido) => {
                    const estadoConfig = estadosConfig[pedido.estado as keyof typeof estadosConfig];
                    const IconoEstado = estadoConfig?.icon || AlertCircle;

                    return (
                      <Card key={pedido.id} className="hover:shadow-xl transition-all duration-300 border-2 opacity-75">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-3 rounded-xl">
                                <span className="text-2xl font-bold text-purple-600">
                                  {pedido.mesas.numero}
                                </span>
                              </div>
                              <div>
                                <CardTitle className="text-lg">Mesa {pedido.mesas.numero}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                  <Clock className="w-4 h-4" />
                                  {formatearHora(pedido.created_at)}
                                </div>
                              </div>
                            </div>
                            <Badge className={`${estadoConfig?.color} text-white flex items-center gap-1`}>
                              <IconoEstado className="w-3 h-3" />
                              {estadoConfig?.label}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {pedido.usuarios && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                              <User className="w-4 h-4" />
                              <span>Mesero: <strong>{pedido.usuarios.nombre}</strong></span>
                            </div>
                          )}

                          <div className="space-y-2">
                            {pedido.detalle_pedidos.map((detalle) => (
                              <div key={detalle.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                                <span className="text-gray-700">
                                  <strong className="text-purple-600">{detalle.cantidad}x</strong> {detalle.productos.nombre}
                                </span>
                                <span className="font-semibold text-gray-800">
                                  ${Number(detalle.subtotal).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-3 border-t-2 border-gray-200">
                            {pedido.es_domicilio ? (
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-gray-600 text-sm">
                                  <span>Subtotal productos:</span>
                                  <span className="font-semibold">
                                    ${Number(pedido.total - (pedido.valor_domicilio || 0)).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-orange-600 text-sm">
                                  <span>Domicilio:</span>
                                  <span className="font-semibold">
                                    ${Number(pedido.valor_domicilio || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                                  <span className="text-lg font-bold text-gray-700">TOTAL:</span>
                                  <span className="text-2xl font-bold text-green-700">
                                    ${Number(pedido.total).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-700">TOTAL:</span>
                                <span className="text-2xl font-bold text-green-700">
                                  ${Number(pedido.total).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-green-300">
                  <p className="text-gray-500">No hay pedidos entregados</p>
                </div>
              )
            )}
          </div>

          {/* CANCELADOS - Desplegable */}
          <div className="border-t-4 border-gray-300 pt-6">
            <button
              onClick={() => toggleSeccion('cancelados')}
              className="flex items-center justify-between w-full bg-red-100 border-2 border-red-400 rounded-xl p-4 shadow-md hover:bg-red-200 transition-colors mb-4"
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-2 rounded-lg">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-red-800">
                  CANCELADOS ({pedidosAgrupados.cancelados.length})
                </h2>
              </div>
              <span className="text-2xl text-red-600">
                {seccionesAbiertas.cancelados ? '▼' : '▶'}
              </span>
            </button>
            
            {seccionesAbiertas.cancelados && (
              pedidosAgrupados.cancelados.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pedidosAgrupados.cancelados.map((pedido) => {
                    const estadoConfig = estadosConfig[pedido.estado as keyof typeof estadosConfig];
                    const IconoEstado = estadoConfig?.icon || AlertCircle;

                    return (
                      <Card key={pedido.id} className="hover:shadow-xl transition-all duration-300 border-2 opacity-75">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-3 rounded-xl">
                                <span className="text-2xl font-bold text-purple-600">
                                  {pedido.mesas.numero}
                                </span>
                              </div>
                              <div>
                                <CardTitle className="text-lg">Mesa {pedido.mesas.numero}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                  <Clock className="w-4 h-4" />
                                  {formatearHora(pedido.created_at)}
                                </div>
                              </div>
                            </div>
                            <Badge className={`${estadoConfig?.color} text-white flex items-center gap-1`}>
                              <IconoEstado className="w-3 h-3" />
                              {estadoConfig?.label}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {pedido.usuarios && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                              <User className="w-4 h-4" />
                              <span>Mesero: <strong>{pedido.usuarios.nombre}</strong></span>
                            </div>
                          )}

                          <div className="space-y-2">
                            {pedido.detalle_pedidos.map((detalle) => (
                              <div key={detalle.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                                <span className="text-gray-700">
                                  <strong className="text-purple-600">{detalle.cantidad}x</strong> {detalle.productos.nombre}
                                </span>
                                <span className="font-semibold text-gray-800">
                                  ${Number(detalle.subtotal).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-3 border-t-2 border-gray-200">
                            {pedido.es_domicilio ? (
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-gray-600 text-sm">
                                  <span>Subtotal productos:</span>
                                  <span className="font-semibold">
                                    ${Number(pedido.total - (pedido.valor_domicilio || 0)).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-orange-600 text-sm">
                                  <span>Domicilio:</span>
                                  <span className="font-semibold">
                                    ${Number(pedido.valor_domicilio || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                                  <span className="text-lg font-bold text-gray-700">TOTAL:</span>
                                  <span className="text-2xl font-bold text-green-700">
                                    ${Number(pedido.total).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-700">TOTAL:</span>
                                <span className="text-2xl font-bold text-green-700">
                                  ${Number(pedido.total).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-red-300">
                  <p className="text-gray-500">No hay pedidos cancelados</p>
                </div>
              )
            )}
          </div>

          {/* Mensaje si no hay pedidos en absoluto */}
          {pedidosFiltrados.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-lg mt-6">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No hay pedidos
              </h3>
              <p className="text-gray-500">
                Aún no se han realizado pedidos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}