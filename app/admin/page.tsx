"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Package,
  CheckCircle,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Tipos
interface Pedido {
  id: string;
  mesa_id: string;
  estado: string;
  total: number;
  created_at: string;
}

interface Mesa {
  id: string;
  numero: string;
  estado: string;
  activo: boolean;
}

export default function DashboardPage() {
  const [pedidosHoy, setPedidosHoy] = useState<Pedido[]>([]);
  const [pedidosAyer, setPedidosAyer] = useState<Pedido[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [pedidosActivos, setPedidosActivos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date());

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      if (pedidosHoy.length === 0) {
        setLoading(true);
      } else {
        setActualizando(true);
      }

      // Fechas para hoy y ayer
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const finHoy = new Date();
      finHoy.setHours(23, 59, 59, 999);

      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      ayer.setHours(0, 0, 0, 0);
      const finAyer = new Date();
      finAyer.setDate(finAyer.getDate() - 1);
      finAyer.setHours(23, 59, 59, 999);

      // Cargar pedidos de hoy (entregados)
      const { data: dataPedidosHoy, error: errorHoy } = await supabase
        .from('pedidos')
        .select('id, mesa_id, estado, total, created_at')
        .eq('estado', 'entregado')
        .gte('created_at', hoy.toISOString())
        .lte('created_at', finHoy.toISOString());

      if (errorHoy) throw errorHoy;

      // Cargar pedidos de ayer (entregados)
      const { data: dataPedidosAyer, error: errorAyer } = await supabase
        .from('pedidos')
        .select('id, mesa_id, estado, total, created_at')
        .eq('estado', 'entregado')
        .gte('created_at', ayer.toISOString())
        .lte('created_at', finAyer.toISOString());

      if (errorAyer) throw errorAyer;

      // Cargar mesas
      const { data: dataMesas, error: errorMesas } = await supabase
        .from('mesas')
        .select('*')
        .eq('activo', true)
        .order('numero');

      if (errorMesas) throw errorMesas;

      // Cargar pedidos activos (no entregados ni cancelados)
      const { data: dataPedidosActivos, error: errorActivos } = await supabase
        .from('pedidos')
        .select('id, mesa_id, estado, total, created_at')
        .in('estado', ['pendiente', 'en_preparacion', 'listo'])
        .gte('created_at', hoy.toISOString());

      if (errorActivos) throw errorActivos;

      setPedidosHoy(dataPedidosHoy || []);
      setPedidosAyer(dataPedidosAyer || []);
      setMesas(dataMesas || []);
      setPedidosActivos(dataPedidosActivos || []);
      setUltimaActualizacion(new Date());

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
      setActualizando(false);
    }
  };

  const calcularMetricas = () => {
    const ventasHoy = pedidosHoy.reduce((sum, p) => sum + Number(p.total), 0);
    const ventasAyer = pedidosAyer.reduce((sum, p) => sum + Number(p.total), 0);
    const pedidosCountHoy = pedidosHoy.length;
    const pedidosCountAyer = pedidosAyer.length;

    const cambioVentas = ventasAyer > 0 ? ((ventasHoy - ventasAyer) / ventasAyer) * 100 : 0;
    const cambioPedidos = pedidosCountAyer > 0 ? ((pedidosCountHoy - pedidosCountAyer) / pedidosCountAyer) * 100 : 0;

    const mesasOcupadas = mesas.filter(m => m.estado === 'ocupada').length;
    const totalMesas = mesas.length;
    const ocupacionPorcentaje = totalMesas > 0 ? (mesasOcupadas / totalMesas) * 100 : 0;

    const pendientes = pedidosActivos.filter(p => p.estado === 'pendiente').length;
    const enPreparacion = pedidosActivos.filter(p => p.estado === 'en_preparacion').length;
    const listos = pedidosActivos.filter(p => p.estado === 'listo').length;

    return {
      ventasHoy,
      cambioVentas,
      pedidosCountHoy,
      cambioPedidos,
      mesasOcupadas,
      totalMesas,
      ocupacionPorcentaje,
      pendientes,
      enPreparacion,
      listos,
      totalActivos: pedidosActivos.length
    };
  };

  const obtenerTiempoTranscurrido = () => {
    const ahora = new Date();
    const diff = Math.floor((ahora.getTime() - ultimaActualizacion.getTime()) / 1000);

    if (diff < 60) return `Hace ${diff} segundos`;
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} minutos`;
    return `Hace ${Math.floor(diff / 3600)} horas`;
  };

  const metricas = calcularMetricas();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <span className="text-3xl">🏠</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Vista general del restaurante
              </p>
            </div>
          </div>

          {/* Botón actualizar */}
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={cargarDatos}
              disabled={actualizando}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${actualizando ? 'animate-spin' : ''}`} />
              {actualizando ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <p className="text-xs text-gray-500">
              {obtenerTiempoTranscurrido()}
            </p>
          </div>
        </div>

        {/* Métricas principales del día */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Ventas HOY */}
          <Card className="border-2 border-green-200 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Ventas HOY
                </CardTitle>
                <div className="bg-green-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                ${metricas.ventasHoy.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {metricas.cambioVentas >= 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600 font-semibold">
                      +{metricas.cambioVentas.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600 font-semibold">
                      {metricas.cambioVentas.toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-xs text-gray-500 ml-1">vs ayer</span>
              </div>
            </CardContent>
          </Card>

          {/* Pedidos HOY */}
          <Card className="border-2 border-blue-200 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pedidos HOY
                </CardTitle>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {metricas.pedidosCountHoy}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {metricas.cambioPedidos >= 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600 font-semibold">
                      +{metricas.cambioPedidos.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600 font-semibold">
                      {metricas.cambioPedidos.toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-xs text-gray-500 ml-1">vs ayer</span>
              </div>
            </CardContent>
          </Card>

          {/* Mesas Ocupadas */}
          <Card className="border-2 border-purple-200 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Mesas Ocupadas
                </CardTitle>
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">
                {metricas.mesasOcupadas} / {metricas.totalMesas}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metricas.ocupacionPorcentaje}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-purple-600">
                  {metricas.ocupacionPorcentaje.toFixed(0)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pedidos Activos */}
          <Card className="border-2 border-orange-200 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pedidos Activos
                </CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700">
                {metricas.totalActivos}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                En proceso ahora
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estado de pedidos */}
        <Card className="mb-8 border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5" />
              Estado de Pedidos en Tiempo Real
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Pendientes */}
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-yellow-800">PENDIENTES</span>
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-4xl font-bold text-yellow-700">
                  {metricas.pendientes}
                </div>
                <p className="text-xs text-yellow-600 mt-1">Por iniciar</p>
              </div>

              {/* En Preparación */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-orange-800">EN PREPARACIÓN</span>
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-4xl font-bold text-orange-700">
                  {metricas.enPreparacion}
                </div>
                <p className="text-xs text-orange-600 mt-1">En cocina</p>
              </div>

              {/* Listos */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-green-800">LISTOS</span>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-4xl font-bold text-green-700">
                  {metricas.listos}
                </div>
                <p className="text-xs text-green-600 mt-1">Para entregar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vista de mesas */}
        <Card className="border-2 border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Estado de Mesas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mesas.map((mesa) => (
                <div
                  key={mesa.id}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
                    ${mesa.estado === 'libre' 
                      ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 hover:shadow-lg hover:scale-105' 
                      : 'bg-gradient-to-br from-orange-50 to-red-100 border-orange-300 hover:shadow-lg'
                    }
                  `}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">
                      {mesa.estado === 'libre' ? '🪑' : '🔴'}
                    </div>
                    <div className="font-bold text-gray-800">
                      {mesa.numero}
                    </div>
                    <Badge 
                      className={`mt-2 text-xs ${
                        mesa.estado === 'libre' 
                          ? 'bg-green-500' 
                          : 'bg-orange-500'
                      }`}
                    >
                      {mesa.estado === 'libre' ? 'Libre' : 'Ocupada'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Libre ({mesas.filter(m => m.estado === 'libre').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Ocupada ({mesas.filter(m => m.estado === 'ocupada').length})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}