"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, UtensilsCrossed, Edit, Trash2, Loader2, FolderPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ModalCategoria from "@/components/ui/ModalCategoria";
import ModalProducto from "@/components/ui/ModalProducto";

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
  imagen_url?: string | null;
  descripcion?: string | null;
  categoria_id: string;
  categorias?: {
    id: string;
    nombre: string;
    icono: string;
    color: string;
  } | null;
}

interface GrupoProductos {
  productos: Producto[];
  config: {
    icono: string;
    color: string;
  };
}


export default function MenuPage() {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalCategoriaOpen, setModalCategoriaOpen] = useState(false);
  const [modalProductoOpen, setModalProductoOpen] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [productoAEditar, setProductoAEditar] = useState<Producto | null>(null);
  const [categoriaAEditar, setCategoriaAEditar] = useState<Categoria | null>(null);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<string | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // NUEVO: Obtener negocio_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError || !usuarioData) {
        setError('Usuario no encontrado en el sistema');
        setLoading(false);
        return;
      }

      const negocioId = usuarioData.negocio_id;
      
      // Cargar categorías DEL NEGOCIO
      const { data: categoriasData, error: errorCat } = await supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .eq('negocio_id', negocioId)
        .order('nombre');

      if (errorCat) throw errorCat;

      // Cargar productos DEL NEGOCIO con sus categorías
      const { data: productosData, error: errorProd } = await supabase
        .from('productos')
        .select(`
          id,
          nombre,
          precio,
          activo,
          imagen_url,
          descripcion,
          categoria_id,
          categorias (
            id,
            nombre,
            icono,
            color
          )
        `)
        .eq('activo', true)
        .eq('negocio_id', negocioId)
        .order('nombre');

      if (errorProd) throw errorProd;

      setCategorias(categoriasData as any ?? []);
      setProductos(productosData as any ?? []);
      setError(null);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos. Por favor, recarga la página.');
    } finally {
      setLoading(false);
    }
  };

  const recargarCategorias = async () => {
    try {
      // 🔥 Obtener negocio_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!usuarioData) return;

      const negocioId = usuarioData.negocio_id;

      const { data: categoriasData, error: errorCat } = await supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .eq('negocio_id', negocioId)
        .order('nombre');

      if (errorCat) throw errorCat;
      
      setCategorias(categoriasData as any ?? []);
      console.log('✅ Categorías recargadas:', categoriasData);
    } catch (err) {
      console.error('Error recargando categorías:', err);
    }
  };

  const eliminarProducto = async (id: string) => {
    try {
      setEliminando(true);
      
      const { error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;

      // Recargar productos
      await cargarDatos();
      setProductoAEliminar(null);
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      alert('Error al eliminar el producto');
    } finally {
      setEliminando(false);
    }
  };

  const eliminarCategoria = async (id: string) => {
    try {
      setEliminando(true);
      
      // Verificar si hay productos asociados
      const productosConCategoria = productos.filter(p => p.categoria_id === id);
      
      if (productosConCategoria.length > 0) {
        alert(`No se puede eliminar la categoría porque tiene ${productosConCategoria.length} producto(s) asociado(s).`);
        setCategoriaAEliminar(null);
        setEliminando(false);
        return;
      }
      
      const { error } = await supabase
        .from('categorias')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;

      // Recargar categorías
      await recargarCategorias();
      setCategoriaAEliminar(null);
    } catch (err) {
      console.error('Error al eliminar categoría:', err);
      alert('Error al eliminar la categoría');
    } finally {
      setEliminando(false);
    }
  };

  const formatPrecio = (precio: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(precio);
    };

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const busquedaLower = busqueda.toLowerCase();
      const nombreProducto = p.nombre.toLowerCase();
      const categoriaNombre = p.categorias?.nombre?.toLowerCase() || '';
      
      const coincideBusqueda = nombreProducto.includes(busquedaLower) || 
                              categoriaNombre.includes(busquedaLower);
      
      const coincideCategoria = categoria === "Todas" ? true : 
                              p.categorias?.nombre === categoria;
      
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
    
    // Ordenar productos dentro de cada categoría por precio (mayor a menor)
    Object.keys(grupos).forEach(catNombre => {
      grupos[catNombre].productos.sort((a, b) => b.precio - a.precio);
    });
    
    // Convertir a array, ordenar categorías alfabéticamente y volver a objeto
    const gruposOrdenados = Object.keys(grupos)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = grupos[key];
        return acc;
      }, {} as Record<string, GrupoProductos>);
    
    return gruposOrdenados;
  }, [productosFiltrados]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-zinc-600">Cargando menú...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg border-2 border-zinc-200">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-zinc-900 mb-2">Error al cargar</h3>
          <p className="text-zinc-600 mb-4">{error}</p>
          <Button 
            onClick={cargarDatos}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            Reintentar
          </Button>
        </div>
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
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Menú
              </h1>
              <p className="text-zinc-600 text-sm">Gestiona tus productos</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setModalCategoriaOpen(true)}
              className="border-zinc-300 hover:bg-zinc-50 hover:text-orange-600 hover:border-orange-400 transition-all"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Agregar categoría
            </Button>
            <Button 
              onClick={() => setModalProductoOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar producto
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-zinc-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <Input
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 h-12 border-zinc-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="w-full sm:w-64 h-12 border-zinc-300 focus:ring-2 focus:ring-orange-500">
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

        {/* Productos agrupados por categoría */}
        {Object.keys(productosAgrupados).length > 0 ? (
          <div className="space-y-12">
            {Object.entries(productosAgrupados).map(([catNombre, grupo]) => {
              const { productos: productosGrupo, config } = grupo;
              
              return (
                <div key={catNombre} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Título de categoría */}
                  <div className="flex items-center justify-between mb-6 bg-zinc-50 rounded-xl p-4 shadow-md border-2 border-zinc-200">
                    <div className="flex items-center gap-3">
                      <div className={`bg-gradient-to-r ${config.color} p-3 rounded-xl shadow-lg`}>
                        <span className="text-3xl">{config.icono}</span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-zinc-900">{catNombre}</h2>
                        <p className="text-zinc-600 text-sm">
                          {productosGrupo.length} {productosGrupo.length === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Botones de editar/eliminar categoría */}
                    {catNombre !== "Sin categoría" && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-400 transition-all border-zinc-300"
                          onClick={() => {
                            const cat = categorias.find(c => c.nombre === catNombre);
                            if (cat) setCategoriaAEditar(cat);
                          }}
                        >
                          <Edit className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="bg-red-500 hover:bg-red-600 transition-all"
                          onClick={() => {
                            const cat = categorias.find(c => c.nombre === catNombre);
                            if (cat) setCategoriaAEliminar(cat.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Grid de productos */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {productosGrupo.map((producto) => (
                      <Card 
                        key={producto.id} 
                        className="group hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 border-2 border-zinc-200 hover:border-orange-300 bg-white overflow-hidden"
                      >
                        <div className={`h-2 bg-gradient-to-r ${config.color}`}></div>
                        <CardHeader className="pb-2 p-3">
                          <CardTitle className="text-sm sm:text-lg font-semibold text-zinc-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                            {producto.nombre}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 p-3 pt-0">
                          <div className="bg-zinc-50 rounded-lg p-2 border border-zinc-200">
                            <p className="text-xs text-zinc-600 mb-0.5">Categoría</p>
                            <p className="font-medium text-xs sm:text-sm text-zinc-900 flex items-center gap-1">
                              <span className="text-sm">{config.icono}</span>
                              <span className="truncate">{catNombre}</span>
                            </p>
                          </div>

                          <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                            <p className="text-xs text-zinc-600 mb-0.5">Precio</p>
                            <p className="text-lg sm:text-2xl font-bold text-orange-600">
                              ${Number(producto.precio).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex gap-1.5 pt-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-400 transition-all text-xs p-2 h-8 border-zinc-300"
                              onClick={() => setProductoAEditar(producto)}
                            >
                              <Edit className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Editar</span>
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="flex-1 bg-red-500 hover:bg-red-600 transition-all text-xs p-2 h-8"
                              onClick={() => setProductoAEliminar(producto.id)}
                            >
                              <Trash2 className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Eliminar</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-zinc-200">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-zinc-600">
              {productos.length === 0 
                ? 'No hay productos en la base de datos' 
                : 'Intenta con otros términos de búsqueda o filtros'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Categoría */}
      <ModalCategoria 
        open={modalCategoriaOpen || !!categoriaAEditar}
        onOpenChange={(open) => {
          setModalCategoriaOpen(open);
          if (!open) setCategoriaAEditar(null);
        }}
        onCategoriaCreada={recargarCategorias}
        categoriaAEditar={categoriaAEditar}
      />

      {/* Modal de Producto */}
      <ModalProducto 
        open={modalProductoOpen || !!productoAEditar}
        onOpenChange={(open) => {
          setModalProductoOpen(open);
          if (!open) setProductoAEditar(null);
        }}
        onProductoCreado={cargarDatos}
        productoAEditar={productoAEditar}
      />

      {/* Dialog de confirmación para eliminar PRODUCTO */}
      <AlertDialog open={!!productoAEliminar} onOpenChange={() => setProductoAEliminar(null)}>
        <AlertDialogContent className="border-2 border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900">¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600">
              Esta acción desactivará el producto. No aparecerá en el menú pero podrás reactivarlo después desde la base de datos si lo necesitas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando} className="border-zinc-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => productoAEliminar && eliminarProducto(productoAEliminar)}
              disabled={eliminando}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Sí, eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para eliminar CATEGORÍA */}
      <AlertDialog open={!!categoriaAEliminar} onOpenChange={() => setCategoriaAEliminar(null)}>
        <AlertDialogContent className="border-2 border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900">¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-600">
              Esta acción desactivará la categoría. Solo se puede eliminar si no tiene productos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando} className="border-zinc-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => categoriaAEliminar && eliminarCategoria(categoriaAEliminar)}
              disabled={eliminando}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Sí, eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}