"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Clock, Loader2, Home, ShoppingBag, TrendingUp, DollarSign, Search, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Tipos
interface Pedido {
  id: string;
  numero_pedido: number | null;
  total: number;
  estado: string;
  es_domicilio: boolean;
  direccion_domicilio: string | null;
  valor_domicilio: number;
  medio_pago: string;
  created_at: string;
  mesas: {
    numero: string;
  };
  clientes: {
    nombre: string;
  } | null;
  detalle_pedidos: Array<{
    id: string;
    cantidad: number;
    notas: string | null;
    productos: {
      nombre: string;
      precio: number;
    };
  }>;
}

interface EstadisticasVentas {
  totalVentas: number;
  cantidadPedidos: number;
  promedioVenta: number;
  ventasEfectivo: number;
  ventasNequi: number;
  ventasDaviplata: number;
  ventasBold: number;
}

export default function VentasMeseroPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState("hoy");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [nombreMesero, setNombreMesero] = useState("");

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

  useEffect(() => {
    cargarVentas();
  }, [filtroFecha, fechaInicio, fechaFin]);

  const cargarVentas = async () => {
    try {
      setLoading(true);

      // Obtener usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Buscar datos del mesero en tabla usuarios
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nombre, negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError || !usuarioData) {
        console.error('Error obteniendo usuario');
        setLoading(false);
        return;
      }

      setNombreMesero(usuarioData.nombre);
      const { inicio, fin } = obtenerRangoFechas();

      // Cargar pedidos VENDIDOS del mesero
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          mesas (numero),
          clientes (nombre),
          detalle_pedidos (
            id,
            cantidad,
            notas,
            productos (nombre, precio)
          )
        `)
        .eq('mesero_id', usuarioData.id)
        .eq('estado', 'vendido')
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

  // Función para determinar el tipo de pedido
  const getTipoPedido = (pedido: Pedido): 'mesa' | 'domicilio' | 'para_llevar' => {
    const mesaNumero = pedido.mesas.numero.toLowerCase();
    
    if (mesaNumero.includes('domicilio')) return 'domicilio';
    if (mesaNumero.includes('llevar')) return 'para_llevar';
    return 'mesa';
  };

  // Filtrar pedidos según búsqueda
  const pedidosFiltrados = pedidos.filter(pedido => {
    if (busqueda.trim()) {
      const searchLower = busqueda.toLowerCase();
      const numeroPedido = pedido.numero_pedido?.toString() || pedido.id.slice(-6);
      const nombreCliente = pedido.clientes?.nombre?.toLowerCase() || '';
      const mesaNumero = pedido.mesas.numero.toLowerCase();

      return (
        numeroPedido.includes(searchLower) ||
        nombreCliente.includes(searchLower) ||
        mesaNumero.includes(searchLower)
      );
    }
    return true;
  });

  // Calcular estadísticas
  const estadisticas: EstadisticasVentas = useMemo(() => {
    const totalVentas = pedidosFiltrados.reduce((sum, p) => sum + p.total, 0);
    const cantidadPedidos = pedidosFiltrados.length;
    const promedioVenta = cantidadPedidos > 0 ? totalVentas / cantidadPedidos : 0;

    const ventasEfectivo = pedidosFiltrados
      .filter(p => p.medio_pago === 'efectivo')
      .reduce((sum, p) => sum + p.total, 0);

    const ventasNequi = pedidosFiltrados
      .filter(p => p.medio_pago === 'nequi')
      .reduce((sum, p) => sum + p.total, 0);

    const ventasDaviplata = pedidosFiltrados
      .filter(p => p.medio_pago === 'daviplata')
      .reduce((sum, p) => sum + p.total, 0);

    const ventasBold = pedidosFiltrados
      .filter(p => p.medio_pago === 'bold')
      .reduce((sum, p) => sum + p.total, 0);

    return {
      totalVentas,
      cantidadPedidos,
      promedioVenta,
      ventasEfectivo,
      ventasNequi,
      ventasDaviplata,
      ventasBold
    };
  }, [pedidosFiltrados]);

  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obtener ícono según el tipo
  const getIconoTipo = (pedido: Pedido) => {
    const tipo = getTipoPedido(pedido);
    
    if (tipo === 'domicilio') {
      return <Home className="w-6 h-6 text-orange-600" />;
    }
    if (tipo === 'para_llevar') {
      return <ShoppingBag className="w-6 h-6 text-zinc-700" />;
    }
    return (
      <span className="text-2xl font-bold text-orange-600">
        {pedido.mesas.numero}
      </span>
    );
  };

  // Obtener color de fondo según el tipo
  const getColorFondo = (pedido: Pedido) => {
    const tipo = getTipoPedido(pedido);
    
    if (tipo === 'domicilio') return 'from-orange-100 to-orange-200';
    if (tipo === 'para_llevar') return 'from-zinc-100 to-zinc-200';
    return 'from-orange-50 to-red-50';
  };

  // Obtener título según el tipo
  const getTitulo = (pedido: Pedido) => {
    const tipo = getTipoPedido(pedido);
    
    if (tipo === 'domicilio') return '🏠 Domicilio';
    if (tipo === 'para_llevar') return '🛍️ Para Llevar';
    return `Mesa ${pedido.mesas.numero}`;
  };

  // Obtener número de pedido para mostrar
  const getNumeroPedido = (pedido: Pedido) => {
    if (pedido.numero_pedido) return `#${pedido.numero_pedido}`;
    return `#${pedido.id.slice(-6).toUpperCase()}`;
  };

  // Obtener icono de medio de pago
  const getIconoMedioPago = (medioPago: string) => {
    switch (medioPago) {
      case 'efectivo': return '💵';
      case 'nequi': return '📱';
      case 'daviplata': return '📲';
      case 'bold': return '💳';
      default: return '💰';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl shadow-lg shadow-orange-500/50">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Mis Ventas
              </h1>
              <p className="text-zinc-600 text-sm">
                {nombreMesero} - {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'venta' : 'ventas'}
              </p>
            </div>
          </div>
        </div>

        {/* Tarjetas de Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Ventas */}
          <Card className="border-2 border-orange-200 shadow-lg shadow-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Total Vendido</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ${estadisticas.totalVentas.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cantidad de Pedidos */}
          <Card className="border-2 border-blue-200 shadow-lg shadow-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Pedidos</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {estadisticas.cantidadPedidos}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Promedio por Venta */}
          <Card className="border-2 border-green-200 shadow-lg shadow-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Promedio</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${estadisticas.promedioVenta.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medios de Pago */}
          <Card className="border-2 border-purple-200 shadow-lg shadow-purple-500/20">
            <CardContent className="p-4">
              <p className="text-sm text-zinc-600 mb-2">Medios de Pago</p>
              <div className="space-y-1 text-xs">
                {estadisticas.ventasEfectivo > 0 && (
                  <div className="flex justify-between">
                    <span>💵 Efectivo:</span>
                    <span className="font-semibold">${estadisticas.ventasEfectivo.toLocaleString()}</span>
                  </div>
                )}
                {estadisticas.ventasNequi > 0 && (
                  <div className="flex justify-between">
                    <span>📱 Nequi:</span>
                    <span className="font-semibold">${estadisticas.ventasNequi.toLocaleString()}</span>
                  </div>
                )}
                {estadisticas.ventasDaviplata > 0 && (
                  <div className="flex justify-between">
                    <span>📲 Daviplata:</span>
                    <span className="font-semibold">${estadisticas.ventasDaviplata.toLocaleString()}</span>
                  </div>
                )}
                {estadisticas.ventasBold > 0 && (
                  <div className="flex justify-between">
                    <span>💳 Bold:</span>
                    <span className="font-semibold">${estadisticas.ventasBold.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border-2 border-yellow-200">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Barra de búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Buscar por número, cliente o mesa..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 border-zinc-300 focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Filtros de fecha */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={filtroFecha === "hoy" ? "default" : "outline"}
                onClick={() => setFiltroFecha("hoy")}
                className={filtroFecha === "hoy" ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" : "border-zinc-300 hover:bg-zinc-50"}
              >
                📅 Hoy
              </Button>
              <Button
                size="sm"
                variant={filtroFecha === "ayer" ? "default" : "outline"}
                onClick={() => setFiltroFecha("ayer")}
                className={filtroFecha === "ayer" ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" : "border-zinc-300 hover:bg-zinc-50"}
              >
                📆 Ayer
              </Button>
              <Button
                size="sm"
                variant={filtroFecha === "semana" ? "default" : "outline"}
                onClick={() => setFiltroFecha("semana")}
                className={filtroFecha === "semana" ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" : "border-zinc-300 hover:bg-zinc-50"}
              >
                📊 Semana
              </Button>
              <Button
                size="sm"
                variant={filtroFecha === "mes" ? "default" : "outline"}
                onClick={() => setFiltroFecha("mes")}
                className={filtroFecha === "mes" ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" : "border-zinc-300 hover:bg-zinc-50"}
              >
                📈 Mes
              </Button>
              <Button
                size="sm"
                variant={filtroFecha === "personalizado" ? "default" : "outline"}
                onClick={() => setFiltroFecha("personalizado")}
                className={filtroFecha === "personalizado" ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" : "border-zinc-300 hover:bg-zinc-50"}
              >
                🗓️ Rango
              </Button>
            </div>
          </div>

          {/* Selector de rango personalizado */}
          {filtroFecha === "personalizado" && (
            <div className="flex flex-col sm:flex-row gap-3 mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Lista de Ventas */}
        {pedidosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {pedidosFiltrados.map((pedido) => (
              <Card key={pedido.id} className="hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-300 border-2 border-zinc-200 relative">
                {/* Número de pedido */}
                <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  {getNumeroPedido(pedido)}
                </div>

                <CardContent className="p-6 pt-12">
                  {/* Header del pedido */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`bg-gradient-to-br ${getColorFondo(pedido)} p-3 rounded-xl border border-zinc-200`}>
                        {getIconoTipo(pedido)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-zinc-900">
                          {getTitulo(pedido)}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Calendar className="w-3 h-3" />
                          {formatearFecha(pedido.created_at)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {formatearHora(pedido.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cliente */}
                  {pedido.clientes && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2 mb-3">
                      <p className="text-xs text-zinc-600">
                        👤 <span className="font-semibold text-zinc-900">{pedido.clientes.nombre}</span>
                      </p>
                    </div>
                  )}

                  {/* Info domicilio */}
                  {pedido.es_domicilio && pedido.direccion_domicilio && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-3">
                      <p className="text-xs text-zinc-700">
                        <strong>📍 Dirección:</strong><br />
                        {pedido.direccion_domicilio}
                      </p>
                    </div>
                  )}

                  {/* Items del pedido */}
                  <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                    {pedido.detalle_pedidos.map((detalle) => (
                      <div key={detalle.id} className="flex justify-between items-start text-sm">
                        <div className="flex-1">
                          <span className="text-orange-600 font-semibold">{detalle.cantidad}x</span>{' '}
                          <span className="text-zinc-900">{detalle.productos.nombre}</span>
                          {detalle.notas && (
                            <p className="text-xs text-orange-600 italic ml-5">
                              • {detalle.notas}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-zinc-900 ml-2">
                          ${(detalle.productos.precio * detalle.cantidad).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total y Medio de Pago */}
                  <div className="pt-3 border-t-2 border-zinc-200 space-y-2">
                    {pedido.es_domicilio && pedido.valor_domicilio > 0 ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm text-zinc-600">
                          <span>Subtotal:</span>
                          <span>${(pedido.total - pedido.valor_domicilio).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Domicilio:</span>
                          <span>${pedido.valor_domicilio.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-300">
                      <span className="font-bold text-zinc-900">TOTAL:</span>
                      <span className="text-2xl font-bold text-orange-600">
                        ${pedido.total.toLocaleString()}
                      </span>
                    </div>

                    {/* Medio de pago */}
                    <div className="flex items-center justify-center gap-2 bg-zinc-100 rounded-lg p-2 mt-2">
                      <span className="text-lg">{getIconoMedioPago(pedido.medio_pago)}</span>
                      <span className="text-xs font-semibold text-zinc-700 capitalize">
                        {pedido.medio_pago}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-zinc-200">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">
              No hay ventas registradas
            </h3>
            <p className="text-zinc-600">
              {busqueda 
                ? `No se encontraron resultados para "${busqueda}"` 
                : 'Las ventas que realices aparecerán aquí'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}