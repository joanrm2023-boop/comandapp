"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, Loader2, Home, ShoppingBag, UtensilsCrossed, X, Printer, Search, Plus, Minus, StickyNote } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast, Toaster } from "sonner";

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
  negocio_id: string;
  mesero_modificado_id: string | null;
  mesas: {
    numero: string;
  };
  usuarios: {
    nombre: string;
  } | null;
  clientes: {
    nombre: string;
  } | null;
  mesero_modificado: {  // 👈 AGREGAR ESTO
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
  const [meseroActual, setMeseroActual] = useState<string>("");

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

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('negocio_id, nombre')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !usuarioData) {
      console.error('Error obteniendo usuario');
      setLoading(false);
      return;
    }

    const negocioId = usuarioData.negocio_id;
    setMeseroActual(usuarioData.nombre); 
    const { inicio, fin } = obtenerRangoFechas();

    // 🔥 NUEVA ESTRATEGIA: Cargar TODO en UN SOLO QUERY SIMPLE
    const { data: pedidosData, error: pedidosError } = await supabase
      .from('pedidos')
      .select(`
        *,
        mesas!inner (
          numero
        ),
        clientes (
          nombre
        ),
        detalle_pedidos (
          id,
          cantidad,
          notas,
          productos (
            nombre,
            precio
          )
        )
      `)
      .eq('negocio_id', negocioId)
      .gte('created_at', inicio.toISOString())
      .lte('created_at', fin.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (pedidosError) {
      console.error('❌ Error cargando pedidos:', pedidosError);
      throw pedidosError;
    }

    console.log('✅ Pedidos cargados:', pedidosData?.length);

    // 🔥 CARGAR USUARIOS (meseros) POR SEPARADO
      if (pedidosData && pedidosData.length > 0) {
        // IDs de meseros que crearon los pedidos
        const idsUsuarios = [...new Set(pedidosData.map((p: any) => p.mesero_id).filter(Boolean))]; // 👈 CAMBIADO
        
        // IDs de meseros que modificaron pedidos
        const idsModificadores = [...new Set(pedidosData.map((p: any) => p.mesero_modificado_id).filter(Boolean))];
        
        // Combinar ambos IDs
        const todosIdsUsuarios = [...new Set([...idsUsuarios, ...idsModificadores])];
        
        console.log('👥 Cargando usuarios:', todosIdsUsuarios.length);
        
        // Cargar TODOS los usuarios en una sola query
        let usuariosMap = new Map();
        if (todosIdsUsuarios.length > 0) {
          const { data: usuarios } = await supabase
            .from('usuarios')
            .select('id, nombre')
            .in('id', todosIdsUsuarios);
          
          usuariosMap = new Map((usuarios || []).map(u => [u.id, u]));
          console.log('✅ Usuarios cargados:', usuariosMap.size);
        }
        
        // Agregar usuarios y mesero_modificado a cada pedido
        const pedidosFinales = pedidosData.map((pedido: any) => ({
          ...pedido,
          usuarios: pedido.mesero_id ? usuariosMap.get(pedido.mesero_id) : null, // 👈 CAMBIADO
          mesero_modificado: pedido.mesero_modificado_id 
            ? usuariosMap.get(pedido.mesero_modificado_id) 
            : null
        }));
        
        console.log('✅ Pedidos con relaciones completos:', pedidosFinales.length);
        console.log('🔍 VERIFICACIÓN FINAL - Primer pedido:', {
          mesero_id: pedidosFinales[0]?.mesero_id, // 👈 Cambiado para verificar
          usuarios: pedidosFinales[0]?.usuarios,
          mesero_modificado_id: pedidosFinales[0]?.mesero_modificado_id,
          mesero_modificado: pedidosFinales[0]?.mesero_modificado
        });
        
        setPedidos(pedidosFinales as any || []);
      }

  } catch (error) {
    console.error('💥 Error cargando pedidos:', error);
    console.error('💥 Error stringified:', JSON.stringify(error, null, 2));
  } finally {
    setLoading(false);
  }
};

  // 🆕 Abrir modal para agregar productos
  const abrirModalAgregarProductos = async (pedido: Pedido) => {
    setPedidoSeleccionado(pedido);
    
    // Cargar productos si no están cargados
    if (productos.length === 0) {
      await cargarMenuCompleto();
    }
    
    setModalAgregarOpen(true);
  };

  // 🆕 Cargar menú completo
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

      // Cargar productos
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

      // Cargar categorías
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

  // 🆕 Abrir modal de notas para un producto
  const agregarProductoConNotas = (producto: Producto) => {
    setProductoSeleccionado(producto);
    
    // Si ya existe en productos adicionales, cargar su cantidad y notas
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

  // 🆕 Confirmar producto con notas
  const confirmarProductoConNotas = () => {
    if (!productoSeleccionado || cantidadTemp <= 0) return;

    setProductosAdicionales(prev => {
      const existe = prev.find(item => item.producto.id === productoSeleccionado.id);
      
      if (existe) {
        // Actualizar existente
        return prev.map(item =>
          item.producto.id === productoSeleccionado.id
            ? { ...item, cantidad: cantidadTemp, notas: notasTemp }
            : item
        );
      }
      
      // Agregar nuevo
      return [...prev, { 
        producto: productoSeleccionado, 
        cantidad: cantidadTemp,
        notas: notasTemp 
      }];
    });

    // Cerrar modal
    setModalNotasOpen(false);
    setProductoSeleccionado(null);
    setCantidadTemp(1);
    setNotasTemp("");
  };

  // 🆕 Agregar productos al pedido existente
  const agregarProductosAlPedido = async () => {
    if (!pedidoSeleccionado || productosAdicionales.length === 0) {
      toast.error('Debes seleccionar al menos un producto');
      return;
    }

    try {
      setAgregando(true);
      console.log('🟢 PASO 1: Iniciando agregación de productos');

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🟢 PASO 2: Usuario obtenido:', user?.id);
      
      if (!user) {
        console.error('❌ No hay usuario autenticado');
        setAgregando(false);
        return;
      }

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('auth_user_id', user.id)
        .single();

      console.log('🟢 PASO 3: Usuario data:', usuarioData);
      console.log('🟢 PASO 3: Usuario error:', usuarioError);

      if (usuarioError || !usuarioData) {
        console.error('❌ Error obteniendo usuario:', usuarioError);
        setAgregando(false);
        return;
      }

      // Preparar detalles
      const nuevosDetalles = productosAdicionales.map(item => ({
        pedido_id: pedidoSeleccionado.id,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
        subtotal: item.producto.precio * item.cantidad,
        notas: item.notas || null
      }));

      console.log('🟢 PASO 4: Nuevos detalles preparados:', nuevosDetalles);

      // Insertar nuevos detalles
      const { data: detallesInsertados, error: errorDetalles } = await supabase
        .from('detalle_pedidos')
        .insert(nuevosDetalles)
        .select();

      console.log('🟢 PASO 5: Detalles insertados:', detallesInsertados);
      console.log('🟢 PASO 5: Error detalles:', errorDetalles);

      if (errorDetalles) {
        console.error('❌ Error insertando detalles:', errorDetalles);
        console.error('❌ Detalles del error:', JSON.stringify(errorDetalles, null, 2));
        throw errorDetalles;
      }

      // Calcular nuevo total
      const totalAdicional = productosAdicionales.reduce(
        (sum, item) => sum + (item.producto.precio * item.cantidad), 
        0
      );

      const nuevoTotal = pedidoSeleccionado.total + totalAdicional;

      console.log('🟢 PASO 6: Total anterior:', pedidoSeleccionado.total);
      console.log('🟢 PASO 6: Total adicional:', totalAdicional);
      console.log('🟢 PASO 6: Nuevo total:', nuevoTotal);

      // Actualizar total del pedido
      const { data: pedidoActualizado, error: errorUpdate } = await supabase
        .from('pedidos')
        .update({ 
          total: nuevoTotal,
          mesero_modificado_id: usuarioData.id
        })
        .eq('id', pedidoSeleccionado.id)
        .select();

      console.log('🟢 PASO 7: Pedido actualizado:', pedidoActualizado);
      console.log('🟢 PASO 7: Error update:', errorUpdate);

      if (errorUpdate) {
        console.error('❌ Error actualizando pedido:', errorUpdate);
        console.error('❌ Detalles del error:', JSON.stringify(errorUpdate, null, 2));
        throw errorUpdate;
      }

      console.log('🟢 PASO 8: Iniciando reimpresión...');

      // 🖨️ REIMPRIMIR con productos nuevos (opcional si hay impresora)
      const impresoraDisponible = await reimprimirPedidoConNuevos(pedidoSeleccionado.id);

      console.log('🟢 PASO 9: Impresora disponible:', impresoraDisponible);

      // Limpiar y recargar
      setProductosAdicionales([]);
      setModalAgregarOpen(false);
      setPedidoSeleccionado(null);
      setBusquedaProductos("");
      
      console.log('🟢 PASO 10: Recargando pedidos...');
      await cargarPedidos();

      // Mensaje según disponibilidad de impresora
      if (impresoraDisponible) {
        toast.success('✅ Productos agregados e impresión enviada', {
          duration: 4000
        });
      } else {
        toast.success('✅ Productos agregados (impresora no disponible)', {
          description: 'Los productos se agregaron correctamente. Puedes reimprimir manualmente.',
          duration: 5000
        });
      }

      console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');

    } catch (error) {
      console.error('💥 Error agregando productos:', error);
      console.error('💥 Error type:', typeof error);
      console.error('💥 Error keys:', Object.keys(error || {}));
      console.error('💥 Error stringified:', JSON.stringify(error, null, 2));
      
      // Intentar extraer mensaje de error
      const errorMessage = (error as any)?.message || (error as any)?.error_description || 'Error desconocido';
      console.error('💥 Mensaje de error:', errorMessage);
      
      toast.error(`Error al agregar productos: ${errorMessage}`);
    } finally {
      setAgregando(false);
    }
  };

  // 🆕 Reimprimir pedido con productos nuevos
  const reimprimirPedidoConNuevos = async (pedidoId: string): Promise<boolean> => {
    try {
      console.log('🔁 Reimprimiendo pedido con productos nuevos:', pedidoId);

      // Obtener datos ACTUALIZADOS del pedido
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

      // 🆕 Cargar mesero por separado
      if (pedido && pedido.mesero_id) {
        const { data: meseroData } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', pedido.mesero_id)
          .single();
        
        pedido.usuarios = meseroData;
      }

      if (!pedido) return false;

      // Obtener negocio
      const { data: negocioData } = await supabase
        .from('negocios')
        .select('nombre, telefono, direccion')
        .eq('id', pedido.negocio_id)
        .single();

      // Formatear datos para impresión
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

      // Intentar enviar a imprimir con timeout de 2 segundos
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
      // No mostrar error si es timeout o conexión rechazada (impresora no disponible)
      if (error.name === 'AbortError' || error.message?.includes('fetch')) {
        console.log('⚠️ Servidor de impresión no disponible');
        return false;
      }
      console.error('Error reimprimiendo:', error);
      return false;
    }
  };

  // Productos filtrados en el modal
  const productosFiltradosModal = useMemo(() => {
    return productos.filter((p) => {
      const busquedaLower = busquedaProductos.toLowerCase();
      const nombreProducto = p.nombre.toLowerCase();
      const categoriaNombre = p.categorias?.nombre?.toLowerCase() || '';
      
      return nombreProducto.includes(busquedaLower) || categoriaNombre.includes(busquedaLower);
    });
  }, [busquedaProductos, productos]);

  // Productos agrupados por categoría
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
    
    // Ordenar productos dentro de cada categoría por precio (mayor a menor)
    Object.keys(grupos).forEach(catNombre => {
      grupos[catNombre].productos.sort((a, b) => b.precio - a.precio);
    });
    
    // Ordenar categorías alfabéticamente
    const gruposOrdenados = Object.keys(grupos)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = grupos[key];
        return acc;
      }, {} as Record<string, GrupoProductos>);
    
    return gruposOrdenados;
  }, [productosFiltradosModal]);

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
 
  // Función para cancelar pedido
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

  // Función para reimprimir pedido
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
    
    // Obtener datos completos del pedido
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

    console.log('🔵 PASO 2: Datos del pedido:', pedido);

    if (error || !pedido) {
      console.error('❌ Error obteniendo pedido:', error);
      return;
    }

    // 🆕 Cargar mesero por separado
    if (pedido.mesero_id) {
      const { data: meseroData } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('id', pedido.mesero_id)
        .single();
      
      pedido.usuarios = meseroData;
    }

    // Obtener datos del negocio
    const { data: negocioData } = await supabase
      .from('negocios')
      .select('nombre, telefono, direccion')
      .eq('id', pedido.negocio_id)
      .single();

    console.log('🔵 PASO 2.5: Datos del negocio:', negocioData);

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
      
      // CAMBIAR ESTADO A 'VENDIDO' DESPUÉS DE IMPRIMIR EXITOSAMENTE
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({ estado: 'vendido' })
        .eq('id', pedidoId);

      if (updateError) {
        console.error('⚠️ Error actualizando estado a vendido:', updateError);
      } else {
        console.log('✅ Estado cambiado a VENDIDO');
        await cargarPedidos();
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
                    {pedido.mesero_modificado && (  // 👈 AGREGAR DESDE AQUÍ
                      <p className="text-xs text-orange-600 italic">
                        Modificado por: <span className="font-semibold">{pedido.mesero_modificado.nombre}</span>
                      </p>
                    )} 
                  </div>

                  {/* Botones Cancelar, Reimprimir y Agregar */}
                  <div className="mt-4 space-y-2">
                    {/* Fila 1: Reimprimir y Cancelar */}
                    <div className="flex gap-2">
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

                    {/* 🆕 Fila 2: Agregar productos */}
                    <Button
                      size="sm"
                      onClick={() => abrirModalAgregarProductos(pedido)}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
                      disabled={pedido.estado === 'cancelado'}
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

      {/* Dialog Cancelar Pedido */}
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

      {/* 🆕 Modal Agregar Productos */}
      <Dialog open={modalAgregarOpen} onOpenChange={setModalAgregarOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Agregar productos al pedido {pedidoSeleccionado && getNumeroPedido(pedidoSeleccionado)}
            </DialogTitle>
          </DialogHeader>

          {/* Barra de búsqueda */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar producto..."
              value={busquedaProductos}
              onChange={(e) => setBusquedaProductos(e.target.value)}
              className="pl-10 h-11 border-gray-200 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Lista de productos agrupados */}
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

          {/* Productos seleccionados */}
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

      {/* 🆕 Modal para Agregar Notas a Producto Individual */}
      <Dialog open={modalNotasOpen} onOpenChange={setModalNotasOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {productoSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Cantidad */}
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

            {/* Notas */}
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

            {/* Precio total */}
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