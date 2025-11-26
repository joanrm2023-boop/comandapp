"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StickyNote, Search, ShoppingCart, Plus, Minus, Send, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast, Toaster } from "sonner";

// Tipos
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

interface Mesa {
  id: string;
  numero: string;
  estado: string;
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

export default function MeseroPage() {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [medioPago, setMedioPago] = useState<string>("");
  
  // Carrito de pedido
  const [pedido, setPedido] = useState<ItemPedido[]>([]);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [modalNotasOpen, setModalNotasOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadTemp, setCantidadTemp] = useState(1);
  const [notasTemp, setNotasTemp] = useState("");
  const [direccionDomicilio, setDireccionDomicilio] = useState("");
  const [valorDomicilio, setValorDomicilio] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar categorías
      const { data: categoriasData, error: errorCat } = await supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (errorCat) throw errorCat;

      // Cargar productos
      const { data: productosData, error: errorProd } = await supabase
        .from('productos')
        .select(`
          id,
          nombre,
          precio,
          activo,
          categoria_id,
          categorias (
            id,
            nombre,
            icono,
            color
          )
        `)
        .eq('activo', true)
        .order('nombre');

      if (errorProd) throw errorProd;

      // Cargar mesas
      const { data: mesasData, error: errorMesas } = await supabase
        .from('mesas')
        .select('*')
        .eq('activo', true)
        .order('numero');

      if (errorMesas) throw errorMesas;

      setCategorias(categoriasData as any ?? []);
      setProductos(productosData as any ?? []);
      setMesas(mesasData as any ?? []);
      setError(null);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const categoriaNombre = p.categorias?.nombre || '';
      const coincideCategoria = categoria === "Todas" ? true : categoriaNombre === categoria;
      return coincideBusqueda && coincideCategoria;
    });
  }, [busqueda, categoria, productos]);

  const productosAgrupados = useMemo(() => {
    const grupos: Record<string, GrupoProductos> = {};
    
    productosFiltrados.forEach((producto) => {
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
    
    return grupos;
  }, [productosFiltrados]);

  const agregarProducto = (producto: Producto) => {
    // Abrir modal para agregar notas
    setProductoSeleccionado(producto);
    
    // Si ya existe en el pedido, cargar su cantidad y notas
    const itemExistente = pedido.find(item => item.producto.id === producto.id);
    if (itemExistente) {
      setCantidadTemp(itemExistente.cantidad);
      setNotasTemp(itemExistente.notas);
    } else {
      setCantidadTemp(1);
      setNotasTemp("");
    }
    
    setModalNotasOpen(true);
  };

  const confirmarProducto = () => {
    if (!productoSeleccionado || cantidadTemp <= 0) return;

    setPedido(prev => {
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

  const cambiarCantidad = (productoId: string, delta: number) => {
    setPedido(prev => {
      return prev
        .map(item =>
          item.producto.id === productoId
            ? { ...item, cantidad: Math.max(0, item.cantidad + delta) }
            : item
        )
        .filter(item => item.cantidad > 0);
    });
  };

  const obtenerCantidad = (productoId: string) => {
    const item = pedido.find(item => item.producto.id === productoId);
    return item ? item.cantidad : 0;
  };

  const calcularTotal = () => {
    return pedido.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0);
  };

  const esDomicilio = () => {
      const mesaSelec = mesas.find(m => m.id === mesaSeleccionada);
      return mesaSelec?.numero.toLowerCase().includes('domicilio');
    };

  const enviarPedido = async () => {
    if (!mesaSeleccionada) {
      toast.error('Por favor selecciona una mesa');
      return;
    }

    if (pedido.length === 0) {
      toast.error('El pedido está vacío');
      return;
    }

    if (!medioPago) {
      toast.error('Por favor selecciona un medio de pago');
      return;
    }

    if (esDomicilio()) {
      if (!direccionDomicilio.trim()) {
        toast.error('Por favor ingresa la dirección de entrega');
        return;
      }
      if (!valorDomicilio || parseFloat(valorDomicilio) <= 0) {
        toast.error('Por favor ingresa un valor de domicilio válido');
        return;
      }
    }

    try {
      setEnviando(true);

      const totalProductos = calcularTotal();
      const costoEnvio = esDomicilio() ? parseFloat(valorDomicilio || '0') : 0;
      const totalFinal = totalProductos + costoEnvio;

      // 👇 OBTENER USUARIO AUTENTICADO
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error obteniendo usuario:', userError);
        toast.error('Error: No se pudo identificar al mesero');
        setEnviando(false);
        return;
      }

      // 👇 BUSCAR EN TABLA USUARIOS
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nombre, rol')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError || !usuarioData) {
        console.error('Error obteniendo datos de usuario:', usuarioError);
        toast.error('Error: Usuario no encontrado en el sistema');
        setEnviando(false);
        return;
      }

      console.log('👤 Mesero:', usuarioData.nombre, '- Rol:', usuarioData.rol);

      // Crear pedido CON mesero_id de la tabla usuarios
      const { data: pedidoData, error: errorPedido } = await supabase
        .from('pedidos')
        .insert([{
          mesa_id: mesaSeleccionada,
          mesero_id: usuarioData.id,  // 👈 usuarios.id
          estado: 'pendiente',
          total: totalFinal,
          es_domicilio: esDomicilio(),
          direccion_domicilio: esDomicilio() ? direccionDomicilio : null,
          valor_domicilio: costoEnvio,
          medio_pago: medioPago
        }])
        .select()
        .single();

      if (errorPedido) throw errorPedido;

      // Crear detalles del pedido
      const detalles = pedido.map(item => ({
        pedido_id: pedidoData.id,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
        subtotal: item.producto.precio * item.cantidad,
        notas: item.notas || null
      }));

      const { error: errorDetalles } = await supabase
        .from('detalle_pedidos')
        .insert(detalles);

      if (errorDetalles) throw errorDetalles;

      const mesaNumero = mesas.find(m => m.id === mesaSeleccionada)?.numero;

      // Limpiar campos
      setPedido([]);
      setMesaSeleccionada("");
      setDireccionDomicilio("");
      setValorDomicilio("");
      setMostrarResumen(false);
      setMedioPago("");

      // Mostrar notificación
      toast.success('¡Pedido enviado exitosamente! 🎉', {
        description: `Mesa ${mesaNumero} - Total: $${totalFinal.toLocaleString()}`,
        duration: 5000,
        style: {
          fontSize: '18px',
          padding: '24px',
          minHeight: '100px',
          fontWeight: '600',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
        }
      });
    } catch (err) {
      console.error('Error enviando pedido:', err);
      toast.error('Error al enviar el pedido');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando menú...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-blue-50 p-4 pb-32">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-yellow-400 to-blue-500 p-3 rounded-xl shadow-lg">
              <span className="text-3xl">🧽</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-blue-600 bg-clip-text text-transparent">
                Nuevo Pedido
              </h1>
              <p className="text-gray-600 text-sm">Selecciona los productos</p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <Button
              onClick={() => setMostrarResumen(!mostrarResumen)}
              className="bg-gradient-to-r from-yellow-400 to-blue-500 hover:from-yellow-500 hover:to-blue-600 relative"
            >
              <ShoppingCart className="w-5 h-5" />
              {pedido.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                  {pedido.reduce((sum, item) => sum + item.cantidad, 0)}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-yellow-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 h-11 border-gray-200 focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="w-full sm:w-48 h-11 border-gray-200 focus:ring-2 focus:ring-yellow-500">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">📋 Todas</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.nombre}>
                    {cat.icono} {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Productos */}
        {Object.keys(productosAgrupados).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(productosAgrupados).map(([catNombre, grupo]) => {
              const { productos: productosGrupo, config } = grupo;
              
              return (
                <div key={catNombre}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`bg-gradient-to-r ${config.color} p-2 rounded-xl shadow-lg`}>
                      <span className="text-2xl">{config.icono}</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">{catNombre}</h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {productosGrupo.map((producto) => {
                      const cantidad = obtenerCantidad(producto.id);
                      
                      return (
                        <Card 
                          key={producto.id}
                          className={`cursor-pointer transition-all duration-200 ${
                            cantidad > 0 
                              ? 'border-2 border-yellow-400 shadow-lg' 
                              : 'border-2 border-transparent hover:border-yellow-200 hover:shadow-md'
                          }`}
                          onClick={() => agregarProducto(producto)}
                        >
                          <div className={`h-2 bg-gradient-to-r ${config.color}`}></div>
                          <CardContent className="p-3">
                            <h3 className="font-semibold text-sm mb-2 line-clamp-2 min-h-[40px]">
                              {producto.nombre}
                            </h3>
                            <p className="text-lg font-bold text-green-700 mb-2">
                              ${Number(producto.precio).toLocaleString()}
                            </p>
                            
                            {cantidad > 0 && (
                              <div className="flex items-center justify-center gap-2 bg-yellow-100 rounded-lg p-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-yellow-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cambiarCantidad(producto.id, -1);
                                  }}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="font-bold text-lg w-8 text-center">{cantidad}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-yellow-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cambiarCantidad(producto.id, 1);
                                  }}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700">No hay productos disponibles</h3>
          </div>
        )}
      </div>

      {/* Panel Resumen Flotante */}
        {mostrarResumen && pedido.length > 0 && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setMostrarResumen(false)}
          >
            <Card className="w-full max-w-md max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Resumen del Pedido</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => setMostrarResumen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Selector de mesa */}
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <label className="text-sm font-medium block mb-2 flex items-center gap-2">
                    <span className="text-lg">🪑</span>
                    Mesa para el pedido:
                  </label>
                  <Select value={mesaSeleccionada} onValueChange={setMesaSeleccionada}>
                    <SelectTrigger className="w-full h-11 bg-white text-gray-800 border-0 font-semibold shadow-md">
                      <SelectValue placeholder="🪑 Seleccionar mesa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mesas.map((mesa) => ( 
                        <SelectItem key={mesa.id} value={mesa.id} className="font-medium">
                          🪑 {mesa.numero}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* 🏠 CAMPOS PARA DOMICILIO */}
                {esDomicilio() && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2 text-orange-800 font-semibold">
                      <span className="text-lg">🏠</span>
                      <span>Pedido a domicilio</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Dirección de entrega
                      </label>
                      <Input
                        placeholder="Ej: Calle 123 #45-67, Apto 301"
                        value={direccionDomicilio}
                        onChange={(e) => setDireccionDomicilio(e.target.value)}
                        className="bg-white text-gray-800"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Valor del domicilio
                      </label>
                      <Input
                        type="number"
                        placeholder="Ej: 5000"
                        value={valorDomicilio}
                        onChange={(e) => setValorDomicilio(e.target.value)}
                        className="bg-white text-gray-800"
                      />
                    </div>
                  </div>
                )}
                
              </CardHeader>
              
              {/* 💳 SELECTOR DE MEDIO DE PAGO */}
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                  <label className="text-sm font-medium block mb-2 flex items-center gap-2">
                    <span className="text-lg">💳</span>
                    Medio de pago:
                  </label>
                  <Select value={medioPago} onValueChange={setMedioPago}>
                    <SelectTrigger className="w-full h-11 bg-white text-gray-800 border-0 font-semibold shadow-md">
                      <SelectValue placeholder="💳 Seleccionar medio de pago..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="nequi">📱 Nequi</SelectItem>
                      <SelectItem value="daviplata">📲 Daviplata</SelectItem>
                      <SelectItem value="bold">💳 Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <CardContent className="p-4 space-y-3">
                {pedido.map((item) => (
                  <div key={item.producto.id} className="border-b pb-3 mb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.cantidad}x {item.producto.nombre}</p>
                        <p className="text-xs text-gray-500">${Number(item.producto.precio).toLocaleString()} c/u</p>
                        {item.notas && (
                          <p className="text-xs text-orange-600 mt-1 flex items-start gap-1">
                            <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="italic">{item.notas}</span>
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-green-700 ml-2">
                        ${(item.producto.precio * item.cantidad).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                <div className="pt-3 border-t-2 border-gray-200 space-y-2">
                  {/* Subtotal productos */}
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-bold">
                      ${calcularTotal().toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Costo domicilio (solo si aplica) */}
                  {esDomicilio() && valorDomicilio && (
                    <div className="flex justify-between items-center text-orange-700">
                      <span className="font-medium">Domicilio:</span>
                      <span className="font-bold">
                        ${parseFloat(valorDomicilio).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {/* Total final */}
                  <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                    <span className="text-lg font-bold">TOTAL:</span>
                    <span className="text-2xl font-bold text-green-700">
                      ${(calcularTotal() + (esDomicilio() && valorDomicilio ? parseFloat(valorDomicilio) : 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setPedido([]);
                      setMesaSeleccionada("");
                      setDireccionDomicilio("");
                      setValorDomicilio("");
                      setMostrarResumen(false);
                      setMedioPago("");
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                    onClick={enviarPedido}
                    disabled={enviando || !mesaSeleccionada}
                  >
                    {enviando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Botón flotante del resumen */}
      {pedido.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-40">
          <Button
            className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-blue-500 hover:from-yellow-500 hover:to-blue-600 shadow-2xl h-14 text-lg font-bold"
            onClick={() => setMostrarResumen(true)}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Ver Pedido ({pedido.reduce((sum, item) => sum + item.cantidad, 0)}) - ${calcularTotal().toLocaleString()}
          </Button>
        </div>
      )}

      {/* Modal para Agregar Notas */}
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
              onClick={confirmarProducto}
              className="bg-gradient-to-r from-green-500 to-green-600"
            >
              Agregar al Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster position="top-center" richColors />
    </div>
  );
}