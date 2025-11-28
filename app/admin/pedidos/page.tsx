"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Clock, Loader2, Home, ShoppingBag, UtensilsCrossed, X, Printer, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Tipos
interface Pedido {
  id: string;
  numero_pedido: number | null;
  mesa_id: string;
  total: number;
  estado: string;
  es_domicilio: boolean;              
  direccion_domicilio: string | null; 
  valor_domicilio: number;
  medio_pago: string;
  cliente_id: string | null;
  created_at: string;
  mesas: {
    numero: string;
  };
  usuarios: {
    nombre: string;
  } | null;
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

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("hoy");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pedidoACancelar, setPedidoACancelar] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

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
      case "todos":
        // Para "todos", traer últimos 30 días
        inicio.setDate(ahora.getDate() - 30);
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
    }

    return { inicio, fin };
  };

  useEffect(() => {
    console.log('🟢 INICIANDO: useEffect de Realtime');
    
    cargarPedidos();
    
    // Obtener negocio_id para filtrar Realtime
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!usuarioData) return;

      const negocioId = usuarioData.negocio_id;

      // Escuchar nuevos pedidos DEL NEGOCIO
      const subscription = supabase
        .channel('pedidos-channel')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'pedidos',
            filter: `negocio_id=eq.${negocioId}`
          },
          (payload) => {
            console.log('🟢 Nuevo pedido del negocio:', payload.new);
            cargarPedidos();
            imprimirPedidoAutomatico(payload.new.id);
          }
        )
        .subscribe((status) => {
          console.log('🟢 Estado de suscripción Realtime:', status);
        });

      return () => {
        console.log('🟢 LIMPIANDO: Cerrando suscripción Realtime');
        subscription.unsubscribe();
      };
    };

    setupRealtime();
  }, [filtroFecha, fechaInicio, fechaFin]);

  const cargarPedidos = async () => {
    try {
      setLoading(true);

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Obtener negocio_id
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError || !usuarioData) {
        console.error('Error obteniendo usuario');
        setLoading(false);
        return;
      }

      const negocioId = usuarioData.negocio_id;
      const { inicio, fin } = obtenerRangoFechas();

      // Cargar pedidos del negocio CON CLIENTE
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          mesas (numero),
          usuarios (nombre),
          clientes (nombre),
          detalle_pedidos (
            id,
            cantidad,
            notas,
            productos (nombre, precio)
          )
        `)
        .eq('negocio_id', negocioId)
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fin.toISOString())
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

  // Función para determinar el tipo de pedido
  const getTipoPedido = (pedido: Pedido): 'mesa' | 'domicilio' | 'para_llevar' => {
    const mesaNumero = pedido.mesas.numero.toLowerCase();
    
    if (mesaNumero.includes('domicilio')) return 'domicilio';
    if (mesaNumero.includes('llevar')) return 'para_llevar';
    return 'mesa';
  };

  // Filtrar pedidos según el tipo seleccionado Y búsqueda
  const pedidosFiltrados = pedidos.filter(pedido => {
    // Filtro por tipo
    if (filtroTipo !== 'todos') {
      const tipo = getTipoPedido(pedido);
      
      if (filtroTipo === 'mesas' && tipo !== 'mesa') return false;
      if (filtroTipo === 'domicilio' && tipo !== 'domicilio') return false;
      if (filtroTipo === 'para_llevar' && tipo !== 'para_llevar') return false;
    }

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const searchLower = busqueda.toLowerCase();
      const numeroPedido = pedido.numero_pedido?.toString() || pedido.id.slice(-6);
      const nombreCliente = pedido.clientes?.nombre?.toLowerCase() || '';
      const nombreMesero = pedido.usuarios?.nombre?.toLowerCase() || '';
      const mesaNumero = pedido.mesas.numero.toLowerCase();

      return (
        numeroPedido.includes(searchLower) ||
        nombreCliente.includes(searchLower) ||
        nombreMesero.includes(searchLower) ||
        mesaNumero.includes(searchLower)
      );
    }

    return true;
  });
 
  // 🆕 Función para cancelar pedido
  const cancelarPedido = async (pedidoId: string) => {
    try {
      setCancelando(true);

      const { error } = await supabase
        .from('pedidos')
        .update({ estado: 'cancelado' })
        .eq('id', pedidoId);

      if (error) throw error;

      console.log('✅ Pedido cancelado exitosamente');
      await cargarPedidos();
      setPedidoACancelar(null);
      
    } catch (error) {
      console.error('❌ Error cancelando pedido:', error);
      alert('Error al cancelar el pedido');
    } finally {
      setCancelando(false);
    }
  };

  // 🆕 Función para reimprimir pedido
  const reimprimirPedido = async (pedidoId: string) => {
    try {
      console.log('🔁 Reimprimiendo pedido:', pedidoId);
      await imprimirPedidoAutomatico(pedidoId);
    } catch (error) {
      console.error('❌ Error reimprimiendo:', error);
      alert('Error al reimprimir el pedido');
    }
  };

  // Función para imprimir automáticamente
  const imprimirPedidoAutomatico = async (pedidoId: string) => {
    try {
      console.log('🔵 PASO 1: imprimirPedidoAutomatico ejecutándose');
      console.log('🔵 pedidoId:', pedidoId);
      
      // Obtener datos completos del pedido CON CLIENTE
      const { data: pedido, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          negocio_id,
          mesas (numero),
          usuarios (nombre),
          clientes (nombre),
          detalle_pedidos (
            cantidad,
            notas,
            productos (nombre, precio)
          )
        `)
        .eq('id', pedidoId)
        .single();

      console.log('🔵 PASO 2: Datos del pedido:', pedido);

      if (error || !pedido) {
        console.error('❌ Error obteniendo pedido:', error);
        return;
      }

      // Obtener datos del negocio
      const { data: negocioData } = await supabase
        .from('negocios')
        .select('nombre, telefono, direccion')
        .eq('id', pedido.negocio_id)
        .single();

      console.log('🔵 PASO 2.5: Datos del negocio:', negocioData);

      if (error || !pedido) {
        console.error('❌ Error obteniendo pedido:', error);
        return;
      }

      const numeroPedido = pedido.numero_pedido || pedido.id.slice(-6).toUpperCase();
      console.log('🔵 PASO 3: Número de pedido:', numeroPedido);

      // Formatear fecha
      const ahora = new Date(pedido.created_at);
      const dia = ahora.getDate().toString().padStart(2, '0');
      const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
      const anio = ahora.getFullYear();
      let hora = ahora.getHours();
      const minutos = ahora.getMinutes().toString().padStart(2, '0');
      const ampm = hora >= 12 ? 'PM' : 'AM';
      hora = hora % 12 || 12;
      const fechaFormateada = `${dia}/${mes}/${anio}, ${hora}:${minutos} ${ampm}`;

      const datosImpresion = {
        id: pedido.id,
        numero: numeroPedido,
        mesa: pedido.mesas?.numero || 'N/A',
        mesero: pedido.usuarios?.nombre || 'N/A',
        cliente: pedido.clientes?.nombre || 'N/A', // 🆕 NOMBRE DEL CLIENTE
        fecha: fechaFormateada,
        items: pedido.detalle_pedidos.map((d: any) => ({
          cantidad: d.cantidad,
          nombre: d.productos.nombre,
          precio: d.productos.precio,
          notas: d.notas
        })),
        total: pedido.total,
        es_domicilio: pedido.es_domicilio,
        direccion: pedido.direccion_domicilio,
        valor_domicilio: pedido.valor_domicilio,
        medio_pago: pedido.medio_pago
      };

      console.log('🔵 PASO 4: Datos preparados:', datosImpresion);
      console.log('🔵 PASO 5: Enviando a http://localhost:3001/print');

      const response = await fetch('http://localhost:3001/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pedido: datosImpresion,
          negocio: {
            nombre: negocioData?.nombre || 'DishHub',
            telefono: negocioData?.telefono || null,
            direccion: negocioData?.direccion || null
          }
        })
      });

      console.log('🔵 PASO 6: Response status:', response.status);

      const resultado = await response.json();
      console.log('🔵 PASO 7: Resultado:', resultado);
      
      if (resultado.success) {
        console.log('✅ Pedido impreso automáticamente');
        
        // 🆕 CAMBIAR ESTADO A 'VENDIDO' DESPUÉS DE IMPRIMIR EXITOSAMENTE
        const { error: updateError } = await supabase
          .from('pedidos')
          .update({ estado: 'vendido' })
          .eq('id', pedidoId);

        if (updateError) {
          console.error('⚠️ Error actualizando estado a vendido:', updateError);
        } else {
          console.log('✅ Estado cambiado a VENDIDO');
          await cargarPedidos(); // Recargar pedidos para reflejar el cambio
        }
      } else {
        console.error('⚠️ Error al imprimir:', resultado.error);
      }
      
    } catch (error) {
      console.error('🔵 ERROR CATCH:', error);
    }
  };

  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
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

  // Obtener badge de estado
  const getBadgeEstado = (estado: string) => {
    if (estado === 'cancelado') {
      return (
        <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
          ❌ CANCELADO
        </div>
      );
    }
    if (estado === 'vendido') {
      return (
        <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
          ✅ VENDIDO
        </div>
      );
    }
    return null;
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
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Pedidos Recientes
            </h1>
            <p className="text-zinc-600 text-sm mt-1">
              {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* 🔍 Barra de búsqueda */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Buscar pedido, cliente, mesero..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 border-zinc-300 focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* 📅 FILTROS DE FECHA */}
            <div className="bg-white rounded-xl shadow-md p-3 border-2 border-zinc-200 w-full sm:w-auto">
              <div className="flex flex-wrap gap-2 mb-3">
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
                <Button
                  size="sm"
                  variant={filtroFecha === "todos" ? "default" : "outline"}
                  onClick={() => setFiltroFecha("todos")}
                  className={filtroFecha === "todos" ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600" : "border-zinc-300 hover:bg-zinc-50"}
                >
                  📋 Todos
                </Button>
              </div>

              {/* Selector de rango personalizado */}
              {filtroFecha === "personalizado" && (
                <div className="flex flex-col sm:flex-row gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Inicio
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Fin
                    </label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filtro por tipo */}
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full sm:w-56 h-12 border-zinc-300 focus:ring-2 focus:ring-orange-500">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Todos los pedidos</span>
                  </div>
                </SelectItem>
                <SelectItem value="mesas">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-600">🪑</span>
                    <span>Mesas</span>
                  </div>
                </SelectItem>
                <SelectItem value="domicilio">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-orange-600" />
                    <span>Domicilios</span>
                  </div>
                </SelectItem>
                <SelectItem value="para_llevar">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-zinc-700" />
                    <span>Para Llevar</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="bg-orange-50 border border-orange-300 rounded-lg px-4 py-2">
              <p className="text-orange-800 text-sm font-semibold whitespace-nowrap">
                🖨️ Impresión activa
              </p>
            </div>
          </div>
        </div>

        {/* Grid de pedidos */}
        {pedidosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {pedidosFiltrados.map((pedido) => (
              <Card key={pedido.id} className="hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-300 border-2 border-zinc-200 relative">
                {/* Badge de estado */}
                {getBadgeEstado(pedido.estado)}

                {/* Número de pedido en esquina */}
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
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {formatearHora(pedido.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info domicilio */}
                  {pedido.es_domicilio && pedido.direccion_domicilio && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-zinc-700">
                        <strong>📍 Dirección:</strong><br />
                        {pedido.direccion_domicilio}
                      </p>
                    </div>
                  )}

                  {/* Items del pedido */}
                  <div className="space-y-2 mb-4">
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

                  {/* Total */}
                  <div className="pt-3 border-t-2 border-zinc-200">
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
                        <div className="flex justify-between items-center pt-2 border-t border-zinc-300">
                          <span className="font-bold text-zinc-900">TOTAL:</span>
                          <span className="text-2xl font-bold text-orange-600">
                            ${pedido.total.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-zinc-900">TOTAL:</span>
                        <span className="text-2xl font-bold text-orange-600">
                          ${pedido.total.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cliente y Mesero */}
                  <div className="mt-3 pt-3 border-t border-zinc-200 space-y-1">
                    {pedido.clientes && (
                      <p className="text-xs text-zinc-500">
                        Cliente: <span className="font-semibold text-zinc-900">{pedido.clientes.nombre}</span>
                      </p>
                    )}
                    {pedido.usuarios && (
                      <p className="text-xs text-zinc-500">
                        Atendió: <span className="font-semibold text-zinc-900">{pedido.usuarios.nombre}</span>
                      </p>
                    )}
                  </div>

                  {/* 🆕 Botones Cancelar y Reimprimir */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reimprimirPedido(pedido.id)}
                      className="flex-1 border-orange-300 hover:bg-orange-50 hover:border-orange-400"
                      disabled={pedido.estado === 'cancelado'}
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Reimprimir
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPedidoACancelar(pedido.id)}
                      className="flex-1 bg-red-500 hover:bg-red-600"
                      disabled={pedido.estado === 'cancelado'}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-zinc-200">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">
              No hay pedidos
            </h3>
            <p className="text-zinc-600">
              {busqueda 
                ? `No se encontraron resultados para "${busqueda}"` 
                : filtroTipo === 'todos' 
                ? 'Los pedidos aparecerán aquí automáticamente' 
                : `No hay pedidos de tipo "${filtroTipo}"`}
            </p>
          </div>
        )}
      </div>

      {/* 🆕 Dialog Cancelar Pedido */}
      <AlertDialog open={!!pedidoACancelar} onOpenChange={() => setPedidoACancelar(null)}>
        <AlertDialogContent className="border-2 border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900">¿Cancelar este pedido?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600">
              Esta acción marcará el pedido como cancelado y NO se contabilizará en las ventas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelando} className="border-zinc-300">
              No, volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pedidoACancelar && cancelarPedido(pedidoACancelar)}
              disabled={cancelando}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Sí, cancelar pedido"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}