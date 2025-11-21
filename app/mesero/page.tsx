"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ShoppingCart, Plus, Minus, Send, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  
  // Carrito de pedido
  const [pedido, setPedido] = useState<ItemPedido[]>([]);
  const [mostrarResumen, setMostrarResumen] = useState(false);

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
    setPedido(prev => {
      const existe = prev.find(item => item.producto.id === producto.id);
      if (existe) {
        return prev.map(item =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
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

  const enviarPedido = async () => {
    if (!mesaSeleccionada) {
      alert('Por favor selecciona una mesa');
      return;
    }

    if (pedido.length === 0) {
      alert('El pedido está vacío');
      return;
    }

    try {
      setEnviando(true);

      // Crear pedido
      const { data: pedidoData, error: errorPedido } = await supabase
        .from('pedidos')
        .insert([{
          mesa_id: mesaSeleccionada,
          estado: 'pendiente',
          total: calcularTotal()
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
        subtotal: item.producto.precio * item.cantidad
      }));

      const { error: errorDetalles } = await supabase
        .from('detalle_pedidos')
        .insert(detalles);

      if (errorDetalles) throw errorDetalles;

      // Actualizar estado de mesa
      await supabase
        .from('mesas')
        .update({ estado: 'ocupada' })
        .eq('id', mesaSeleccionada);

      // Limpiar pedido
      setPedido([]);
      setMesaSeleccionada("");
      setMostrarResumen(false);
      alert('¡Pedido enviado a cocina exitosamente!');
    } catch (err) {
      console.error('Error enviando pedido:', err);
      alert('Error al enviar el pedido');
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
            
            {/* Selector de mesa mejorado */}
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
                  {mesas.filter(m => m.estado === 'libre').map((mesa) => (
                    <SelectItem key={mesa.id} value={mesa.id} className="font-medium">
                      🪑 {mesa.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
            <CardContent className="p-4 space-y-3">
              {pedido.map((item) => (
                <div key={item.producto.id} className="flex justify-between items-center border-b pb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.cantidad}x {item.producto.nombre}</p>
                    <p className="text-xs text-gray-500">${Number(item.producto.precio).toLocaleString()} c/u</p>
                  </div>
                  <p className="font-bold text-green-700">
                    ${(item.producto.precio * item.cantidad).toLocaleString()}
                  </p>
                </div>
              ))}
              
              <div className="pt-3 border-t-2 border-gray-300">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold">TOTAL:</span>
                  <span className="text-2xl font-bold text-green-700">
                    ${calcularTotal().toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setPedido([]);
                      setMostrarResumen(false);
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Botón flotante del resumen (móvil) */}
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
    </div>
  );
}