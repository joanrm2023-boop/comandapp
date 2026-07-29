"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, ShoppingBag, TrendingUp, Clock, ChevronDown, ChevronUp, Loader2, CreditCard, UtensilsCrossed, Home, ShoppingBag as ShoppingBagIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Tipos
interface Pedido {
  id: string;
  mesa_id: string;
  estado: string;
  total: number;
  created_at: string;
  medio_pago: string;
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
  const [filtroPago, setFiltroPago] = useState("todos");
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    cargarVentas();
  }, [filtroFecha, filtroPago, fechaInicio, fechaFin]);

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

      // Obtener negocio_id del usuario actual
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

      // Construir query base
      let query = supabase
        .from('pedidos')
        .select(`
          id,
          mesa_id,
          estado,
          total,
          created_at,
          medio_pago,
          mesas (numero),
          detalle_pedidos (
            id,
            cantidad,
            productos (nombre)
          )
        `)
        .eq('estado', 'vendido')
        .eq('negocio_id', negocioId)
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fin.toISOString())
        .order('created_at', { ascending: false });

      // Aplicar filtro de medio de pago si no es "todos"
      if (filtroPago !== 'todos') {
        query = query.eq('medio_pago', filtroPago);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPedidos(data as any || []);
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Determinar el tipo de pedido a partir del nombre de la mesa
  // (misma lógica que ya usa PedidosPage/Dashboard)
  const getTipoPedido = (pedido: Pedido): 'mesa' | 'domicilio' | 'para_llevar' => {
    const mesaNumero = pedido.mesas.numero.toLowerCase();
    if (mesaNumero.includes('domicilio')) return 'domicilio';
    if (mesaNumero.includes('llevar')) return 'para_llevar';
    return 'mesa';
  };

  // Pedidos ya filtrados por fecha/medio de pago (desde la query).
  const pedidosFiltrados = pedidos;

  const calcularMetricas = () => {
    const totalVentas = pedidosFiltrados.reduce((sum, p) => sum + Number(p.total), 0);
    const totalPedidos = pedidosFiltrados.length;
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

  // 🆕 Resumen comparativo por tipo, SIEMPRE sobre el conjunto completo
  // (fecha + medio de pago aplicados, pero sin el filtro de tipo), para
  // que se vea el panorama completo sin importar qué tipo esté activo.
  const calcularResumenPorTipo = () => {
    const deTipo = (tipo: 'mesa' | 'domicilio' | 'para_llevar') =>
      pedidos.filter((p) => getTipoPedido(p) === tipo);

    const armar = (lista: Pedido[]) => ({
      cantidad: lista.length,
      total: lista.reduce((sum, p) => sum + Number(p.total), 0),
    });

    return {
      mesa: armar(deTipo('mesa')),
      domicilio: armar(deTipo('domicilio')),
      para_llevar: armar(deTipo('para_llevar')),
    };
  };

  const obtenerProductosMasVendidos = (): ProductoVendido[] => {
    const productosMap = new Map<string, ProductoVendido>();

    pedidosFiltrados.forEach(pedido => {
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

  const obtenerIconoMedioPago = (medio: string) => {
    switch (medio) {
      case 'efectivo':
        return '💵';
      case 'nequi':
        return '📱';
      case 'daviplata':
        return '📲';
      case 'bold':
        return '💳';
      default:
        return '💰';
    }
  };

  // 🆕 Ícono/etiqueta de tipo para la columna nueva de la tabla
  const obtenerBadgeTipo = (pedido: Pedido) => {
    const tipo = getTipoPedido(pedido);
    if (tipo === 'domicilio') {
      return (
        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 gap-1">
          <Home className="w-3 h-3" /> Domicilio
        </Badge>
      );
    }
    if (tipo === 'para_llevar') {
      return (
        <Badge className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 gap-1">
          <ShoppingBagIcon className="w-3 h-3" /> Para llevar
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-semibold border-zinc-300">
        Mesa {pedido.mesas.numero}
      </Badge>
    );
  };

  const metricas = calcularMetricas();
  const resumenTipo = calcularResumenPorTipo();
  const topProductos = obtenerProductosMasVendidos();

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
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Ventas
              </h1>
              <p className="text-zinc-600 text-sm">
                Análisis de ventas y estadísticas
              </p>
            </div>
          </div>
        </div>

        {/* Filtros de Fecha */}
        <div className="bg-white rounded-xl border-2 border-zinc-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-zinc-900">Filtrar por Fecha</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setFiltroFecha("hoy")}
              variant={filtroFecha === "hoy" ? "default" : "outline"}
              className={filtroFecha === "hoy" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📅 Hoy
            </Button>
            <Button
              onClick={() => setFiltroFecha("ayer")}
              variant={filtroFecha === "ayer" ? "default" : "outline"}
              className={filtroFecha === "ayer" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📆 Ayer
            </Button>
            <Button
              onClick={() => setFiltroFecha("semana")}
              variant={filtroFecha === "semana" ? "default" : "outline"}
              className={filtroFecha === "semana" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📊 Última semana
            </Button>
            <Button
              onClick={() => setFiltroFecha("mes")}
              variant={filtroFecha === "mes" ? "default" : "outline"}
              className={filtroFecha === "mes" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📈 Este mes
            </Button>
            <Button
              onClick={() => setFiltroFecha("personalizado")}
              variant={filtroFecha === "personalizado" ? "default" : "outline"}
              className={filtroFecha === "personalizado" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              🗓️ Rango personalizado
            </Button>
          </div>

          {/* Selector de fechas personalizado */}
          {filtroFecha === "personalizado" && (
            <div className="flex gap-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Filtros por Medio de Pago */}
        <div className="bg-white rounded-xl border-2 border-zinc-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-zinc-900">Filtrar por Medio de Pago</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setFiltroPago("todos")}
              variant={filtroPago === "todos" ? "default" : "outline"}
              className={filtroPago === "todos" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              💰 Todos
            </Button>
            <Button
              onClick={() => setFiltroPago("efectivo")}
              variant={filtroPago === "efectivo" ? "default" : "outline"}
              className={filtroPago === "efectivo" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              💵 Efectivo
            </Button>
            <Button
              onClick={() => setFiltroPago("nequi")}
              variant={filtroPago === "nequi" ? "default" : "outline"}
              className={filtroPago === "nequi" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📱 Nequi
            </Button>
            <Button
              onClick={() => setFiltroPago("daviplata")}
              variant={filtroPago === "daviplata" ? "default" : "outline"}
              className={filtroPago === "daviplata" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📲 Daviplata
            </Button>
            <Button
              onClick={() => setFiltroPago("bold")}
              variant={filtroPago === "bold" ? "default" : "outline"}
              className={filtroPago === "bold" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              💳 Bold
            </Button>
          </div>
        </div>

        {/* Indicador de filtros activos */}
        <div className="mb-8 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
          <p className="text-sm text-zinc-700">
            <span className="font-semibold">Mostrando:</span> Ventas de{" "}
            <span className="font-semibold text-orange-600">
              {filtroFecha === "hoy" && "hoy"}
              {filtroFecha === "ayer" && "ayer"}
              {filtroFecha === "semana" && "la última semana"}
              {filtroFecha === "mes" && "este mes"}
              {filtroFecha === "personalizado" && "rango personalizado"}
            </span>
            {filtroPago !== "todos" && (
              <>
                {" "}pagadas con{" "}
                <span className="font-semibold text-orange-600">
                  {obtenerIconoMedioPago(filtroPago)} {filtroPago}
                </span>
              </>
            )}
          </p>
        </div>

        {/* 🆕 Resumen comparativo por tipo — siempre visible, sin importar el filtro de tipo activo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-orange-800">🪑 MESAS</span>
              <span className="text-xs text-orange-600">{resumenTipo.mesa.cantidad} pedidos</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              ${resumenTipo.mesa.total.toLocaleString()}
            </div>
          </div>

          <div className="bg-zinc-50 border-2 border-zinc-300 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-zinc-800">🏠 DOMICILIO</span>
              <span className="text-xs text-zinc-600">{resumenTipo.domicilio.cantidad} pedidos</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">
              ${resumenTipo.domicilio.total.toLocaleString()}
            </div>
          </div>

          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-orange-800">🛍️ PARA LLEVAR</span>
              <span className="text-xs text-orange-600">{resumenTipo.para_llevar.cantidad} pedidos</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              ${resumenTipo.para_llevar.total.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tarjetas de métricas (ya reflejan el filtro de tipo activo) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Ventas */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Total Ventas
                </CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                ${metricas.totalVentas.toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Pedidos vendidos
              </p>
            </CardContent>
          </Card>

          {/* Total Pedidos */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Total Pedidos
                </CardTitle>
                <div className="bg-zinc-900 p-2 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-900">
                {metricas.totalPedidos}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Pedidos completados
              </p>
            </CardContent>
          </Card>

          {/* Ticket Promedio */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Ticket Promedio
                </CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                ${Math.round(metricas.ticketPromedio).toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Por pedido
              </p>
            </CardContent>
          </Card>

          {/* Pedidos por Hora */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Pedidos/Hora
                </CardTitle>
                <div className="bg-zinc-900 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-900">
                {metricas.pedidosPorHora.toFixed(1)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Promedio
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Productos */}
        {topProductos.length > 0 && (
          <Card className="mb-6 border-2 border-zinc-200">
            <CardHeader className="bg-zinc-50 border-b border-zinc-200">
              <CardTitle className="flex items-center gap-2 text-lg text-zinc-900">
                <span className="text-2xl">🏆</span>
                Top 5 Productos Más Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {topProductos.map((producto, index) => (
                  <div
                    key={producto.nombre}
                    className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200 hover:border-orange-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-white
                        ${index === 0 ? 'bg-orange-500' : 
                          index === 1 ? 'bg-zinc-700' : 
                          index === 2 ? 'bg-orange-400' : 'bg-zinc-500'}
                      `}>
                        {index + 1}
                      </div>
                      <span className="font-semibold text-zinc-900">{producto.nombre}</span>
                    </div>
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                      {producto.cantidad} vendidos
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalle de Pedidos */}
        <Card className="border-2 border-zinc-200">
          <CardHeader>
            <button
              onClick={() => setMostrarDetalle(!mostrarDetalle)}
              className="w-full flex items-center justify-between hover:bg-zinc-50 p-2 rounded-lg transition-colors"
            >
              <CardTitle className="flex items-center gap-2 text-lg text-zinc-900">
                <Calendar className="w-5 h-5 text-orange-500" />
                Detalle de Pedidos ({pedidosFiltrados.length})
              </CardTitle>
              {mostrarDetalle ? (
                <ChevronUp className="w-5 h-5 text-zinc-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-600" />
              )}
            </button>
          </CardHeader>

          {mostrarDetalle && (
            <CardContent className="p-4">
              {pedidosFiltrados.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-zinc-200">
                        <th className="text-left p-3 font-semibold text-zinc-700">Fecha/Hora</th>
                        <th className="text-left p-3 font-semibold text-zinc-700">Tipo</th>
                        <th className="text-left p-3 font-semibold text-zinc-700">Items</th>
                        <th className="text-left p-3 font-semibold text-zinc-700">Medio Pago</th>
                        <th className="text-right p-3 font-semibold text-zinc-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosFiltrados.map((pedido) => (
                        <tr key={pedido.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <td className="p-3 text-sm text-zinc-600">
                            {formatearFecha(pedido.created_at)}
                          </td>
                          <td className="p-3">
                            {obtenerBadgeTipo(pedido)}
                          </td>
                          <td className="p-3 text-sm text-zinc-600">
                            {pedido.detalle_pedidos.reduce((sum, d) => sum + d.cantidad, 0)} items
                          </td>
                          <td className="p-3">
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                              {obtenerIconoMedioPago(pedido.medio_pago)} {pedido.medio_pago}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-orange-600">
                            ${Number(pedido.total).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  No hay pedidos en este período
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Mensaje si no hay ventas */}
        {pedidosFiltrados.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-zinc-200 mt-6">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">
              No hay ventas registradas
            </h3>
            <p className="text-zinc-600">
              No se encontraron pedidos vendidos en el período seleccionado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}