"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SubirLogo from "@/components/ui/SubirLogo";
import { 
  DollarSign, 
  ShoppingBag, 
  Home,
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Loader2,
  UtensilsCrossed
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Tipos
interface Pedido {
    id: string;
    mesa_id: string;
    total: number;
    created_at: string;
    mesas: {
      numero: string;
    };
    detalle_pedidos: Array<{
      cantidad: number;
      productos: {
        nombre: string;
      };
    }>;
  }

  interface PedidoSimple {
    id: string;
    total: number;
  }

interface ProductoVendido {
  nombre: string;
  cantidad: number;
}

export default function DashboardPage() {
  const [pedidosHoy, setPedidosHoy] = useState<Pedido[]>([]);
  const [pedidosAyer, setPedidosAyer] = useState<PedidoSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date());
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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
      setNegocioId(negocioId);

      // Obtener logo del negocio
      const { data: negocioData } = await supabase
        .from('negocios')
        .select('logo_url')
        .eq('id', negocioId)
        .single();

      if (negocioData?.logo_url) {
        setLogoUrl(negocioData.logo_url);
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

      // Cargar pedidos de hoy DEL NEGOCIO (sin filtro de estado)
      const { data: dataPedidosHoy, error: errorHoy } = await supabase
        .from('pedidos')
        .select(`
          id,
          mesa_id,
          total,
          created_at,
          mesas (numero),
          detalle_pedidos (
            cantidad,
            productos (nombre)
          )
        `)
        .eq('negocio_id', negocioId)
        .gte('created_at', hoy.toISOString())
        .lte('created_at', finHoy.toISOString());

      if (errorHoy) throw errorHoy;

      // Cargar pedidos de ayer DEL NEGOCIO (sin filtro de estado)
      const { data: dataPedidosAyer, error: errorAyer } = await supabase
        .from('pedidos')
        .select('id, total')
        .eq('negocio_id', negocioId)
        .gte('created_at', ayer.toISOString())
        .lte('created_at', finAyer.toISOString());

      if (errorAyer) throw errorAyer;

      setPedidosHoy(dataPedidosHoy as any || []);
      setPedidosAyer(dataPedidosAyer || []);
      setUltimaActualizacion(new Date());

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
      setActualizando(false);
    }
  };

  // Determinar tipo de pedido
  const getTipoPedido = (pedido: Pedido): 'mesa' | 'domicilio' | 'para_llevar' => {
    const mesaNumero = pedido.mesas.numero.toLowerCase();
    
    if (mesaNumero.includes('domicilio')) return 'domicilio';
    if (mesaNumero.includes('llevar')) return 'para_llevar';
    return 'mesa';
  };

  const calcularMetricas = () => {
    const ventasHoy = pedidosHoy.reduce((sum, p) => sum + Number(p.total), 0);
    const ventasAyer = pedidosAyer.reduce((sum, p) => sum + Number(p.total), 0);
    const pedidosCountHoy = pedidosHoy.length;
    const pedidosCountAyer = pedidosAyer.length;

    const cambioVentas = ventasAyer > 0 ? ((ventasHoy - ventasAyer) / ventasAyer) * 100 : 0;
    const cambioPedidos = pedidosCountAyer > 0 ? ((pedidosCountHoy - pedidosCountAyer) / pedidosCountAyer) * 100 : 0;

    // Calcular domicilios
    const domiciliosHoy = pedidosHoy.filter(p => getTipoPedido(p) === 'domicilio').length;

    // Ticket promedio
    const ticketPromedio = pedidosCountHoy > 0 ? ventasHoy / pedidosCountHoy : 0;

    // Distribución por tipo
    const mesasCount = pedidosHoy.filter(p => getTipoPedido(p) === 'mesa').length;
    const domiciliosCount = pedidosHoy.filter(p => getTipoPedido(p) === 'domicilio').length;
    const paraLlevarCount = pedidosHoy.filter(p => getTipoPedido(p) === 'para_llevar').length;

    const total = pedidosCountHoy || 1;
    const mesasPorcentaje = (mesasCount / total) * 100;
    const domiciliosPorcentaje = (domiciliosCount / total) * 100;
    const paraLlevarPorcentaje = (paraLlevarCount / total) * 100;

    return {
      ventasHoy,
      cambioVentas,
      pedidosCountHoy,
      cambioPedidos,
      domiciliosHoy,
      ticketPromedio,
      mesasCount,
      domiciliosCount,
      paraLlevarCount,
      mesasPorcentaje,
      domiciliosPorcentaje,
      paraLlevarPorcentaje
    };
  };

  // Top 5 productos del día
  const obtenerTopProductos = (): ProductoVendido[] => {
    const productosMap = new Map<string, number>();

    pedidosHoy.forEach(pedido => {
      pedido.detalle_pedidos.forEach(detalle => {
        const nombre = detalle.productos.nombre;
        const cantidad = detalle.cantidad;
        productosMap.set(nombre, (productosMap.get(nombre) || 0) + cantidad);
      });
    });

    return Array.from(productosMap.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  };

  const obtenerTiempoTranscurrido = () => {
    const ahora = new Date();
    const diff = Math.floor((ahora.getTime() - ultimaActualizacion.getTime()) / 1000);

    if (diff < 60) return `Hace ${diff} segundos`;
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} minutos`;
    return `Hace ${Math.floor(diff / 3600)} horas`;
  };

  const metricas = calcularMetricas();
  const topProductos = obtenerTopProductos();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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
              <span className="text-3xl">🏠</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-zinc-600 text-sm">
                Vista general del restaurante
              </p>
            </div>
          </div>

          {/* Botón actualizar */}
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={cargarDatos}
              disabled={actualizando}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/30"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${actualizando ? 'animate-spin' : ''}`} />
              {actualizando ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <p className="text-xs text-zinc-500">
              {obtenerTiempoTranscurrido()}
            </p>
          </div>
        </div>

        {/* Métricas principales del día */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Ventas HOY */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Ventas HOY
                </CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                ${metricas.ventasHoy.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {metricas.cambioVentas >= 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-orange-600 font-semibold">
                      +{metricas.cambioVentas.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-500 font-semibold">
                      {metricas.cambioVentas.toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-xs text-zinc-500 ml-1">vs ayer</span>
              </div>
            </CardContent>
          </Card>

          {/* Pedidos HOY */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Pedidos HOY
                </CardTitle>
                <div className="bg-zinc-900 p-2 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-900">
                {metricas.pedidosCountHoy}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {metricas.cambioPedidos >= 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-orange-600 font-semibold">
                      +{metricas.cambioPedidos.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-500 font-semibold">
                      {metricas.cambioPedidos.toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-xs text-zinc-500 ml-1">vs ayer</span>
              </div>
            </CardContent>
          </Card>

          {/* Domicilios HOY */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Domicilios HOY
                </CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Home className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {metricas.domiciliosHoy}
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Pedidos a domicilio
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
                <div className="bg-zinc-900 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-900">
                ${Math.round(metricas.ticketPromedio).toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Por pedido
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Distribución de pedidos por tipo */}
        <Card className="mb-8 border-2 border-zinc-200">
          <CardHeader className="bg-zinc-50 border-b border-zinc-200">
            <CardTitle className="flex items-center gap-2 text-lg text-zinc-900">
              <UtensilsCrossed className="w-5 h-5 text-orange-500" />
              Distribución de Pedidos HOY
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Mesas */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 hover:shadow-lg hover:shadow-orange-500/20 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-orange-800">MESAS</span>
                  <span className="text-2xl">🪑</span>
                </div>
                <div className="text-4xl font-bold text-orange-600 mb-2">
                  {metricas.mesasCount}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-orange-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${metricas.mesasPorcentaje}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-orange-600">
                    {metricas.mesasPorcentaje.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Domicilios */}
              <div className="bg-zinc-50 border-2 border-zinc-300 rounded-xl p-4 hover:shadow-lg hover:shadow-zinc-500/20 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-zinc-800">DOMICILIOS</span>
                  <span className="text-2xl">🏠</span>
                </div>
                <div className="text-4xl font-bold text-zinc-900 mb-2">
                  {metricas.domiciliosCount}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-200 rounded-full h-2">
                    <div 
                      className="bg-zinc-900 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${metricas.domiciliosPorcentaje}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">
                    {metricas.domiciliosPorcentaje.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Para Llevar */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 hover:shadow-lg hover:shadow-orange-500/20 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-orange-800">PARA LLEVAR</span>
                  <span className="text-2xl">🛍️</span>
                </div>
                <div className="text-4xl font-bold text-orange-600 mb-2">
                  {metricas.paraLlevarCount}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-orange-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${metricas.paraLlevarPorcentaje}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-orange-600">
                    {metricas.paraLlevarPorcentaje.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Productos */}
        {topProductos.length > 0 && (
          <Card className="mb-8 border-2 border-zinc-200">
            <CardHeader className="bg-zinc-50 border-b border-zinc-200">
              <CardTitle className="flex items-center gap-2 text-lg text-zinc-900">
                <span className="text-2xl">🏆</span>
                Top 5 Productos Más Vendidos HOY
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

        {/* Logo del Negocio */}
        {negocioId && (
          <Card className="border-2 border-zinc-200">
            <CardHeader className="bg-zinc-50 border-b border-zinc-200">
              <CardTitle className="flex items-center gap-2 text-lg text-zinc-900">
                <span className="text-2xl">🏢</span>
                Configuración del Negocio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Logo actual (preview grande) */}
                <div>
                  <h3 className="font-semibold text-zinc-700 mb-3">Logo Actual</h3>
                  {logoUrl ? (
                    <div className="w-48 h-48 border-2 border-zinc-300 rounded-xl overflow-hidden bg-white shadow-lg">
                      <img 
                        src={logoUrl} 
                        alt="Logo del negocio" 
                        className="w-full h-full object-contain p-4"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-4xl mb-2 block">🏢</span>
                        <p className="text-sm text-zinc-500">Sin logo</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Componente de subida */}
                <div>
                  <SubirLogo 
                    negocioId={negocioId} 
                    logoActual={logoUrl}
                    onLogoActualizado={(newUrl) => setLogoUrl(newUrl)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}