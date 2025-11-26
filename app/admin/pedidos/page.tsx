"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Clock, Loader2, Home, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

// Tipos
interface Pedido {
  id: string;
  numero_pedido: number | null;
  mesa_id: string;
  total: number;
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
    
    // Escuchar nuevos pedidos e imprimir automáticamente
    const subscription = supabase
      .channel('pedidos-channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        (payload) => {
          console.log('🟢 EVENTO REALTIME RECIBIDO');
          console.log('🟢 Payload completo:', payload);
          console.log('🟢 Nuevo pedido:', payload.new);
          console.log('🟢 ID del pedido:', payload.new.id);
          
          cargarPedidos();
          
          // 🖨️ IMPRIMIR AUTOMÁTICAMENTE
          console.log('🟢 Llamando a imprimirPedidoAutomatico con ID:', payload.new.id);
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
  }, [filtroFecha, fechaInicio, fechaFin]);

  const cargarPedidos = async () => {
    try {
      setLoading(true);

      const { inicio, fin } = obtenerRangoFechas(); // 👈 AGREGAR ESTA LÍNEA

      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          mesas (numero),
          usuarios (nombre),
          detalle_pedidos (
            id,
            cantidad,
            notas,
            productos (nombre, precio)
          )
        `)
        .gte('created_at', inicio.toISOString())  // 👈 AGREGAR FILTRO
        .lte('created_at', fin.toISOString())     // 👈 AGREGAR FILTRO
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

  // Filtrar pedidos según el tipo seleccionado
  const pedidosFiltrados = pedidos.filter(pedido => {
    if (filtroTipo === 'todos') return true;
    
    const tipo = getTipoPedido(pedido);
    
    if (filtroTipo === 'mesas') return tipo === 'mesa';
    if (filtroTipo === 'domicilio') return tipo === 'domicilio';
    if (filtroTipo === 'para_llevar') return tipo === 'para_llevar';
    
    return true;
  });
 
  // Función para imprimir automáticamente
  const imprimirPedidoAutomatico = async (pedidoId: string) => {
    try {
      console.log('🔵 PASO 1: imprimirPedidoAutomatico ejecutándose');
      console.log('🔵 pedidoId:', pedidoId);
      
      // Obtener datos completos del pedido
      const { data: pedido, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          mesas (numero),
          usuarios (nombre),
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
        body: JSON.stringify({ pedido: datosImpresion })
      });

      console.log('🔵 PASO 6: Response status:', response.status);

      const resultado = await response.json();
      console.log('🔵 PASO 7: Resultado:', resultado);
      
      if (resultado.success) {
        console.log('✅ Pedido impreso automáticamente');
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
      return <ShoppingBag className="w-6 h-6 text-blue-600" />;
    }
    return (
      <span className="text-2xl font-bold text-purple-600">
        {pedido.mesas.numero}
      </span>
    );
  };

  // Obtener color de fondo según el tipo
  const getColorFondo = (pedido: Pedido) => {
    const tipo = getTipoPedido(pedido);
    
    if (tipo === 'domicilio') return 'from-orange-100 to-orange-200';
    if (tipo === 'para_llevar') return 'from-blue-100 to-blue-200';
    return 'from-purple-100 to-pink-100';
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
    // Si no tiene número, usar últimos 6 caracteres del ID
    return `#${pedido.id.slice(-6).toUpperCase()}`;
  };

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
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Pedidos Recientes
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* 📅 FILTROS DE FECHA */}
            <div className="bg-white rounded-xl shadow-md p-3 border border-gray-200 w-full sm:w-auto">
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  size="sm"
                  variant={filtroFecha === "hoy" ? "default" : "outline"}
                  onClick={() => setFiltroFecha("hoy")}
                  className={filtroFecha === "hoy" ? "bg-gradient-to-r from-purple-500 to-pink-600" : ""}
                >
                  📅 Hoy
                </Button>
                <Button
                  size="sm"
                  variant={filtroFecha === "ayer" ? "default" : "outline"}
                  onClick={() => setFiltroFecha("ayer")}
                  className={filtroFecha === "ayer" ? "bg-gradient-to-r from-purple-500 to-pink-600" : ""}
                >
                  📆 Ayer
                </Button>
                <Button
                  size="sm"
                  variant={filtroFecha === "semana" ? "default" : "outline"}
                  onClick={() => setFiltroFecha("semana")}
                  className={filtroFecha === "semana" ? "bg-gradient-to-r from-purple-500 to-pink-600" : ""}
                >
                  📊 Semana
                </Button>
                <Button
                  size="sm"
                  variant={filtroFecha === "mes" ? "default" : "outline"}
                  onClick={() => setFiltroFecha("mes")}
                  className={filtroFecha === "mes" ? "bg-gradient-to-r from-purple-500 to-pink-600" : ""}
                >
                  📈 Mes
                </Button>
                <Button
                  size="sm"
                  variant={filtroFecha === "personalizado" ? "default" : "outline"}
                  onClick={() => setFiltroFecha("personalizado")}
                  className={filtroFecha === "personalizado" ? "bg-gradient-to-r from-purple-500 to-pink-600" : ""}
                >
                  🗓️ Rango
                </Button>
                <Button
                  size="sm"
                  variant={filtroFecha === "todos" ? "default" : "outline"}
                  onClick={() => setFiltroFecha("todos")}
                  className={filtroFecha === "todos" ? "bg-gradient-to-r from-purple-500 to-pink-600" : ""}
                >
                  📋 Todos
                </Button>
              </div>

              {/* Selector de rango personalizado */}
              {filtroFecha === "personalizado" && (
                <div className="flex flex-col sm:flex-row gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Inicio
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fin
                    </label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filtro por tipo (mantener el Select existente) */}
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full sm:w-56 h-12 border-gray-200 focus:ring-2 focus:ring-purple-500">
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
                    <span className="text-purple-600">🪑</span>
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
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>Para Llevar</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="bg-green-100 border border-green-300 rounded-lg px-4 py-2">
              <p className="text-green-800 text-sm font-semibold whitespace-nowrap">
                🖨️ Impresión activa
              </p>
            </div>
          </div>
        </div>

        {/* Grid de pedidos */}
        {pedidosFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {pedidosFiltrados.map((pedido) => (
              <Card key={pedido.id} className="hover:shadow-xl transition-all duration-300 border-2 relative">
                {/* Número de pedido en esquina */}
                <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  {getNumeroPedido(pedido)}
                </div>

                <CardContent className="p-6 pt-12">
                  {/* Header del pedido */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`bg-gradient-to-br ${getColorFondo(pedido)} p-3 rounded-xl`}>
                        {getIconoTipo(pedido)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">
                          {getTitulo(pedido)}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatearHora(pedido.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info domicilio */}
                  {pedido.es_domicilio && pedido.direccion_domicilio && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-gray-700">
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
                          <span className="text-purple-600 font-semibold">{detalle.cantidad}x</span>{' '}
                          <span className="text-gray-700">{detalle.productos.nombre}</span>
                          {detalle.notas && (
                            <p className="text-xs text-orange-600 italic ml-5">
                              • {detalle.notas}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold text-gray-800 ml-2">
                          ${(detalle.productos.precio * detalle.cantidad).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="pt-3 border-t-2 border-gray-200">
                    {pedido.es_domicilio && pedido.valor_domicilio > 0 ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Subtotal:</span>
                          <span>${(pedido.total - pedido.valor_domicilio).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Domicilio:</span>
                          <span>${pedido.valor_domicilio.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                          <span className="font-bold text-gray-700">TOTAL:</span>
                          <span className="text-2xl font-bold text-green-700">
                            ${pedido.total.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-700">TOTAL:</span>
                        <span className="text-2xl font-bold text-green-700">
                          ${pedido.total.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mesero */}
                  {pedido.usuarios && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Atendió: <span className="font-semibold text-gray-700">{pedido.usuarios.nombre}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay pedidos
            </h3>
            <p className="text-gray-500">
              {filtroTipo === 'todos' 
                ? 'Los pedidos aparecerán aquí automáticamente' 
                : `No hay pedidos de tipo "${filtroTipo}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}