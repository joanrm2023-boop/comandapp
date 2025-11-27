"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, ShoppingBag, TrendingUp, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Tipos
interface Pedido {
  id: string;
  mesa_id: string;
  estado: string;
  total: number;
  created_at: string;
  mesas: {
    numero: string;
  };
  detalle_pedidos: Array<{
    id: string;
    cantidad: number;
    productos: {
      nombre: string;
    };
  }>;
}

interface ProductoVendido {
  nombre: string;
  cantidad: number;
  total: number;
}

export default function VentasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState("hoy");
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    cargarVentas();
  }, [filtroFecha, fechaInicio, fechaFin]);

  const obtenerRangoFechas = () => {
    const ahora = new Date();
    let inicio = new Date();
    let fin = new Date();

    switch (filtroFecha) {
      case "hoy":
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case "ayer":
        inicio.setDate(ahora.getDate() - 1);
        inicio.setHours(0, 0, 0, 0);
        fin.setDate(ahora.getDate() - 1);
        fin.setHours(23, 59, 59, 999);
        break;
      case "semana":
        inicio.setDate(ahora.getDate() - 7);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case "mes":
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case "personalizado":
        if (fechaInicio && fechaFin) {
          inicio = new Date(fechaInicio);
          inicio.setHours(0, 0, 0, 0);
          fin = new Date(fechaFin);
          fin.setHours(23, 59, 59, 999);
        }
        break;
    }

    return { inicio, fin };
  };

  const cargarVentas = async () => {
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
      const { inicio, fin } = obtenerRangoFechas();

      // Cargar ventas DEL NEGOCIO
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          mesa_id,
          estado,
          total,
          created_at,
          mesas (numero),
          detalle_pedidos (
            id,
            cantidad,
            productos (nombre)
          )
        `)
        .eq('estado', 'entregado')
        .eq('negocio_id', negocioId) // 👈 FILTRAR POR NEGOCIO
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fin.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPedidos(data as any || []);
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = () => {
    const totalVentas = pedidos.reduce((sum, p) => sum + Number(p.total), 0);
    const totalPedidos = pedidos.length;
    const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

    // Calcular pedidos por hora
    const { inicio, fin } = obtenerRangoFechas();
    const horasDiferencia = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);
    const pedidosPorHora = horasDiferencia > 0 ? totalPedidos / horasDiferencia : 0;

    return {
      totalVentas,
      totalPedidos,
      ticketPromedio,
      pedidosPorHora
    };
  };

  const obtenerProductosMasVendidos = (): ProductoVendido[] => {
    const productosMap = new Map<string, ProductoVendido>();

    pedidos.forEach(pedido => {
      pedido.detalle_pedidos.forEach(detalle => {
        const nombre = detalle.productos.nombre;
        const cantidad = detalle.cantidad;

        if (productosMap.has(nombre)) {
          const existing = productosMap.get(nombre)!;
          productosMap.set(nombre, {
            nombre,
            cantidad: existing.cantidad + cantidad,
            total: existing.total + cantidad
          });
        } else {
          productosMap.set(nombre, {
            nombre,
            cantidad,
            total: cantidad
          });
        }
      });
    });

    return Array.from(productosMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
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

  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const metricas = calcularMetricas();
  const topProductos = obtenerProductosMasVendidos();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Ventas
              </h1>
              <p className="text-gray-600 text-sm">
                Análisis de ventas y estadísticas
              </p>
            </div>
          </div>
        </div>

        {/* Filtros de fecha */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-green-200">
          <div className="flex flex-col gap-4">
            {/* Botones rápidos */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filtroFecha === "hoy" ? "default" : "outline"}
                onClick={() => setFiltroFecha("hoy")}
                className={filtroFecha === "hoy" ? "bg-gradient-to-r from-green-500 to-emerald-600" : ""}
              >
                📅 Hoy
              </Button>
              <Button
                variant={filtroFecha === "ayer" ? "default" : "outline"}
                onClick={() => setFiltroFecha("ayer")}
                className={filtroFecha === "ayer" ? "bg-gradient-to-r from-green-500 to-emerald-600" : ""}
              >
                📆 Ayer
              </Button>
              <Button
                variant={filtroFecha === "semana" ? "default" : "outline"}
                onClick={() => setFiltroFecha("semana")}
                className={filtroFecha === "semana" ? "bg-gradient-to-r from-green-500 to-emerald-600" : ""}
              >
                📊 Última semana
              </Button>
              <Button
                variant={filtroFecha === "mes" ? "default" : "outline"}
                onClick={() => setFiltroFecha("mes")}
                className={filtroFecha === "mes" ? "bg-gradient-to-r from-green-500 to-emerald-600" : ""}
              >
                📈 Este mes
              </Button>
              <Button
                variant={filtroFecha === "personalizado" ? "default" : "outline"}
                onClick={() => setFiltroFecha("personalizado")}
                className={filtroFecha === "personalizado" ? "bg-gradient-to-r from-green-500 to-emerald-600" : ""}
              >
                🗓️ Rango personalizado
              </Button>
            </div>

            {/* Selector de rango personalizado */}
            {filtroFecha === "personalizado" && (
              <div className="flex flex-col sm:flex-row gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Ventas */}
          <Card className="border-2 border-green-200 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Ventas
                </CardTitle>
                <div className="bg-green-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                ${metricas.totalVentas.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pedidos entregados
              </p>
            </CardContent>
          </Card>

          {/* Total Pedidos */}
          <Card className="border-2 border-blue-200 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Pedidos
                </CardTitle>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {metricas.totalPedidos}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pedidos completados
              </p>
            </CardContent>
          </Card>

          {/* Ticket Promedio */}
          <Card className="border-2 border-purple-200 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Ticket Promedio
                </CardTitle>
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">
                ${Math.round(metricas.ticketPromedio).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Por pedido
              </p>
            </CardContent>
          </Card>

          {/* Pedidos por Hora */}
          <Card className="border-2 border-orange-200 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pedidos/Hora
                </CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700">
                {metricas.pedidosPorHora.toFixed(1)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Promedio
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Productos */}
        {topProductos.length > 0 && (
          <Card className="mb-6 border-2 border-yellow-200">
            <CardHeader className="bg-gradient-to-r from-yellow-100 to-orange-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-2xl">🏆</span>
                Top 5 Productos Más Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {topProductos.map((producto, index) => (
                  <div
                    key={producto.nombre}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-white
                        ${index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-600' : 'bg-gray-300'}
                      `}>
                        {index + 1}
                      </div>
                      <span className="font-semibold text-gray-800">{producto.nombre}</span>
                    </div>
                    <Badge className="bg-orange-500 text-white">
                      {producto.cantidad} vendidos
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalle de Pedidos */}
        <Card className="border-2 border-gray-200">
          <CardHeader>
            <button
              onClick={() => setMostrarDetalle(!mostrarDetalle)}
              className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors"
            >
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5" />
                Detalle de Pedidos ({pedidos.length})
              </CardTitle>
              {mostrarDetalle ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </CardHeader>

          {mostrarDetalle && (
            <CardContent className="p-4">
              {pedidos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left p-3 font-semibold text-gray-700">Fecha/Hora</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Mesa</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Items</th>
                        <th className="text-right p-3 font-semibold text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidos.map((pedido) => (
                        <tr key={pedido.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-sm text-gray-600">
                            {formatearFecha(pedido.created_at)}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="font-semibold">
                              {pedido.mesas.numero}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {pedido.detalle_pedidos.reduce((sum, d) => sum + d.cantidad, 0)} items
                          </td>
                          <td className="p-3 text-right font-bold text-green-700">
                            ${Number(pedido.total).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay pedidos en este período
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Mensaje si no hay ventas */}
        {pedidos.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg mt-6">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay ventas registradas
            </h3>
            <p className="text-gray-500">
              No se encontraron pedidos entregados en el período seleccionado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}