"use client";

/**
 * app/admin/pagina_Domicilios/page.tsx
 *
 * Panel para que el dueño/admin configure lo que se ve en su página
 * pública de domicilios (app/[slug]/page.tsx):
 *  1. El slug (link público) del negocio.
 *  2. Foto y descripción de cada producto del menú, agrupados por
 *     categoría en acordeones desplegables — reutiliza las columnas
 *     `imagen_url` y `descripcion` que ya existen en `productos`.
 *
 * No toca precio, categoría ni activo/inactivo — eso sigue viviendo en
 * /admin/menu. Este panel es solo para lo que enriquece la vista pública.
 *
 * Los sabores de cada producto (creados/editados en /admin/menu) se
 * muestran aquí solo de forma informativa, para que el admin vea qué
 * verá el cliente en la página pública — no se editan desde aquí.
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { toast, Toaster } from "sonner";
import {
  Link2,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  ImageIcon,
  Save,
  Check,
  ChevronDown,
  Camera,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Wallet,
  Clock,
  Power,
  Eye,
  EyeOff,
  MapPin,
  Soup,
} from "lucide-react";

interface Sabor {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string | null;
  descripcion: string | null;
  categoria_id: string;
  visible_en_slug: boolean;
  orden: number;
  max_sabores?: number;
  sabores?: Sabor[];
  categorias?: { nombre: string; icono: string; color: string } | null;
}

interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  orden: number;
  visible_en_slug: boolean;
}

interface GrupoProductos {
  productos: Producto[];
  config: { icono: string; color: string };
}

interface HorarioDia {
  apertura: string;
  cierre: string;
  cerrado: boolean;
}

const DIAS_SEMANA = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
] as const;

const horarioVacio = (): HorarioDia => ({ apertura: "08:00", cierre: "20:00", cerrado: false });

export default function PaginaDomiciliosAdmin() {
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [slugActual, setSlugActual] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [errorSlug, setErrorSlug] = useState("");
  const [guardandoSlug, setGuardandoSlug] = useState(false);

  const [pedidoMinimoActual, setPedidoMinimoActual] = useState(0);
  const [pedidoMinimoInput, setPedidoMinimoInput] = useState("0");
  const [guardandoPedidoMinimo, setGuardandoPedidoMinimo] = useState(false);

  const [zonaCoberturaInput, setZonaCoberturaInput] = useState("");
  const [guardandoZonaCobertura, setGuardandoZonaCobertura] = useState(false);

  const [horarios, setHorarios] = useState<Record<string, HorarioDia>>({});
  const [guardandoHorarios, setGuardandoHorarios] = useState(false);

  const [negocioAbierto, setNegocioAbierto] = useState(true);
  const [guardandoEstado, setGuardandoEstado] = useState(false);

  const MENSAJE_CIERRE_POR_DEFECTO =
    "Lo sentimos, tuvimos que cerrar por un imprevisto. Pronto estaremos de vuelta en nuestro horario habitual.";
  const [mensajeCierreInput, setMensajeCierreInput] = useState(MENSAJE_CIERRE_POR_DEFECTO);
  const [guardandoMensajeCierre, setGuardandoMensajeCierre] = useState(false);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriasOrdenadas, setCategoriasOrdenadas] = useState<Categoria[]>([]);
  const [guardandoOrden, setGuardandoOrden] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [categoriasAbiertas, setCategoriasAbiertas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [edicion, setEdicion] = useState<Record<string, { imagen_url: string; descripcion: string }>>({});
  const [guardandoProducto, setGuardandoProducto] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from("usuarios")
        .select("negocio_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!usuarioData) return;
      setNegocioId(usuarioData.negocio_id);

      const { data: negocioData } = await supabase
        .from("negocios")
        .select("slug, pedido_minimo, horarios, abierto, mensaje_cierre_emergencia, zona_cobertura")
        .eq("id", usuarioData.negocio_id)
        .single();

      if (negocioData) {
        setSlugActual(negocioData.slug);
        setSlugInput(negocioData.slug);
        const minimo = negocioData.pedido_minimo ?? 0;
        setPedidoMinimoActual(minimo);
        setPedidoMinimoInput(String(minimo));

        // Rellenar cualquier día faltante con valores por defecto
        const horariosGuardados = negocioData.horarios ?? {};
        const horariosCompletos: Record<string, HorarioDia> = {};
        DIAS_SEMANA.forEach(({ key }) => {
          horariosCompletos[key] = horariosGuardados[key] ?? horarioVacio();
        });
        setHorarios(horariosCompletos);

        setNegocioAbierto(negocioData.abierto ?? true);
        setMensajeCierreInput(negocioData.mensaje_cierre_emergencia ?? MENSAJE_CIERRE_POR_DEFECTO);
        setZonaCoberturaInput(negocioData.zona_cobertura ?? "");
      }

      const { data: productosData } = await supabase
        .from("productos")
        .select(`id, nombre, precio, imagen_url, descripcion, categoria_id, visible_en_slug, orden, max_sabores, categorias ( nombre, icono, color )`)
        .eq("negocio_id", usuarioData.negocio_id)
        .eq("activo", true)
        .order("orden", { ascending: true });

      const { data: categoriasData } = await supabase
        .from("categorias")
        .select("id, nombre, icono, color, orden, visible_en_slug")
        .eq("negocio_id", usuarioData.negocio_id)
        .eq("activo", true)
        .order("orden", { ascending: true });

      let lista = (productosData as any) ?? [];

      // 🆕 Traer los sabores asignados a estos productos (solo informativo aquí)
      if (lista.length > 0) {
        const idsProductos = lista.map((p: Producto) => p.id);

        const { data: relacionesSabores } = await supabase
          .from("producto_sabores")
          .select("producto_id, sabores ( id, nombre )")
          .in("producto_id", idsProductos);

        const saboresPorProducto: Record<string, Sabor[]> = {};
        (relacionesSabores as any[] ?? []).forEach((r) => {
          if (!r.sabores) return;
          if (!saboresPorProducto[r.producto_id]) saboresPorProducto[r.producto_id] = [];
          saboresPorProducto[r.producto_id].push(r.sabores);
        });

        lista = lista.map((p: Producto) => ({
          ...p,
          sabores: saboresPorProducto[p.id] ?? [],
        }));
      }

      setProductos(lista);
      setCategoriasOrdenadas((categoriasData as any) ?? []);

      const edicionInicial: Record<string, { imagen_url: string; descripcion: string }> = {};
      lista.forEach((p: Producto) => {
        edicionInicial[p.id] = {
          imagen_url: p.imagen_url ?? "",
          descripcion: p.descripcion ?? "",
        };
      });
      setEdicion(edicionInicial);

      const primeraCategoria = (categoriasData as any)?.[0]?.nombre;
      if (primeraCategoria) setCategoriasAbiertas(new Set([primeraCategoria]));
    } catch (err) {
      console.error("Error cargando datos:", err);
      toast.error("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const normalizarSlug = (valor: string) =>
    valor
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  const guardarSlug = async () => {
    setErrorSlug("");
    const slugLimpio = normalizarSlug(slugInput);

    if (!slugLimpio) {
      setErrorSlug("El link no puede estar vacío");
      return;
    }
    if (slugLimpio === "admin") {
      setErrorSlug("Ese nombre está reservado, elige otro");
      return;
    }
    if (slugLimpio === slugActual) {
      toast.info("No hay cambios en el link");
      return;
    }

    try {
      setGuardandoSlug(true);
      const { error } = await supabase
        .from("negocios")
        .update({ slug: slugLimpio })
        .eq("id", negocioId);

      if (error) {
        if (error.code === "23505") {
          setErrorSlug("Ese link ya está en uso por otro negocio, elige otro");
        } else {
          setErrorSlug("Error al guardar: " + error.message);
        }
        return;
      }

      setSlugActual(slugLimpio);
      setSlugInput(slugLimpio);
      toast.success("Link actualizado correctamente");
    } finally {
      setGuardandoSlug(false);
    }
  };

  const copiarLink = () => {
    const url = `${window.location.origin}/${slugActual}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const guardarPedidoMinimo = async () => {
    const valor = parseFloat(pedidoMinimoInput);
    if (isNaN(valor) || valor < 0) {
      toast.error("Ingresa un valor válido");
      return;
    }

    try {
      setGuardandoPedidoMinimo(true);
      const { error } = await supabase
        .from("negocios")
        .update({ pedido_minimo: valor })
        .eq("id", negocioId);

      if (error) throw error;

      setPedidoMinimoActual(valor);
      toast.success("Pedido mínimo actualizado");
    } catch (err: any) {
      toast.error("Error al guardar: " + (err?.message || "desconocido"));
    } finally {
      setGuardandoPedidoMinimo(false);
    }
  };

  const guardarZonaCobertura = async () => {
    try {
      setGuardandoZonaCobertura(true);
      const { error } = await supabase
        .from("negocios")
        .update({ zona_cobertura: zonaCoberturaInput.trim() || null })
        .eq("id", negocioId);

      if (error) throw error;
      toast.success("Zona de cobertura actualizada");
    } catch (err: any) {
      toast.error("Error al guardar: " + (err?.message || "desconocido"));
    } finally {
      setGuardandoZonaCobertura(false);
    }
  };

  const actualizarHorarioDia = (dia: string, campo: keyof HorarioDia, valor: string | boolean) => {
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
  };

  const guardarHorarios = async () => {
    try {
      setGuardandoHorarios(true);
      const { error } = await supabase
        .from("negocios")
        .update({ horarios })
        .eq("id", negocioId);

      if (error) throw error;
      toast.success("Horarios actualizados");
    } catch (err: any) {
      toast.error("Error al guardar horarios: " + (err?.message || "desconocido"));
    } finally {
      setGuardandoHorarios(false);
    }
  };

  // 🆕 Estado real combinado: igual lógica que en la página pública.
  // El botón manual (negocioAbierto) es para cierres de emergencia;
  // si hay un horario configurado y la hora actual cae fuera de él
  // (o el día está marcado como descanso), se considera cerrado
  // automáticamente, sin que el admin tenga que tocar nada.
  const DIAS_KEYS_JS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

  const hayHorarioConfigurado = () => Object.keys(horarios).length > 0;

  const dentroDeHorarioHabitual = (): boolean => {
    const diaKey = DIAS_KEYS_JS[new Date().getDay()];
    const h = horarios[diaKey];
    if (!h || h.cerrado) return false;

    const [horaApertura, minApertura] = h.apertura.split(":").map(Number);
    const [horaCierre, minCierre] = h.cierre.split(":").map(Number);
    if ([horaApertura, minApertura, horaCierre, minCierre].some((n) => isNaN(n))) return false;

    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const minutosApertura = horaApertura * 60 + minApertura;
    const minutosCierre = horaCierre * 60 + minCierre;

    return minutosAhora >= minutosApertura && minutosAhora <= minutosCierre;
  };

  const negocioCerradoAhora = (): boolean => {
    if (!negocioAbierto) return true;
    if (hayHorarioConfigurado() && !dentroDeHorarioHabitual()) return true;
    return false;
  };

  const cambiarEstadoNegocio = async (nuevoEstado: boolean) => {
    if (nuevoEstado === negocioAbierto) return;
    try {
      setGuardandoEstado(true);
      const { error } = await supabase
        .from("negocios")
        .update({ abierto: nuevoEstado })
        .eq("id", negocioId);

      if (error) throw error;
      setNegocioAbierto(nuevoEstado);
      toast.success(nuevoEstado ? "Negocio marcado como abierto" : "Negocio marcado como cerrado");
    } catch (err: any) {
      toast.error("Error al cambiar el estado: " + (err?.message || "desconocido"));
    } finally {
      setGuardandoEstado(false);
    }
  };

  const guardarMensajeCierre = async () => {
    const texto = mensajeCierreInput.trim() || MENSAJE_CIERRE_POR_DEFECTO;
    try {
      setGuardandoMensajeCierre(true);
      const { error } = await supabase
        .from("negocios")
        .update({ mensaje_cierre_emergencia: texto })
        .eq("id", negocioId);

      if (error) throw error;
      setMensajeCierreInput(texto);
      toast.success("Mensaje de cierre actualizado");
    } catch (err: any) {
      toast.error("Error al guardar el mensaje: " + (err?.message || "desconocido"));
    } finally {
      setGuardandoMensajeCierre(false);
    }
  };

  // Ocultar/mostrar una categoría en la página pública, sin afectar
  // /admin/menu ni /mesero (esto no toca la columna `activo`).
  const toggleVisibilidadCategoria = async (categoria: Categoria) => {
    const nuevoValor = !categoria.visible_en_slug;
    try {
      const { error } = await supabase
        .from("categorias")
        .update({ visible_en_slug: nuevoValor })
        .eq("id", categoria.id);

      if (error) throw error;

      setCategoriasOrdenadas((prev) =>
        prev.map((c) => (c.id === categoria.id ? { ...c, visible_en_slug: nuevoValor } : c))
      );
      toast.success(nuevoValor ? "Categoría visible en tu página" : "Categoría oculta de tu página");
    } catch (err: any) {
      toast.error("Error al cambiar visibilidad: " + (err?.message || "desconocido"));
    }
  };

  // Ocultar/mostrar un producto puntual en la página pública.
  const toggleVisibilidadProducto = async (producto: Producto) => {
    const nuevoValor = !producto.visible_en_slug;
    try {
      const { error } = await supabase
        .from("productos")
        .update({ visible_en_slug: nuevoValor })
        .eq("id", producto.id);

      if (error) throw error;

      setProductos((prev) =>
        prev.map((p) => (p.id === producto.id ? { ...p, visible_en_slug: nuevoValor } : p))
      );
      toast.success(nuevoValor ? "Producto visible en tu página" : "Producto oculto de tu página");
    } catch (err: any) {
      toast.error("Error al cambiar visibilidad: " + (err?.message || "desconocido"));
    }
  };

  const productosFiltrados = useMemo(() => {
    const b = busqueda.toLowerCase();
    return productos.filter(
      (p) => p.nombre.toLowerCase().includes(b) || (p.categorias?.nombre?.toLowerCase() || "").includes(b)
    );
  }, [busqueda, productos]);

  const productosAgrupados = useMemo(() => {
    const grupos: Record<string, GrupoProductos> = {};
    productosFiltrados.forEach((p) => {
      const cat = p.categorias?.nombre ?? "Sin categoría";
      if (!grupos[cat]) {
        grupos[cat] = {
          productos: [],
          config: { icono: p.categorias?.icono ?? "📦", color: p.categorias?.color ?? "from-gray-500 to-gray-600" },
        };
      }
      grupos[cat].productos.push(p);
    });
    Object.keys(grupos).forEach((c) => grupos[c].productos.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));

    // Ordenar las categorías según el orden guardado (categoriasOrdenadas),
    // no alfabéticamente. Cualquier categoría sin match (ej. "Sin categoría")
    // queda al final.
    const ordenNombres = categoriasOrdenadas.map((c) => c.nombre);
    const nombresGrupos = Object.keys(grupos);
    const ordenados = nombresGrupos.sort((a, b) => {
      const idxA = ordenNombres.indexOf(a);
      const idxB = ordenNombres.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    return ordenados.reduce((acc, k) => ({ ...acc, [k]: grupos[k] }), {} as Record<string, GrupoProductos>);
  }, [productosFiltrados, categoriasOrdenadas]);

  // Mover una categoría un puesto arriba o abajo, y persistir el nuevo
  // orden de TODAS en la base de datos (columna `orden` de `categorias`).
  const moverCategoria = async (nombre: string, direccion: "arriba" | "abajo") => {
    const idx = categoriasOrdenadas.findIndex((c) => c.nombre === nombre);
    if (idx === -1) return;
    const nuevoIdx = direccion === "arriba" ? idx - 1 : idx + 1;
    if (nuevoIdx < 0 || nuevoIdx >= categoriasOrdenadas.length) return;

    const nuevaLista = [...categoriasOrdenadas];
    [nuevaLista[idx], nuevaLista[nuevoIdx]] = [nuevaLista[nuevoIdx], nuevaLista[idx]];
    setCategoriasOrdenadas(nuevaLista);

    try {
      setGuardandoOrden(true);
      const actualizaciones = nuevaLista.map((cat, i) =>
        supabase.from("categorias").update({ orden: i }).eq("id", cat.id)
      );
      const resultados = await Promise.all(actualizaciones);
      const conError = resultados.find((r) => r.error);
      if (conError?.error) throw conError.error;
      toast.success("Orden actualizado");
    } catch (err: any) {
      toast.error("Error al guardar el orden: " + (err?.message || "desconocido"));
      cargarDatos();
    } finally {
      setGuardandoOrden(false);
    }
  };

  // Mover un producto un puesto arriba o abajo DENTRO de su misma
  // categoría, y persistir el nuevo orden solo de los productos de
  // esa categoría (columna `orden` de `productos`).
  const moverProducto = async (categoriaNombre: string, productoId: string, direccion: "arriba" | "abajo") => {
    const grupo = productosAgrupados[categoriaNombre];
    if (!grupo) return;

    const idx = grupo.productos.findIndex((p) => p.id === productoId);
    if (idx === -1) return;
    const nuevoIdx = direccion === "arriba" ? idx - 1 : idx + 1;
    if (nuevoIdx < 0 || nuevoIdx >= grupo.productos.length) return;

    const nuevaLista = [...grupo.productos];
    [nuevaLista[idx], nuevaLista[nuevoIdx]] = [nuevaLista[nuevoIdx], nuevaLista[idx]];

    // Actualizar el estado local de productos con el nuevo orden
    setProductos((prev) => {
      const idsEnOrden = nuevaLista.map((p) => p.id);
      const mapaOrden: Record<string, number> = {};
      idsEnOrden.forEach((id, i) => (mapaOrden[id] = i));
      return prev.map((p) => (p.id in mapaOrden ? { ...p, orden: mapaOrden[p.id] } : p));
    });

    try {
      setGuardandoOrden(true);
      const actualizaciones = nuevaLista.map((p, i) =>
        supabase.from("productos").update({ orden: i }).eq("id", p.id)
      );
      const resultados = await Promise.all(actualizaciones);
      const conError = resultados.find((r) => r.error);
      if (conError?.error) throw conError.error;
      toast.success("Orden actualizado");
    } catch (err: any) {
      toast.error("Error al guardar el orden: " + (err?.message || "desconocido"));
      cargarDatos();
    } finally {
      setGuardandoOrden(false);
    }
  };


  useEffect(() => {
    if (busqueda.trim()) {
      setCategoriasAbiertas(new Set(Object.keys(productosAgrupados)));
    }
  }, [busqueda]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCategoria = (nombre: string) => {
    setCategoriasAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) next.delete(nombre);
      else next.add(nombre);
      return next;
    });
  };

  const actualizarCampo = (id: string, campo: "imagen_url" | "descripcion", valor: string) => {
    setEdicion((prev) => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor },
    }));
  };

  const subirFoto = async (id: string, archivo: File) => {
    try {
      setSubiendoFoto(id);

      // Validaciones básicas
      if (!archivo.type.startsWith("image/")) {
        toast.error("Selecciona un archivo de imagen válido");
        return;
      }
      if (archivo.size > 5 * 1024 * 1024) {
        toast.error("La imagen no debe superar 5MB");
        return;
      }

      const extension = archivo.name.split(".").pop();
      const nombreArchivo = `${negocioId}/${id}-${Date.now()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from("productos")
        .upload(nombreArchivo, archivo, { upsert: true });

      if (errorSubida) throw errorSubida;

      const { data: urlData } = supabase.storage.from("productos").getPublicUrl(nombreArchivo);
      const urlPublica = urlData.publicUrl;

      // Actualiza el campo local y guarda directo en la base de datos
      actualizarCampo(id, "imagen_url", urlPublica);

      const { error: errorUpdate } = await supabase
        .from("productos")
        .update({ imagen_url: urlPublica })
        .eq("id", id);

      if (errorUpdate) throw errorUpdate;

      setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, imagen_url: urlPublica } : p)));
      toast.success("Foto actualizada");
    } catch (err: any) {
      console.error("Error subiendo foto:", err);
      toast.error("Error al subir la foto: " + (err?.message || "desconocido"));
    } finally {
      setSubiendoFoto(null);
    }
  };

  const guardarProducto = async (id: string) => {
    try {
      setGuardandoProducto(id);
      const cambios = edicion[id];

      const { error } = await supabase
        .from("productos")
        .update({
          imagen_url: cambios.imagen_url.trim() || null,
          descripcion: cambios.descripcion.trim() || null,
        })
        .eq("id", id);

      if (error) throw error;

      setProductos((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, imagen_url: cambios.imagen_url.trim() || null, descripcion: cambios.descripcion.trim() || null }
            : p
        )
      );

      toast.success("Producto actualizado");
    } catch (err: any) {
      toast.error("Error al guardar: " + (err?.message || "desconocido"));
    } finally {
      setGuardandoProducto(null);
    }
  };

  const hayCambiosPendientes = (p: Producto) => {
    const e = edicion[p.id];
    if (!e) return false;
    return e.imagen_url !== (p.imagen_url ?? "") || e.descripcion !== (p.descripcion ?? "");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Página Domicilios
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Configura tu link público y las fotos/descripciones que ven tus clientes al pedir a domicilio.
          </p>
        </div>

        {/* Sección: link público (slug) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500/10 p-2 rounded-lg">
              <Link2 className="w-4 h-4 text-orange-500" />
            </div>
            <h2 className="font-bold text-white">Tu link de pedidos</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <span className="text-zinc-500 text-sm pl-3 pr-1 whitespace-nowrap">tudominio.com/</span>
              <input
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm py-2.5 pr-3 outline-none min-w-0"
                placeholder="nombre-del-negocio"
              />
            </div>
            <button
              onClick={guardarSlug}
              disabled={guardandoSlug}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
            >
              {guardandoSlug ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>

          {errorSlug && <p className="text-red-400 text-xs">{errorSlug}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={copiarLink}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar link
            </button>
            <a
              href={`/${slugActual}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver página
            </a>
          </div>

          <p className="text-zinc-600 text-xs pt-1">
            Ojo: si cambias el link, el anterior deja de funcionar de inmediato. Actualiza donde lo hayas compartido (redes, WhatsApp, etc.).
          </p>
        </div>

        {/* Sección: pedido mínimo */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500/10 p-2 rounded-lg">
              <Wallet className="w-4 h-4 text-orange-500" />
            </div>
            <h2 className="font-bold text-white">Pedido mínimo para domicilio</h2>
          </div>
          <p className="text-zinc-500 text-xs -mt-1">
            Si lo dejas en $0, no se exige ningún mínimo para confirmar un pedido.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <span className="text-zinc-500 text-sm pl-3 pr-1">$</span>
              <input
                type="number"
                min="0"
                value={pedidoMinimoInput}
                onChange={(e) => setPedidoMinimoInput(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm py-2.5 pr-3 outline-none min-w-0"
                placeholder="0"
              />
            </div>
            <button
              onClick={guardarPedidoMinimo}
              disabled={guardandoPedidoMinimo}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
            >
              {guardandoPedidoMinimo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>

          <p className="text-zinc-600 text-xs">
            Actual: ${pedidoMinimoActual.toLocaleString()}
          </p>
        </div>

        {/* Sección: zona de cobertura */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500/10 p-2 rounded-lg">
              <MapPin className="w-4 h-4 text-orange-500" />
            </div>
            <h2 className="font-bold text-white">Zona de cobertura</h2>
          </div>
          <p className="text-zinc-500 text-xs -mt-1">
            Describe en qué zonas haces domicilios, para que el cliente lo vea antes de pedir (ej: "Solo Bogotá, barrios cercanos al centro").
          </p>

          <textarea
            value={zonaCoberturaInput}
            onChange={(e) => setZonaCoberturaInput(e.target.value)}
            placeholder='Ej: "Domicilios solo dentro de Bogotá"'
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500 resize-none min-h-[70px]"
          />

          <button
            onClick={guardarZonaCobertura}
            disabled={guardandoZonaCobertura}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
          >
            {guardandoZonaCobertura ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>

        {/* Sección: estado abierto/cerrado */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500/10 p-2 rounded-lg">
              <Power className="w-4 h-4 text-orange-500" />
            </div>
            <h2 className="font-bold text-white">Estado del negocio</h2>
          </div>
          <p className="text-zinc-500 text-xs -mt-1">
            Si lo marcas como cerrado, tu página pública de domicilios mostrará que no estás recibiendo pedidos en este momento.
          </p>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                !negocioCerradoAhora() ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
              }`}
            >
              {!negocioCerradoAhora() ? "🟢 Abierto ahora" : "🔴 Cerrado ahora"}
            </span>
            {negocioAbierto && negocioCerradoAhora() && (
              <span className="text-zinc-500 text-xs">(cerrado automáticamente por horario)</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => cambiarEstadoNegocio(true)}
              disabled={guardandoEstado}
              className={`flex-1 h-11 rounded-xl text-sm font-semibold border-2 transition disabled:opacity-60 ${
                negocioAbierto
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              Abrir
            </button>
            <button
              onClick={() => cambiarEstadoNegocio(false)}
              disabled={guardandoEstado}
              className={`flex-1 h-11 rounded-xl text-sm font-semibold border-2 transition disabled:opacity-60 ${
                !negocioAbierto
                  ? "border-red-500 bg-red-500/10 text-red-400"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              Cerrar
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <label className="text-xs font-medium text-zinc-400">
              Mensaje si tienes que cerrar por un imprevisto (dentro de tu horario habitual)
            </label>
            <textarea
              value={mensajeCierreInput}
              onChange={(e) => setMensajeCierreInput(e.target.value)}
              placeholder={MENSAJE_CIERRE_POR_DEFECTO}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500 resize-none min-h-[70px]"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={guardarMensajeCierre}
                disabled={guardandoMensajeCierre}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-4 py-2 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
              >
                {guardandoMensajeCierre ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
              <button
                onClick={() => setMensajeCierreInput(MENSAJE_CIERRE_POR_DEFECTO)}
                className="text-xs text-zinc-500 hover:text-white"
              >
                Restaurar mensaje por defecto
              </button>
            </div>
          </div>
        </div>

        {/* Sección: horario de atención (visual, aún no controla el slug) */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500/10 p-2 rounded-lg">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <h2 className="font-bold text-white">Horario de atención</h2>
          </div>
          <p className="text-zinc-500 text-xs -mt-1">
            Por ahora es solo informativo (no cierra ni abre automáticamente el negocio).
          </p>

          <div className="space-y-2">
            {DIAS_SEMANA.map(({ key, label }) => {
              const dia = horarios[key] ?? horarioVacio();
              return (
                <div key={key} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <span className="text-sm font-medium text-white w-24 shrink-0">{label}</span>

                  <label className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
                    <input
                      type="checkbox"
                      checked={dia.cerrado}
                      onChange={(e) => actualizarHorarioDia(key, "cerrado", e.target.checked)}
                      className="accent-orange-500"
                    />
                    Cerrado
                  </label>

                  {!dia.cerrado && (
                    <>
                      <input
                        type="time"
                        value={dia.apertura}
                        onChange={(e) => actualizarHorarioDia(key, "apertura", e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <span className="text-zinc-500 text-xs">a</span>
                      <input
                        type="time"
                        value={dia.cierre}
                        onChange={(e) => actualizarHorarioDia(key, "cierre", e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={guardarHorarios}
            disabled={guardandoHorarios}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 w-full sm:w-auto"
          >
            {guardandoHorarios ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar horarios
          </button>
        </div>

        {/* Sección: fotos y descripciones de productos, por categoría */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500/10 p-2 rounded-lg">
              <ImageIcon className="w-4 h-4 text-orange-500" />
            </div>
            <h2 className="font-bold text-white">Fotos y descripciones del menú</h2>
          </div>
          <p className="text-zinc-500 text-xs -mt-2">
            Esto se ve reflejado en tu página pública de domicilios. Para cambiar precio, categoría o sabores, ve a la sección Menú.
          </p>
          <p className="text-zinc-600 text-xs flex items-center gap-1.5 -mt-1">
            <GripVertical className="w-3 h-3" /> Usa las flechas junto a cada categoría para cambiar el orden en que se ven en tu página pública.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto o categoría…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {Object.keys(productosAgrupados).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(productosAgrupados).map(([catNombre, grupo], index, arr) => {
                const abierta = categoriasAbiertas.has(catNombre);
                const esSinCategoria = catNombre === "Sin categoría";
                const categoriaObj = categoriasOrdenadas.find((c) => c.nombre === catNombre);
                const categoriaOculta = categoriaObj ? !categoriaObj.visible_en_slug : false;
                return (
                  <div
                    key={catNombre}
                    className={`bg-zinc-900 border rounded-xl overflow-hidden ${
                      categoriaOculta ? "border-zinc-700 opacity-60" : "border-zinc-800"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between p-3.5">
                      <button
                        onClick={() => toggleCategoria(catNombre)}
                        className="flex items-center gap-2.5 flex-1 min-w-0"
                      >
                        <div className={`bg-gradient-to-r ${grupo.config.color} p-1.5 rounded-lg shrink-0`}>
                          <span className="text-base">{grupo.config.icono}</span>
                        </div>
                        <span className="font-bold text-white text-sm truncate">{catNombre}</span>
                        <span className="text-xs text-zinc-500 font-medium shrink-0">({grupo.productos.length})</span>
                        {categoriaOculta && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full shrink-0">
                            Oculta
                          </span>
                        )}
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {!esSinCategoria && categoriaObj && (
                          <button
                            onClick={() => toggleVisibilidadCategoria(categoriaObj)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400"
                            title={categoriaOculta ? "Mostrar en tu página" : "Ocultar de tu página"}
                          >
                            {categoriaOculta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {!esSinCategoria && (
                          <>
                            <button
                              onClick={() => moverCategoria(catNombre, "arriba")}
                              disabled={guardandoOrden || index === 0}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
                              title="Mover arriba"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moverCategoria(catNombre, "abajo")}
                              disabled={guardandoOrden || index === arr.length - 1}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
                              title="Mover abajo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button onClick={() => toggleCategoria(catNombre)} className="p-1.5">
                          <ChevronDown
                            className={`w-4 h-4 text-zinc-500 transition-transform ${abierta ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>
                    </div>

                    {abierta && (
                      <div className="border-t border-zinc-800 p-3.5 space-y-3">
                        {grupo.productos.map((p, indexProducto, arrProductos) => {
                          const e = edicion[p.id] ?? { imagen_url: "", descripcion: "" };
                          const cambios = hayCambiosPendientes(p);
                          const productoOculto = !p.visible_en_slug;
                          return (
                            <div
                              key={p.id}
                              className={`bg-zinc-950 border rounded-xl p-4 ${
                                productoOculto ? "border-zinc-700 opacity-60" : "border-zinc-800"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex flex-col gap-0.5 shrink-0 pt-1">
                                  <button
                                    onClick={() => moverProducto(catNombre, p.id, "arriba")}
                                    disabled={guardandoOrden || indexProducto === 0 || busqueda.trim() !== ""}
                                    className="p-1 rounded hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed text-zinc-500"
                                    title={busqueda.trim() !== "" ? "Limpia la búsqueda para reordenar" : "Mover arriba"}
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => moverProducto(catNombre, p.id, "abajo")}
                                    disabled={guardandoOrden || indexProducto === arrProductos.length - 1 || busqueda.trim() !== ""}
                                    className="p-1 rounded hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed text-zinc-500"
                                    title={busqueda.trim() !== "" ? "Limpia la búsqueda para reordenar" : "Mover abajo"}
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                                <label
                                  htmlFor={`foto-${p.id}`}
                                  className="group relative w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer"
                                >
                                  {e.imagen_url ? (
                                    <img src={e.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xl">{grupo.config.icono}</span>
                                  )}

                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    {subiendoFoto === p.id ? (
                                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    ) : (
                                      <Camera className="w-5 h-5 text-white" />
                                    )}
                                  </div>

                                  <input
                                    id={`foto-${p.id}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={subiendoFoto === p.id}
                                    onChange={(ev) => {
                                      const archivo = ev.target.files?.[0];
                                      if (archivo) subirFoto(p.id, archivo);
                                      ev.target.value = "";
                                    }}
                                  />
                                </label>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <h3 className="text-white font-semibold text-sm truncate">{p.nombre}</h3>
                                      {productoOculto && (
                                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full shrink-0">
                                          Oculto
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-green-500 text-xs font-bold">
                                        ${p.precio.toLocaleString()}
                                      </span>
                                      <button
                                        onClick={() => toggleVisibilidadProducto(p)}
                                        className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400"
                                        title={productoOculto ? "Mostrar en tu página" : "Ocultar de tu página"}
                                      >
                                        {productoOculto ? (
                                          <EyeOff className="w-3.5 h-3.5" />
                                        ) : (
                                          <Eye className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <input
                                    value={e.imagen_url}
                                    onChange={(ev) => actualizarCampo(p.id, "imagen_url", ev.target.value)}
                                    placeholder="O pega una URL de foto (https://...)"
                                    className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-orange-500"
                                  />
                                  <textarea
                                    value={e.descripcion}
                                    onChange={(ev) => actualizarCampo(p.id, "descripcion", ev.target.value)}
                                    placeholder="Descripción corta (ej: carne, queso, lechuga...)"
                                    className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-orange-500 resize-none min-h-[50px]"
                                  />

                                  {/* 🆕 Sabores del producto — solo informativo, se editan en /admin/menu */}
                                  {p.sabores && p.sabores.length > 0 && (
                                    <div className="mt-2 flex items-start gap-1.5">
                                      <Soup className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                                      <p className="text-xs text-purple-300">
                                        Sabores: {p.sabores.map((s) => s.nombre).join(", ")}
                                        {p.max_sabores ? ` (máx. ${p.max_sabores})` : ''}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {cambios && (
                                <div className="flex justify-end mt-2">
                                  <button
                                    onClick={() => guardarProducto(p.id)}
                                    disabled={guardandoProducto === p.id}
                                    className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-60"
                                  >
                                    {guardandoProducto === p.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                    Guardar cambios
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm text-center py-6">No se encontraron productos</p>
          )}
        </div>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
}