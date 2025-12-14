"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, Loader2, Home, ShoppingBag, TrendingUp, DollarSign, Search, Calendar, Plus, Minus, StickyNote } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast, Toaster } from "sonner";

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
  negocio_id: string;
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

interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  activo: boolean;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
  categoria_id: string;
  categorias?: {
    id: string;
    nombre: string;
    icono: string;
    color: string;
  } | null;
}

interface ItemPedido {
  producto: Producto;
  cantidad: number;
  notas: string;
}

interface GrupoProductos {
  productos: Producto[];
  config: {
    icono: string;
    color: string;
  };
}

// 🆕 CAMBIO 1: Modificar interfaz de estadísticas (solo visual)
interface EstadisticasVentas {
  cantidadPedidos: number;
  totalItems: number;
  promedioItems: number;
}

export default function VentasMeseroPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState("hoy");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [nombreMesero, setNombreMesero] = useState("");

  // 🆕 Estados para agregar productos
  const [modalAgregarOpen, setModalAgregarOpen] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);
  const [productosAdicionales, setProductosAdicionales] = useState<ItemPedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [busquedaProductos, setBusquedaProductos] = useState("");
  const [agregando, setAgregando] = useState(false);
  
  // Modal de notas para producto individual
  const [modalNotasOpen, setModalNotasOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadTemp, setCantidadTemp] = useState(1);
  const [notasTemp, setNotasTemp] = useState("");

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

  useEffect(() => {
    console.log('🟢 MESERO: Configurando Realtime para impresión');
    
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

      // 🔥 Escuchar UPDATES en pedidos (cuando se agregan productos)
      const subscription = supabase
        .channel('mesero-pedidos-updates')
        .on('postgres_changes', 
          { 
            event: 'UPDATE',
            schema: 'public', 
            table: 'pedidos',
            filter: `negocio_id=eq.${negocioId}`
          },
          (payload) => {
            console.log('🟢 MESERO: Pedido actualizado:', payload.new);
            
            if (payload.old.total !== payload.new.total) {
              console.log('🟢 MESERO: Total cambió, reimprimiendo...');
              imprimirPedidoAutomatico(payload.new.id);
            }
          }
        )
        .subscribe((status) => {
          console.log('🟢 MESERO: Estado Realtime:', status);
        });

      return () => {
        console.log('🟢 MESERO: Limpiando suscripción Realtime');
        subscription.unsubscribe();
      };
    };

    setupRealtime();
  }, []);

  const cargarVentas = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

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

  const abrirModalAgregarProductos = async (pedido: Pedido) => {
    setPedidoSeleccionado(pedido);
    
    if (productos.length === 0) {
      await cargarMenuCompleto();
    }
    
    setModalAgregarOpen(true);
  };

  const cargarMenuCompleto = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!usuarioData) return;

      const { data: productosData } = await supabase
        .from('productos')
        .select(`
          id,
          nombre,
          precio,
          activo,
          categoria_id,
          categorias (id, nombre, icono, color)
        `)
        .eq('activo', true)
        .eq('negocio_id', usuarioData.negocio_id)
        .order('nombre');

      const { data: categoriasData } = await supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .eq('negocio_id', usuarioData.negocio_id)
        .order('nombre');

      setProductos(productosData as any || []);
      setCategorias(categoriasData as any || []);
    } catch (error) {
      console.error('Error cargando menú:', error);
    }
  };

  const agregarProductoConNotas = (producto: Producto) => {
    setProductoSeleccionado(producto);
    
    const itemExistente = productosAdicionales.find(item => item.producto.id === producto.id);
    if (itemExistente) {
      setCantidadTemp(itemExistente.cantidad);
      setNotasTemp(itemExistente.notas);
    } else {
      setCantidadTemp(1);
      setNotasTemp("");
    }
    
    setModalNotasOpen(true);
  };

  const confirmarProductoConNotas = () => {
    if (!productoSeleccionado || cantidadTemp <= 0) return;

    setProductosAdicionales(prev => {
      const existe = prev.find(item => item.producto.id === productoSeleccionado.id);
      
      if (existe) {
        return prev.map(item =>
          item.producto.id === productoSeleccionado.id
            ? { ...item, cantidad: cantidadTemp, notas: notasTemp }
            : item
        );
      }
      
      return [...prev, { 
        producto: productoSeleccionado, 
        cantidad: cantidadTemp,
        notas: notasTemp 
      }];
    });

    setModalNotasOpen(false);
    setProductoSeleccionado(null);
    setCantidadTemp(1);
    setNotasTemp("");
  };

  const agregarProductosAlPedido = async () => {
    if (!pedidoSeleccionado || productosAdicionales.length === 0) {
      toast.error('Debes seleccionar al menos un producto');
      return;
    }

    try {
      setAgregando(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAgregando(false);
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('auth_user_id', user.id)
        .single();

      if (!usuarioData) {
        setAgregando(false);
        return;
      }

      const nuevosDetalles = productosAdicionales.map(item => ({
        pedido_id: pedidoSeleccionado.id,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
        subtotal: item.producto.precio * item.cantidad,
        notas: item.notas || null
      }));

      const { error: errorDetalles } = await supabase
        .from('detalle_pedidos')
        .insert(nuevosDetalles);

      if (errorDetalles) throw errorDetalles;

      const totalAdicional = productosAdicionales.reduce(
        (sum, item) => sum + (item.producto.precio * item.cantidad), 
        0
      );

      const nuevoTotal = pedidoSeleccionado.total + totalAdicional;

      const { error: errorUpdate } = await supabase
        .from('pedidos')
        .update({ 
          total: nuevoTotal,
          mesero_modificado_id: usuarioData.id
        })
        .eq('id', pedidoSeleccionado.id);

      if (errorUpdate) throw errorUpdate;

      const impresoraDisponible = await reimprimirPedidoConNuevos(pedidoSeleccionado.id);

      setProductosAdicionales([]);
      setModalAgregarOpen(false);
      setPedidoSeleccionado(null);
      setBusquedaProductos("");
      await cargarVentas();

      if (impresoraDisponible) {
        toast.success('✅ Productos agregados e impresión enviada', {
          duration: 4000
        });
      } else {
        toast.success('✅ Productos agregados (impresora no disponible)', {
          description: 'Los productos se agregaron correctamente. Puedes reimprimir manualmente desde Admin.',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error agregando productos:', error);
      toast.error('Error al agregar productos');
    } finally {
      setAgregando(false);
    }
  };

  const reimprimirPedidoConNuevos = async (pedidoId: string): Promise<boolean> => {
    try {
      console.log('🔁 Reimprimiendo pedido con productos nuevos:', pedidoId);

      const { data: pedido } = await supabase
        .from('pedidos')
        .select(`
          *,
          mesas (numero),
          clientes (nombre),
          detalle_pedidos (
            cantidad,
            notas,
            productos (nombre, precio)
          )
        `)
        .eq('id', pedidoId)
        .single();

      if (pedido && pedido.mesero_id) {
        const { data: meseroData } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', pedido.mesero_id)
          .single();
        
        pedido.usuarios = meseroData;
      }

      if (!pedido) return false;

      const { data: negocioData } = await supabase
        .from('negocios')
        .select('nombre, telefono, direccion')
        .eq('id', pedido.negocio_id)
        .single();

      const numeroPedido = pedido.numero_pedido || pedido.id.slice(-6).toUpperCase();
      
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
        cliente: pedido.clientes?.nombre || 'N/A',
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
        medio_pago: pedido.medio_pago,
        notas: pedido.notas || null
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const resultado = await response.json();
      
      if (resultado.success) {
        console.log('✅ Pedido reimpreso con productos nuevos');
        return true;
      } else {
        console.error('⚠️ Error al imprimir:', resultado.error);
        return false;
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('fetch')) {
        console.log('⚠️ Servidor de impresión no disponible');
        return false;
      }
      console.error('Error reimprimiendo:', error);
      return false;
    }
  };

  const imprimirPedidoAutomatico = async (pedidoId: string) => {
    try {
      console.log('🖨️ MESERO: Imprimiendo pedido automáticamente:', pedidoId);
      
      const { data: pedido, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          negocio_id,
          mesas (numero),
          clientes (nombre),
          detalle_pedidos (
            cantidad,
            notas,
            productos (nombre, precio)
          )
        `)
        .eq('id', pedidoId)
        .single();

      if (error || !pedido) {
        console.error('❌ MESERO: Error obteniendo pedido:', error);
        return;
      }

      if (pedido.mesero_id) {
        const { data: meseroData } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', pedido.mesero_id)
          .single();
        
        pedido.usuarios = meseroData;
      }

      const { data: negocioData } = await supabase
        .from('negocios')
        .select('nombre, telefono, direccion')
        .eq('id', pedido.negocio_id)
        .single();

      const numeroPedido = pedido.numero_pedido || pedido.id.slice(-6).toUpperCase();

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
        cliente: pedido.clientes?.nombre || 'N/A',
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
        medio_pago: pedido.medio_pago,
        notas: pedido.notas || null
      };

      console.log('🖨️ MESERO: Enviando a imprimir...');

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

      const resultado = await response.json();
      
      if (resultado.success) {
        console.log('✅ MESERO: Pedido impreso automáticamente');
      } else {
        console.error('⚠️ MESERO: Error al imprimir:', resultado.error);
      }
      
    } catch (error) {
      console.error('❌ MESERO: Error en impresión automática:', error);
    }
  };

  const productosFiltradosModal = useMemo(() => {
    return productos.filter((p) => {
      const busquedaLower = busquedaProductos.toLowerCase();
      const nombreProducto = p.nombre.toLowerCase();
      const categoriaNombre = p.categorias?.nombre?.toLowerCase() || '';
      
      return nombreProducto.includes(busquedaLower) || categoriaNombre.includes(busquedaLower);
    });
  }, [busquedaProductos, productos]);

  const productosAgrupadosModal = useMemo(() => {
    const grupos: Record<string, GrupoProductos> = {};
    
    productosFiltradosModal.forEach((producto) => {
      const catNombre = producto.categorias?.nombre ?? "Sin categoría";
      
      if (!grupos[catNombre]) {
        grupos[catNombre] = {
          productos: [],
          config: {
            icono: producto.categorias?.icono ?? "📦",
            color: producto.categorias?.color ?? "from-gray-500 to-gray-600"
          }
        };
      }
      
      grupos[catNombre].productos.push(producto);
    });
    
    Object.keys(grupos).forEach(catNombre => {
      grupos[catNombre].productos.sort((a, b) => b.precio - a.precio);
    });
    
    const gruposOrdenados = Object.keys(grupos)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = grupos[key];
        return acc;
      }, {} as Record<string, GrupoProductos>);
    
    return gruposOrdenados;
  }, [productosFiltradosModal]);

  const getTipoPedido = (pedido: Pedido): 'mesa' | 'domicilio' | 'para_llevar' => {
    const mesaNumero = pedido.mesas.numero.toLowerCase();
    
    if (mesaNumero.includes('domicilio')) return 'domicilio';
    if (mesaNumero.includes('llevar')) return 'para_llevar';
    return 'mesa';
  };

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

  // 🆕 CAMBIO 2: Calcular estadísticas SIN PRECIOS (solo cantidades)
  const estadisticas: EstadisticasVentas = useMemo(() => {
    const cantidadPedidos = pedidosFiltrados.length;
    
    // Calcular total de items vendidos
    const totalItems = pedidosFiltrados.reduce((sum, pedido) => {
      return sum + pedido.detalle_pedidos.reduce((itemSum, detalle) => {
        return itemSum + detalle.cantidad;
      }, 0);
    }, 0);
    
    const promedioItems = cantidadPedidos > 0 ? totalItems / cantidadPedidos : 0;

    return {
      cantidadPedidos,
      totalItems,
      promedioItems
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

  const getColorFondo = (pedido: Pedido) => {
    const tipo = getTipoPedido(pedido);
    
    if (tipo === 'domicilio') return 'from-orange-100 to-orange-200';
    if (tipo === 'para_llevar') return 'from-zinc-100 to-zinc-200';
    return 'from-orange-50 to-red-50';
  };

  const getTitulo = (pedido: Pedido) => {
    const tipo = getTipoPedido(pedido);
    
    if (tipo === 'domicilio') return '🏠 Domicilio';
    if (tipo === 'para_llevar') return '🛍️ Para Llevar';
    return `Mesa ${pedido.mesas.numero}`;
  };

  const getNumeroPedido = (pedido: Pedido) => {
    if (pedido.numero_pedido) return `#${pedido.numero_pedido}`;
    return `#${pedido.id.slice(-6).toUpperCase()}`;
  };

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
                Mis Pedidos
              </h1>
              <p className="text-zinc-600 text-sm">
                {nombreMesero} - {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'venta' : 'ventas'}
              </p>
            </div>
          </div>
        </div>

        {/* 🆕 CAMBIO 3: Tarjetas de Estadísticas SIN PRECIOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* 1. Pedidos Realizados */}
          <Card className="border-2 border-blue-200 shadow-lg shadow-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Pedidos Realizados</p>
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

          {/* 2. Items Vendidos */}
          <Card className="border-2 border-orange-200 shadow-lg shadow-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Items Vendidos</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {estadisticas.totalItems}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Items por Pedido */}
          <Card className="border-2 border-green-200 shadow-lg shadow-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 mb-1">Items por Pedido</p>
                  <p className="text-2xl font-bold text-green-600">
                    {estadisticas.promedioItems.toFixed(1)}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border-2 border-yellow-200">
          <div className="flex flex-col lg:flex-row gap-3">
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
                <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  {getNumeroPedido(pedido)}
                </div>

                <CardContent className="p-6 pt-12">
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

                  {pedido.clientes && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2 mb-3">
                      <p className="text-xs text-zinc-600">
                        👤 <span className="font-semibold text-zinc-900">{pedido.clientes.nombre}</span>
                      </p>
                    </div>
                  )}

                  {pedido.es_domicilio && pedido.direccion_domicilio && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-3">
                      <p className="text-xs text-zinc-700">
                        <strong>📍 Dirección:</strong><br />
                        {pedido.direccion_domicilio}
                      </p>
                    </div>
                  )}

                  {/* 🆕 CAMBIO 4: Items SIN PRECIOS */}
                  <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                    {pedido.detalle_pedidos.map((detalle) => (
                      <div key={detalle.id} className="text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-orange-600 font-semibold">{detalle.cantidad}x</span>
                          <span className="text-zinc-900 flex-1">{detalle.productos.nombre}</span>
                        </div>
                        {detalle.notas && (
                          <p className="text-xs text-orange-600 italic ml-5 mt-1">
                            • {detalle.notas}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 🆕 CAMBIO 5: Resumen SIN PRECIOS */}
                  <div className="pt-3 border-t-2 border-zinc-200 space-y-2">
                    {/* Cantidad de items */}
                    <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
                      <span className="text-sm text-zinc-700">📋 Total de items:</span>
                      <span className="font-bold text-blue-700">
                        {pedido.detalle_pedidos.reduce((sum, d) => sum + d.cantidad, 0)}
                      </span>
                    </div>

                    {/* Info domicilio */}
                    {pedido.es_domicilio && (
                      <div className="flex items-center justify-center bg-orange-50 rounded-lg p-2">
                        <span className="text-sm text-orange-700 font-medium">
                          🏍️ Incluye domicilio
                        </span>
                      </div>
                    )}

                    {/* Medio de pago */}
                    <div className="flex items-center justify-center gap-2 bg-zinc-100 rounded-lg p-2">
                      <span className="text-lg">{getIconoMedioPago(pedido.medio_pago)}</span>
                      <span className="text-xs font-semibold text-zinc-700 capitalize">
                        Pago: {pedido.medio_pago}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      size="sm"
                      onClick={() => abrirModalAgregarProductos(pedido)}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar productos
                    </Button>
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

      {/* Modal Agregar Productos */}
      <Dialog open={modalAgregarOpen} onOpenChange={setModalAgregarOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Agregar productos al pedido {pedidoSeleccionado && getNumeroPedido(pedidoSeleccionado)}
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar producto..."
              value={busquedaProductos}
              onChange={(e) => setBusquedaProductos(e.target.value)}
              className="pl-10 h-11 border-gray-200 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {Object.keys(productosAgrupadosModal).length > 0 ? (
              Object.entries(productosAgrupadosModal).map(([catNombre, grupo]) => (
                <div key={catNombre}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`bg-gradient-to-r ${grupo.config.color} p-2 rounded-lg shadow`}>
                      <span className="text-xl">{grupo.config.icono}</span>
                    </div>
                    <h3 className="font-bold text-gray-800">{catNombre}</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {grupo.productos.map((producto) => {
                      const enCarrito = productosAdicionales.find(item => item.producto.id === producto.id);
                      
                      return (
                        <Card 
                          key={producto.id}
                          className={`cursor-pointer transition-all ${
                            enCarrito 
                              ? 'border-2 border-green-400 shadow-lg' 
                              : 'border border-gray-200 hover:border-orange-300 hover:shadow-md'
                          }`}
                          onClick={() => agregarProductoConNotas(producto)}
                        >
                          <div className={`h-2 bg-gradient-to-r ${grupo.config.color}`}></div>
                          <CardContent className="p-3">
                            <h4 className="font-semibold text-sm mb-1 line-clamp-2 min-h-[40px]">
                              {producto.nombre}
                            </h4>
                            <p className="text-green-700 font-bold text-sm">
                              ${producto.precio.toLocaleString()}
                            </p>
                            {enCarrito && (
                              <div className="mt-2 bg-green-100 rounded-lg p-1 text-center">
                                <span className="text-xs font-bold text-green-700">
                                  {enCarrito.cantidad}x
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>

          {productosAdicionales.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <h4 className="font-bold text-green-800 mb-2">
                Productos a agregar ({productosAdicionales.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {productosAdicionales.map((item) => (
                  <div key={item.producto.id} className="flex justify-between items-start text-sm bg-white p-2 rounded">
                    <div className="flex-1">
                      <span className="font-semibold text-green-700">{item.cantidad}x</span>{' '}
                      <span className="text-gray-900">{item.producto.nombre}</span>
                      {item.notas && (
                        <p className="text-xs text-orange-600 italic ml-5">• {item.notas}</p>
                      )}
                    </div>
                    <span className="font-bold text-green-700 ml-2">
                      ${(item.producto.precio * item.cantidad).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-green-300 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total adicional:</span>
                <span className="text-xl font-bold text-green-700">
                  ${productosAdicionales.reduce((sum, item) => 
                    sum + (item.producto.precio * item.cantidad), 0
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setModalAgregarOpen(false);
                setProductosAdicionales([]);
                setBusquedaProductos("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={agregarProductosAlPedido}
              disabled={productosAdicionales.length === 0 || agregando}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              {agregando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar al Pedido ({productosAdicionales.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Notas Producto */}
      <Dialog open={modalNotasOpen} onOpenChange={setModalNotasOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {productoSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad</label>
              <div className="flex items-center justify-center gap-4 bg-gray-100 rounded-lg p-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCantidadTemp(Math.max(1, cantidadTemp - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold w-12 text-center">{cantidadTemp}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCantidadTemp(cantidadTemp + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                Notas especiales (opcional)
              </label>
              <Textarea
                placeholder="Ej: Sin cebolla, sin queso, término medio..."
                value={notasTemp}
                onChange={(e) => setNotasTemp(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Subtotal:</span>
                <span className="text-xl font-bold text-green-700">
                  ${((productoSeleccionado?.precio || 0) * cantidadTemp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNotasOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarProductoConNotas}
              className="bg-gradient-to-r from-green-500 to-green-600"
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="top-center" richColors />
    </div>
  );
}
