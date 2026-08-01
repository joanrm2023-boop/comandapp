"use client";

/**
 * Página PÚBLICA de pedidos a domicilio (sin login) — v2 rediseño visual.
 * Ruta: app/[slug]/page.tsx  →  ej: dishhub.com/pizzas-bob
 *
 * Cambios frente a la v1:
 * - Categorías como acordeón desplegable (una lista por categoría, se
 *   abre/cierra), en vez de tabs horizontales.
 * - Header tipo "hero" con imagen de portada del negocio.
 * - Barra de progreso de 2 pasos: Menú → Datos y pago.
 * - Aviso de horario/estado abierto-cerrado.
 * - Badge opcional "Más pedido" por producto (campo `destacado`).
 * - 🆕 Selección de sabores (chips) para productos que los tengan
 *   configurados (ej: pizzas), respetando el máximo permitido por
 *   producto (1 = un solo sabor, 2 = hasta mitad y mitad).
 * - 🆕 El envío por WhatsApp (intento directo a la app + cuenta
 *   regresiva + botón de respaldo) se movió a un componente aparte:
 *   components/pedido-publico/ConfirmacionPedidoWhatsapp.tsx
 *
 * Pendiente de tu lado (no lo resuelve este archivo):
 * - RLS de INSERT público (clientes, pedidos, detalle_pedidos).
 * - Columna opcional `imagen_url` en productos y `imagen_portada`/
 *   `horario_apertura`/`horario_cierre` en negocios, si quieres usarlas
 *   (el archivo ya contempla que puedan no existir y no rompe si faltan).
 */

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Send,
  X,
  Loader2,
  StickyNote,
  MapPin,
  Phone,
  User,
  ChevronDown,
  ArrowLeft,
  Clock,
  Flame,
  Share2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast, Toaster } from "sonner";
import ConfirmacionPedidoWhatsapp from "@/components/pedido-publico/ConfirmacionPedidoWhatsapp";

// ---------- Tipos ----------
interface Categoria {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  activo: boolean;
  orden: number;
  visible_en_slug: boolean;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
  categoria_id: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  destacado?: boolean;
  visible_en_slug: boolean;
  orden: number;
  max_sabores?: number;
  categorias?: { id: string; nombre: string; icono: string; color: string } | null;
}

// 🆕 Sabor del catálogo
interface Sabor {
  id: string;
  nombre: string;
}

interface ItemPedido {
  id: string; // 🆕 identificador único de esta línea del carrito (necesario porque un mismo producto con sabores puede tener varias líneas distintas, ej: 2x Carnes + 1x Champiñones)
  producto: Producto;
  cantidad: number;
  notas: string;
  sabores?: Sabor[]; // 🆕 sabores elegidos para este ítem (si el producto los tiene)
}

// 🆕 Compara dos listas de sabores sin importar el orden, para saber si
// dos líneas del carrito representan exactamente la misma combinación.
const mismaCombinacionSabores = (a?: Sabor[], b?: Sabor[]): boolean => {
  const idsA = (a ?? []).map((s) => s.id).sort();
  const idsB = (b ?? []).map((s) => s.id).sort();
  if (idsA.length !== idsB.length) return false;
  return idsA.every((id, i) => id === idsB[i]);
};

const generarIdItem = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

interface GrupoProductos {
  productos: Producto[];
  config: { icono: string; color: string };
}


interface HorarioDia {
  apertura: string;
  cierre: string;
  cerrado: boolean;
}

interface Negocio {
  id: string;
  nombre: string;
  logo_url: string | null;
  imagen_portada: string | null;
  telefono: string | null;
  direccion: string | null;
  pedido_minimo: number | null;
  costo_domicilio: number | null;
  abierto: boolean | null;
  horarios: Record<string, HorarioDia> | null;
  mensaje_cierre_emergencia: string | null;
  imagen_fondo: string | null;
  zona_cobertura: string | null;
}

export default function PedidoDomicilioPublico() {
  const params = useParams();
  const slug = params?.slug as string;

  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [mesaDomicilioId, setMesaDomicilioId] = useState<string | null>(null);

  // 🆕 Sabores disponibles por producto: { [producto_id]: Sabor[] }
  const [saboresPorProducto, setSaboresPorProducto] = useState<Record<string, Sabor[]>>({});

  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pedidoYaEnviado, setPedidoYaEnviado] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{ numero: number | string } | null>(null);
  const [linkWhatsapp, setLinkWhatsapp] = useState<string | null>(null);
  // 🆕 Datos adicionales para que ConfirmacionPedidoWhatsapp pueda
  // intentar abrir la app nativa (whatsapp://) directamente.
  const [telefonoLimpioWhatsapp, setTelefonoLimpioWhatsapp] = useState<string | null>(null);
  const [mensajeTextoWhatsapp, setMensajeTextoWhatsapp] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [categoriasAbiertas, setCategoriasAbiertas] = useState<Set<string>>(new Set());
  const [pedido, setPedido] = useState<ItemPedido[]>([]);
  const [paso, setPaso] = useState<"menu" | "checkout">("menu");

  const [modalNotasOpen, setModalNotasOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadTemp, setCantidadTemp] = useState(1);
  const [notasTemp, setNotasTemp] = useState("");
  const [saboresSeleccionadosTemp, setSaboresSeleccionadosTemp] = useState<string[]>([]); // 🆕 ids elegidos en el modal
  const [imagenAmpliada, setImagenAmpliada] = useState<{ url: string; nombre: string } | null>(null);

  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [notasPedido, setNotasPedido] = useState("");
  const [medioPago, setMedioPago] = useState("");
  const [valorDomicilio, setValorDomicilio] = useState<number>(0);

  useEffect(() => {
    if (slug) cargarNegocioYMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Persistencia del carrito: recuperarlo si el cliente cerró la página
  // sin terminar su pedido (una clave distinta por negocio).
  useEffect(() => {
    if (!slug) return;
    try {
      const guardado = localStorage.getItem(`carrito-${slug}`);
      if (guardado) {
        const items: ItemPedido[] = JSON.parse(guardado);
        if (Array.isArray(items) && items.length > 0) setPedido(items);
      }
    } catch (err) {
      console.warn("No se pudo leer el carrito guardado:", err);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    try {
      if (pedido.length > 0) {
        localStorage.setItem(`carrito-${slug}`, JSON.stringify(pedido));
      } else {
        localStorage.removeItem(`carrito-${slug}`);
      }
    } catch (err) {
      console.warn("No se pudo guardar el carrito:", err);
    }
  }, [pedido, slug]);

  const cargarNegocioYMenu = async () => {
    try {
      setLoading(true);
      setErrorCarga(null);

      const { data: negocioData, error: negocioError } = await supabase
        .from("negocios")
        .select("id, nombre, logo_url, imagen_portada, telefono, direccion, activo, suspendido, pedido_minimo, costo_domicilio, abierto, horarios, mensaje_cierre_emergencia, imagen_fondo, zona_cobertura")        .eq("slug", slug)
        .single();

      if (negocioError || !negocioData) {
        setErrorCarga("No encontramos este negocio.");
        return;
      }
      if (!negocioData.activo || negocioData.suspendido) {
        setErrorCarga("Este negocio no está recibiendo pedidos en este momento.");
        return;
      }

      setNegocio(negocioData);
      setValorDomicilio(negocioData.costo_domicilio ?? 3000);
      const negocioId = negocioData.id;

      const { data: categoriasData } = await supabase
        .from("categorias")
        .select("*")
        .eq("activo", true)
        .eq("visible_en_slug", true)
        .eq("negocio_id", negocioId)
        .order("orden", { ascending: true });

      const { data: productosData } = await supabase
        .from("productos")
        .select(`id, nombre, precio, activo, categoria_id, descripcion, imagen_url, visible_en_slug, orden, max_sabores,
                 categorias ( id, nombre, icono, color )`)
        .eq("activo", true)
        .eq("visible_en_slug", true)
        .eq("negocio_id", negocioId)
        .order("orden", { ascending: true });

      const { data: mesaData } = await supabase
        .from("mesas")
        .select("id, numero")
        .eq("negocio_id", negocioId)
        .ilike("numero", "%domicilio%")
        .limit(1)
        .maybeSingle();

      if (!mesaData) {
        setErrorCarga("Este negocio aún no tiene configurada la mesa de domicilios web.");
        return;
      }

      const catsFinal = (categoriasData as any) ?? [];
      setCategorias(catsFinal);

      // 🆕 Filtrar productos cuya CATEGORÍA esté oculta (no solo el
      // producto individual). La consulta de productos no cruza contra
      // categorias.visible_en_slug, así que lo hacemos aquí: si el
      // producto tiene categoria_id y esa categoría no está en la lista
      // ya filtrada de categorías visibles, se descarta.
      const idsCategoriasVisibles = new Set(catsFinal.map((c: any) => c.id));
      const productosFinal = ((productosData as any) ?? []).filter((p: any) => {
        if (!p.categoria_id) return true; // sin categoría, se deja pasar (cae en "Otros")
        return idsCategoriasVisibles.has(p.categoria_id);
      });

      setProductos(productosFinal);

      // 🆕 Traer los sabores asignados a los productos que los tengan
      // (producto_sabores → sabores), para mostrarlos como chips
      // seleccionables en el modal.
      const idsConSabores = productosFinal
        .filter((p: Producto) => (p.max_sabores ?? 0) > 0)
        .map((p: Producto) => p.id);

      if (idsConSabores.length > 0) {
        const { data: relacionesSabores } = await supabase
          .from("producto_sabores")
          .select("producto_id, sabores ( id, nombre )")
          .in("producto_id", idsConSabores);

        const mapa: Record<string, Sabor[]> = {};
        (relacionesSabores as any[] ?? []).forEach((r) => {
          if (!r.sabores) return;
          if (!mapa[r.producto_id]) mapa[r.producto_id] = [];
          mapa[r.producto_id].push(r.sabores);
        });
        setSaboresPorProducto(mapa);
      }

      setMesaDomicilioId(mesaData.id);
      if (catsFinal.length > 0) setCategoriasAbiertas(new Set([catsFinal[0].nombre]));
    } catch (err) {
      console.error("Error cargando menú público:", err);
      setErrorCarga("Ocurrió un error cargando el menú.");
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const b = busqueda.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(b) ||
        (p.categorias?.nombre?.toLowerCase() || "").includes(b)
      );
    });
  }, [busqueda, productos]);

  const productosAgrupados = useMemo(() => {
    const grupos: Record<string, GrupoProductos> = {};
    productosFiltrados.forEach((p) => {
      const cat = p.categorias?.nombre ?? "Otros";
      if (!grupos[cat]) {
        grupos[cat] = {
          productos: [],
          config: { icono: p.categorias?.icono ?? "📦", color: p.categorias?.color ?? "from-gray-500 to-gray-600" },
        };
      }
      grupos[cat].productos.push(p);
    });
    Object.keys(grupos).forEach((c) => grupos[c].productos.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));

    // Ordenar según el orden guardado en `categorias` (columna `orden`),
    // no alfabéticamente. Cualquier grupo sin match (ej. "Otros") queda al final.
    const ordenNombres = categorias.map((c) => c.nombre);
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
  }, [productosFiltrados, categorias]);

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

  const abrirNotas = (producto: Producto) => {
    if (negocioCerradoAhora()) {
      toast.error(mensajeCierre());
      return;
    }
    setProductoSeleccionado(producto);

    const tieneSabores = (saboresPorProducto[producto.id]?.length ?? 0) > 0;

    if (tieneSabores) {
      // 🆕 Un producto con sabores puede tener varias líneas distintas en el
      // carrito (ej: 2x Carnes + 1x Champiñones), así que cada vez que se
      // toca la tarjeta se abre el modal en modo "agregar nueva línea",
      // sin precargar ninguna combinación existente.
      setCantidadTemp(1);
      setNotasTemp("");
      setSaboresSeleccionadosTemp([]);
    } else {
      // Sin sabores: comportamiento original, edita la única línea de este producto
      const existente = pedido.find((i) => i.producto.id === producto.id);
      setCantidadTemp(existente?.cantidad ?? 1);
      setNotasTemp(existente?.notas ?? "");
      setSaboresSeleccionadosTemp([]);
    }

    setModalNotasOpen(true);
  };

  // 🆕 Marca/desmarca un sabor en el modal, respetando el máximo del producto
  const toggleSaborTemp = (saborId: string) => {
    const max = productoSeleccionado?.max_sabores ?? 0;

    setSaboresSeleccionadosTemp((prev) => {
      const yaEsta = prev.includes(saborId);

      if (yaEsta) {
        return prev.filter((id) => id !== saborId);
      }

      if (max === 1) {
        // Comportamiento tipo radio: el nuevo reemplaza al anterior
        return [saborId];
      }

      if (prev.length >= max) {
        // Ya alcanzó el máximo (ej. 2 de 2), no se agrega uno más
        return prev;
      }

      return [...prev, saborId];
    });
  };

  const confirmarProducto = () => {
    if (!productoSeleccionado || cantidadTemp <= 0) return;

    // 🆕 Si el producto tiene sabores configurados, exigir al menos uno
    const saboresDisponibles = saboresPorProducto[productoSeleccionado.id] ?? [];
    if (saboresDisponibles.length > 0 && saboresSeleccionadosTemp.length === 0) {
      toast.error("Elige al menos un sabor para este producto");
      return;
    }

    const saboresElegidos = saboresDisponibles.filter((s) => saboresSeleccionadosTemp.includes(s.id));
    const tieneSabores = saboresDisponibles.length > 0;

    setPedido((prev) => {
      if (tieneSabores) {
        // 🆕 Buscar si ya existe una línea con EXACTAMENTE la misma
        // combinación de sabores y la misma nota para este producto —
        // si existe, se le suma la cantidad; si no, se agrega como
        // línea nueva (así conviven "2x Carnes" y "1x Champiñones").
        const idxExistente = prev.findIndex(
          (i) =>
            i.producto.id === productoSeleccionado.id &&
            mismaCombinacionSabores(i.sabores, saboresElegidos) &&
            (i.notas || "").trim() === notasTemp.trim()
        );

        if (idxExistente !== -1) {
          return prev.map((i, idx) =>
            idx === idxExistente ? { ...i, cantidad: i.cantidad + cantidadTemp } : i
          );
        }

        return [
          ...prev,
          {
            id: generarIdItem(),
            producto: productoSeleccionado,
            cantidad: cantidadTemp,
            notas: notasTemp,
            sabores: saboresElegidos,
          },
        ];
      }

      // Sin sabores: comportamiento original, una sola línea por producto
      const existe = prev.find((i) => i.producto.id === productoSeleccionado.id);
      if (existe) {
        return prev.map((i) =>
          i.producto.id === productoSeleccionado.id
            ? { ...i, cantidad: cantidadTemp, notas: notasTemp, sabores: saboresElegidos }
            : i
        );
      }
      return [
        ...prev,
        { id: generarIdItem(), producto: productoSeleccionado, cantidad: cantidadTemp, notas: notasTemp, sabores: saboresElegidos },
      ];
    });
    setModalNotasOpen(false);
    setProductoSeleccionado(null);
    setSaboresSeleccionadosTemp([]);
  };

  const cambiarCantidad = (productoId: string, delta: number) => {
    if (negocioCerradoAhora()) {
      toast.error(mensajeCierre());
      return;
    }
    setPedido((prev) =>
      prev
        .map((i) => (i.producto.id === productoId ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i))
        .filter((i) => i.cantidad > 0)
    );
  };

  const eliminarItemDelCarrito = (itemId: string) => {
    setPedido((prev) => prev.filter((i) => i.id !== itemId));
  };

  const obtenerCantidad = (productoId: string) => pedido.find((i) => i.producto.id === productoId)?.cantidad ?? 0;

  const calcularSubtotal = () => pedido.reduce((sum, i) => sum + i.producto.precio * i.cantidad, 0);
  // Esta página es exclusivamente de domicilio: no aplica propina
  // (misma regla que en MeseroPage/print-server), y el costo de
  // domicilio no lo pone el cliente — lo define el negocio manualmente.
  const calcularTotal = () => calcularSubtotal() + valorDomicilio;
  const totalItems = pedido.reduce((s, i) => s + i.cantidad, 0);

  // Arma el link de wa.me con el resumen del pedido, listo para que el
  // cliente le dé "Enviar" desde su propio WhatsApp.
  // El número sale de negocios.telefono — cada negocio usa el suyo
  // automáticamente, sin tocar código.
  // 🆕 Además de devolver el link ya armado, deja guardados el número
  // limpio y el mensaje SIN codificar en el estado, para que
  // ConfirmacionPedidoWhatsapp pueda intentar abrir la app nativa
  // directo (whatsapp://) sin tener que reconstruir esta lógica.
  const construirLinkWhatsapp = (numeroPedido: number | string) => {
    if (!negocio?.telefono) return null;

    // Limpia el número: quita espacios, guiones, paréntesis y el +
    let numeroLimpio = negocio.telefono.replace(/[\s\-()+ ]/g, "");

    // Si no trae código de país (asume Colombia, 10 dígitos locales),
    // le antepone 57. Ajusta este supuesto si el negocio no es de Colombia.
    if (numeroLimpio.length === 10) {
      numeroLimpio = "57" + numeroLimpio;
    }

    const itemsTexto = pedido
      .map((item) => {
        // 🆕 Incluir sabores elegidos junto a la nota del ítem, si aplica
        const saboresTexto = item.sabores && item.sabores.length > 0
          ? ` [${item.sabores.map((s) => s.nombre).join(" / ")}]`
          : "";
        return `${item.cantidad}x ${item.producto.nombre}${saboresTexto}${item.notas ? ` (${item.notas})` : ""}`;
      })
      .join("\n");

    const mensaje =
      `*✦ NUEVO PEDIDO #${numeroPedido} ✦*\n` +
      `━━━━━━━━━━━━━━━\n` +
      `▸ *Cliente:* ${nombreCliente}\n` +
      `▸ *Tel:* ${telefonoCliente}\n` +
      `▸ *Dirección:* ${direccionCliente}\n` +
      (notasPedido.trim() ? `▸ *Nota:* ${notasPedido.trim()}\n` : "") +
      `━━━━━━━━━━━━━━━\n` +
      `${itemsTexto}\n` +
      `━━━━━━━━━━━━━━━\n` +
      `▸ *Total:* $${calcularTotal().toLocaleString()}\n` +
      `▸ *Pago:* ${medioPago}`;

    // 🆕 Guardar por separado para ConfirmacionPedidoWhatsapp
    setTelefonoLimpioWhatsapp(numeroLimpio);
    setMensajeTextoWhatsapp(mensaje);

    return `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
  };

  const enviarPedido = async () => {
    if (!negocio || !mesaDomicilioId) return;
    if (pedidoYaEnviado) return; // bloqueo inmediato contra doble clic/doble toque
    if (negocioCerradoAhora()) return toast.error(mensajeCierre());
    if (pedido.length === 0) return toast.error("Tu carrito está vacío");
    if (!nombreCliente.trim()) return toast.error("Ingresa tu nombre");
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombreCliente.trim())) {
      return toast.error("El nombre solo puede contener letras");
    }
    if (nombreCliente.trim().length > 40) return toast.error("El nombre no puede superar 40 caracteres");

    if (!telefonoCliente.trim()) return toast.error("Ingresa tu teléfono");
    if (!/^\d{10}$/.test(telefonoCliente.trim())) {
      return toast.error("El teléfono debe tener exactamente 10 dígitos, sin letras ni espacios");
    }

    if (!direccionCliente.trim()) return toast.error("Ingresa tu dirección de entrega");
    if (direccionCliente.trim().length < 5) return toast.error("Ingresa una dirección más completa");

    if (!medioPago) return toast.error("Selecciona un método de pago, es obligatorio");

    const minimo = negocio.pedido_minimo ?? 0;
    if (minimo > 0 && calcularSubtotal() < minimo) {
      return toast.error(`El pedido mínimo es de $${minimo.toLocaleString()}`);
    }

    setPedidoYaEnviado(true); // bloquea el botón desde ya, antes de cualquier await

    try {
      setEnviando(true);

      // Cliente: usamos la función RPC buscar_o_crear_cliente_publico en
      // vez de select/insert directo a la tabla `clientes`, para no
      // exponer esa tabla al rol anon (la función solo devuelve el id).
      const { data: clienteIdData, error: errorCliente } = await supabase.rpc(
        "buscar_o_crear_cliente_publico",
        {
          p_nombre: nombreCliente.trim(),
          p_telefono: telefonoCliente.trim(),
          p_direccion: direccionCliente.trim(),
          p_negocio_id: negocio.id,
        }
      );

      if (errorCliente || !clienteIdData) {
        throw errorCliente ?? new Error("No se pudo registrar el cliente");
      }

      const clienteId = clienteIdData as string;

      const totalGuardado = calcularTotal();

      // Los ítems se mandan junto con el pedido en la MISMA función
      // (SECURITY DEFINER), para que la inserción en detalle_pedidos
      // no dependa de ninguna política RLS adicional para anon —
      // la subconsulta que se necesitaría ahí siempre chocaría con el
      // RLS de `pedidos` (anon no tiene SELECT sobre esa tabla, a propósito).
      // 🆕 sabor_ids: se agrega para que el RPC también inserte la
      // relación en detalle_pedido_sabores.
      const itemsParaRpc = pedido.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio,
        subtotal: item.producto.precio * item.cantidad,
        notas: item.notas || null,
        sabor_ids: item.sabores?.map((s) => s.id) ?? [],
      }));

      const { data: pedidoRpcData, error: errPedido } = await supabase.rpc(
        "crear_pedido_publico",
        {
          p_mesa_id: mesaDomicilioId,
          p_negocio_id: negocio.id,
          p_cliente_id: clienteId,
          p_total: totalGuardado,
          p_direccion: direccionCliente.trim(),
          p_valor_domicilio: valorDomicilio,
          p_medio_pago: medioPago,
          p_notas: notasPedido.trim() || null,
          p_items: itemsParaRpc,
        }
      );

      if (errPedido || !pedidoRpcData || pedidoRpcData.length === 0) {
        throw errPedido ?? new Error("No se pudo crear el pedido");
      }

      const pedidoData = pedidoRpcData[0]; // { id, numero_pedido }

      const numeroPedidoFinal = pedidoData.numero_pedido ?? pedidoData.id.slice(-6).toUpperCase();
      const link = construirLinkWhatsapp(numeroPedidoFinal);
      setLinkWhatsapp(link);
      if (!link) {
        console.warn("El negocio no tiene teléfono cargado en la tabla negocios; no se generó el link de WhatsApp.");
      }
      setPedidoConfirmado({ numero: numeroPedidoFinal });

      setPedido([]);
      setPaso("menu");
      setNombreCliente("");
      setTelefonoCliente("");
      setDireccionCliente("");
      setNotasPedido("");
      setMedioPago("");
    } catch (err: any) {
      console.error("Error enviando pedido público:", err);
      toast.error("No pudimos enviar tu pedido: " + (err?.message || "error desconocido"));
      setPedidoYaEnviado(false); // permitir reintentar si falló
    } finally {
      setEnviando(false);
    }
  };

  const DIAS_KEYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

  const obtenerHorarioHoy = (): string | null => {
    if (!negocio?.horarios) return null;
    const diaKey = DIAS_KEYS[new Date().getDay()];
    const horarioHoy = negocio.horarios[diaKey];
    if (!horarioHoy) return null;
    if (horarioHoy.cerrado) return "Cerrado hoy";
    return `Hoy: ${horarioHoy.apertura} - ${horarioHoy.cierre}`;
  };

  // 🆕 Horario completo de la semana, para mostrarlo cuando el negocio
  // está cerrado, así el cliente sabe cuándo volver.
  const DIAS_LABELS: Record<string, string> = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sábado",
    domingo: "Domingo",
  };

  const obtenerHorarioSemanaCompleto = (): { dia: string; texto: string }[] => {
    if (!negocio?.horarios) return [];
    const ordenDias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
    return ordenDias
      .filter((dia) => negocio.horarios![dia])
      .map((dia) => {
        const h = negocio.horarios![dia];
        return {
          dia: DIAS_LABELS[dia],
          texto: h.cerrado ? "Cerrado" : `${h.apertura} - ${h.cierre}`,
        };
      });
  };

  // Determina si, según el horario configurado, el negocio DEBERÍA estar
  // abierto ahora mismo. Sirve para distinguir un cierre por emergencia
  // (dentro de horario pero el admin lo apagó manualmente) de un cierre
  // normal (fuera de horario o día de descanso).
  const dentroDeHorarioHabitual = (): boolean => {
    if (!negocio?.horarios) return false;
    const diaKey = DIAS_KEYS[new Date().getDay()];
    const h = negocio.horarios[diaKey];
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

  const mensajeCierre = (): string => {
    if (dentroDeHorarioHabitual()) {
      return (
        negocio?.mensaje_cierre_emergencia?.trim() ||
        "Lo sentimos, tuvimos que cerrar por un imprevisto. Pronto estaremos de vuelta en nuestro horario habitual."
      );
    }
    return "Este negocio no está recibiendo pedidos por ahora. Vuelve a intentarlo más tarde.";
  };

  // 🆕 Cierre automático por horario. El negocio se considera cerrado si:
  // - el admin lo apagó manualmente (negocio.abierto === false), O
  // - tiene un horario configurado para hoy y la hora actual cae fuera
  //   de él (o el día está marcado como "cerrado" en el horario semanal).
  // Si el negocio nunca configuró ningún horario (objeto vacío), esto NO
  // restringe nada — solo el toggle manual manda en ese caso.
  const hayHorarioConfigurado = () => {
    return !!negocio?.horarios && Object.keys(negocio.horarios).length > 0;
  };

  const negocioCerradoAhora = (): boolean => {
    if (negocio?.abierto === false) return true;
    if (hayHorarioConfigurado() && !dentroDeHorarioHabitual()) return true;
    return false;
  };

  const [linkParaCopiarManual, setLinkParaCopiarManual] = useState<string | null>(null);

  const compartirMenu = async () => {
    const url = window.location.href;
    const textoCompartir = `¡Mira el menú de ${negocio?.nombre}! Pide a domicilio aquí: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: negocio?.nombre ?? "Menú", text: textoCompartir, url });
        return;
      } catch (err) {
        // El usuario canceló el share; no hacemos nada más
        return;
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado al portapapeles");
        return;
      } catch (err) {
        // Sigue al fallback manual de abajo
      }
    }

    // Fallback: ni share ni clipboard disponibles (típico en http:// sin HTTPS,
    // como al probar por IP local desde el celular). Mostramos el link
    // para copiarlo manualmente.
    setLinkParaCopiarManual(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-9 h-9 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando menú…</p>
        </div>
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-3">🚫</div>
          <p className="text-gray-700 font-medium">{errorCarga}</p>
        </div>
      </div>
    );
  }

  if (pedidoConfirmado) {
    return (
      <ConfirmacionPedidoWhatsapp
        numeroPedido={pedidoConfirmado.numero}
        linkWhatsapp={linkWhatsapp}
        telefonoLimpio={telefonoLimpioWhatsapp}
        mensajeTexto={mensajeTextoWhatsapp}
        onNuevoPedido={() => {
          setPedidoConfirmado(null);
          setLinkWhatsapp(null);
          setPedidoYaEnviado(false);
          setTelefonoLimpioWhatsapp(null);
          setMensajeTextoWhatsapp(null);
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen pb-28"
      style={
        negocio?.imagen_fondo
          ? {
              backgroundImage: `url(${negocio.imagen_fondo})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : { backgroundColor: "#fafaf8" }
      }
    >
      <div
        className="relative h-64 overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900"
        style={
          negocio?.imagen_portada
            ? {
                backgroundImage: `url(${negocio.imagen_portada})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {negocio?.imagen_portada ? (
          <div className="absolute inset-0 bg-black/50" />
        ) : (
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,#f97316,transparent_60%)]" />
        )}
        <div className="relative h-full max-w-3xl mx-auto px-4 flex items-end justify-between pb-4">
          <div className="flex items-center gap-3">
            {negocio?.logo_url ? (
              <img src={negocio.logo_url} alt={negocio.nombre} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-lg" />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                🍴
              </div>
            )}
            <div>
              <h1 className="font-bold text-xl text-white leading-tight">{negocio?.nombre}</h1>
              <div className={`flex items-center gap-1.5 text-sm font-medium mt-1 ${negocioCerradoAhora() ? "text-red-400" : "text-emerald-400"}`}>
                <span className={`w-2 h-2 rounded-full inline-block ${negocioCerradoAhora() ? "bg-red-400" : "bg-emerald-400"}`} />
                {negocioCerradoAhora() ? "Cerrado ahora" : "Abierto ahora"}
                {obtenerHorarioHoy() && (
                  <>
                    <Clock className="w-3.5 h-3.5 ml-1.5 text-white/70" />
                    <span className="text-white/70">{obtenerHorarioHoy()}</span>
                  </>
                )}
              </div>
              {negocio?.zona_cobertura && (
                <div className="flex items-start gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-white/60 mt-0.5 shrink-0" />
                  <span className="text-white/60 text-sm">{negocio.zona_cobertura}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={compartirMenu}
            className="bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white p-2.5 rounded-full shrink-0"
            title="Compartir menú"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className={`flex items-center gap-1.5 ${paso === "menu" ? "text-orange-600" : "text-gray-400"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${paso === "menu" ? "bg-orange-500 text-white" : "bg-gray-200"}`}>1</span>
            Menú
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className={`flex items-center gap-1.5 ${paso === "checkout" ? "text-orange-600" : "text-gray-400"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${paso === "checkout" ? "bg-orange-500 text-white" : "bg-gray-200"}`}>2</span>
            Datos y pago
          </div>
        </div>

        {negocioCerradoAhora() && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-lg leading-none">🔴</span>
            <div className="flex-1">
              <p className="text-red-700 text-sm font-semibold">
                {dentroDeHorarioHabitual() ? "Cerrado por imprevisto" : "Cerrado en este momento"}
              </p>
              <p className="text-red-500 text-xs">
                {mensajeCierre()}
              </p>

              {obtenerHorarioSemanaCompleto().length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-red-200">
                  <p className="text-red-600 text-xs font-semibold mb-1">Nuestro horario:</p>
                  <div className="space-y-0.5">
                    {obtenerHorarioSemanaCompleto().map(({ dia, texto }) => (
                      <div key={dia} className="flex justify-between text-xs text-red-500">
                        <span>{dia}</span>
                        <span className="font-medium">{texto}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {paso === "menu" && (
        <div className="max-w-3xl mx-auto p-4">
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en el menú…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none"
            />
          </div>

          {Object.keys(productosAgrupados).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(productosAgrupados).map(([cat, grupo]) => {
                const abierta = categoriasAbiertas.has(cat);
                return (
                  <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button onClick={() => toggleCategoria(cat)} className="w-full flex items-center justify-between p-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`bg-gradient-to-r ${grupo.config.color} p-1.5 rounded-lg`}>
                          <span className="text-base">{grupo.config.icono}</span>
                        </div>
                        <span className="font-bold text-gray-800">{cat}</span>
                        <span className="text-xs text-gray-400 font-medium">({grupo.productos.length})</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${abierta ? "rotate-180" : ""}`} />
                    </button>

                    {abierta && (
                      <div className="divide-y divide-gray-100 border-t border-gray-100">
                        {grupo.productos.map((p) => {
                          const cantidad = obtenerCantidad(p.id);
                          // 🆕 Si el producto tiene sabores, puede haber varias líneas
                          // en el carrito (una por combinación de sabor); sumamos el
                          // total solo para mostrar la insignia, no para el stepper.
                          const tieneSabores = (saboresPorProducto[p.id]?.length ?? 0) > 0;
                          const cantidadTotalConSabores = tieneSabores
                            ? pedido.filter((i) => i.producto.id === p.id).reduce((s, i) => s + i.cantidad, 0)
                            : 0;
                          return (
                            <div key={p.id} onClick={() => abrirNotas(p)} className="flex items-center gap-3 p-4 cursor-pointer hover:bg-orange-50/50 transition">
                              {p.imagen_url ? (
                                <img
                                  src={p.imagen_url}
                                  alt={p.nombre}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setImagenAmpliada({ url: p.imagen_url!, nombre: p.nombre });
                                  }}
                                  className="w-16 h-16 rounded-xl object-cover shrink-0 cursor-zoom-in"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                                  {grupo.config.icono}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h3 className="font-semibold text-sm text-gray-800 truncate">{p.nombre}</h3>
                                  {p.destacado && (
                                    <span className="shrink-0 flex items-center gap-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                      <Flame className="w-2.5 h-2.5" /> Top
                                    </span>
                                  )}
                                </div>
                                {p.descripcion && <p className="text-xs text-gray-400 line-clamp-3 mt-0.5">{p.descripcion}</p>}
                                <p className="text-green-700 font-bold text-sm mt-1">${p.precio.toLocaleString()}</p>
                              </div>

                              {tieneSabores ? (
                                // 🆕 Producto con sabores: siempre abre el modal para elegir
                                // sabor (puede haber varias combinaciones distintas en el
                                // carrito), con una insignia mostrando el total ya agregado.
                                <button className="relative shrink-0 border-2 border-orange-500 text-orange-500 rounded-full w-8 h-8 flex items-center justify-center">
                                  <Plus className="w-4 h-4" />
                                  {cantidadTotalConSabores > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                      {cantidadTotalConSabores}
                                    </span>
                                  )}
                                </button>
                              ) : cantidad > 0 ? (
                                <div className="shrink-0 bg-orange-500 rounded-full flex items-center gap-2 px-1 py-1">
                                  <button onClick={(e) => { e.stopPropagation(); cambiarCantidad(p.id, -1); }} className="text-white p-1">
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-white font-bold text-sm w-4 text-center">{cantidad}</span>
                                  <button onClick={(e) => { e.stopPropagation(); cambiarCantidad(p.id, 1); }} className="text-white p-1">
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button className="shrink-0 border-2 border-orange-500 text-orange-500 rounded-full w-8 h-8 flex items-center justify-center">
                                  <Plus className="w-4 h-4" />
                                </button>
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
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-gray-500 text-sm">No encontramos productos</p>
            </div>
          )}
        </div>
      )}

      {paso === "checkout" && (
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <button onClick={() => setPaso("menu")} className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
            <ArrowLeft className="w-4 h-4" /> Volver al menú
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">Tu pedido</h3>
            <div className="space-y-2">
              {pedido.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-sm border-b border-gray-50 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800">{item.cantidad}x {item.producto.nombre}</p>
                    {item.sabores && item.sabores.length > 0 && (
                      <p className="text-purple-500 text-xs">🍕 {item.sabores.map((s) => s.nombre).join(" / ")}</p>
                    )}
                    {item.notas && <p className="text-orange-500 text-xs italic">• {item.notas}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">${(item.producto.precio * item.cantidad).toLocaleString()}</span>
                    <button onClick={() => eliminarItemDelCarrito(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="font-bold text-gray-800 text-sm mb-1">Datos de entrega</h3>
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1"><User className="w-3.5 h-3.5" /> Nombre</label>
              <input
                value={nombreCliente}
                onChange={(e) => {
                  // Solo letras (incluye tildes/ñ) y espacios, máx 40 caracteres
                  const limpio = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").slice(0, 40);
                  setNombreCliente(limpio);
                }}
                maxLength={40}
                placeholder="Tu nombre completo"
                className="w-full h-11 rounded-xl px-3 text-sm border border-gray-200 focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1"><Phone className="w-3.5 h-3.5" /> Teléfono</label>
              <input
                value={telefonoCliente}
                onChange={(e) => {
                  // Solo dígitos, máx 10 (celular colombiano)
                  const limpio = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setTelefonoCliente(limpio);
                }}
                inputMode="numeric"
                maxLength={10}
                placeholder="Ej: 3001234567"
                className="w-full h-11 rounded-xl px-3 text-sm border border-gray-200 focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5" /> Dirección de entrega</label>
              <input
                value={direccionCliente}
                onChange={(e) => {
                  // Letras, números, espacios y símbolos típicos de direcciones (# - , . °)
                  const limpio = e.target.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s#\-,.°]/g, "").slice(0, 100);
                  setDireccionCliente(limpio);
                }}
                maxLength={100}
                placeholder="Calle, número, barrio, referencia"
                className="w-full h-11 rounded-xl px-3 text-sm border border-gray-200 focus:ring-2 focus:ring-orange-400 outline-none"
              />
              {negocio?.zona_cobertura && (
                <p className="text-xs text-gray-400 mt-1.5 flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                  {negocio.zona_cobertura}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1"><StickyNote className="w-3.5 h-3.5" /> Nota (opcional)</label>
              <textarea value={notasPedido} onChange={(e) => setNotasPedido(e.target.value)} placeholder="Apto, torre, referencia del portón…" className="w-full rounded-xl px-3 py-2 text-sm border border-gray-200 focus:ring-2 focus:ring-orange-400 outline-none resize-none min-h-[60px]" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-800 text-sm mb-2">Método de pago</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "efectivo", label: "💵 Efectivo" },
                { v: "nequi", label: "📱 Nequi" },
                { v: "daviplata", label: "📲 Daviplata" },
                { v: "bold", label: "💳 Bold" },
              ].map((op) => (
                <button
                  key={op.v}
                  onClick={() => setMedioPago(op.v)}
                  className={`h-11 rounded-xl text-sm font-semibold border-2 transition ${
                    medioPago === op.v ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-700">${calcularSubtotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Domicilio</span>
              <span className="font-semibold text-gray-700">${valorDomicilio.toLocaleString()}</span>
            </div>  
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-orange-600 text-xl">${calcularTotal().toLocaleString()}</span>
            </div>
            

            {(negocio?.pedido_minimo ?? 0) > 0 && calcularSubtotal() < (negocio?.pedido_minimo ?? 0) && (
              <p className="text-red-500 text-xs font-medium text-center pt-1">
                Pedido mínimo: ${(negocio?.pedido_minimo ?? 0).toLocaleString()} (te faltan ${((negocio?.pedido_minimo ?? 0) - calcularSubtotal()).toLocaleString()})
              </p>
            )}
          </div>

          <button
            onClick={enviarPedido}
            disabled={
              enviando ||
              pedidoYaEnviado ||
              negocioCerradoAhora() ||
              ((negocio?.pedido_minimo ?? 0) > 0 && calcularSubtotal() < (negocio?.pedido_minimo ?? 0))
            }
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold h-13 py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-orange-500/20"
          >
            {negocioCerradoAhora() ? (
              "Negocio cerrado"
            ) : enviando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
            ) : (
              <><Send className="w-4 h-4" /> Confirmar pedido</>
            )}
          </button>
        </div>
      )}

      {paso === "menu" && totalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-3xl mx-auto">
          <button
            onClick={() => {
              if (negocioCerradoAhora()) {
                toast.error(mensajeCierre());
                return;
              }
              setPaso("checkout");
            }}
            disabled={negocioCerradoAhora()}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold h-14 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-between px-5 disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {totalItems} {totalItems === 1 ? "producto" : "productos"}
            </span>
            <span>${calcularSubtotal().toLocaleString()}</span>
          </button>
        </div>
      )}

      {linkParaCopiarManual && (
        <div
          className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4"
          onClick={() => setLinkParaCopiarManual(null)}
        >
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-2">Copia este link para compartir</h3>
            <input
              value={linkParaCopiarManual}
              readOnly
              onFocus={(e) => e.target.select()}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none mb-3"
            />
            <button
              onClick={() => setLinkParaCopiarManual(null)}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl py-2.5 text-sm font-semibold"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {imagenAmpliada && (
        <div
          className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4"
          onClick={() => setImagenAmpliada(null)}
        >
          <div className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setImagenAmpliada(null)}
                className="bg-white/90 rounded-full p-2"
              >
                <X className="w-5 h-5 text-gray-800" />
              </button>
            </div>
            <img
              src={imagenAmpliada.url}
              alt={imagenAmpliada.nombre}
              className="w-full rounded-2xl object-cover max-h-[70vh]"
            />
            <p className="text-white text-center font-semibold mt-3">{imagenAmpliada.nombre}</p>
          </div>
        </div>
      )}

      {modalNotasOpen && productoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setModalNotasOpen(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{productoSeleccionado.nombre}</h3>
            <p className="text-green-700 font-bold text-sm mb-3">${productoSeleccionado.precio.toLocaleString()}</p>

            {/* 🆕 Chips de sabores, solo si el producto tiene sabores configurados */}
            {(saboresPorProducto[productoSeleccionado.id]?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-1.5">
                  {productoSeleccionado.max_sabores === 1
                    ? "Elige tu sabor"
                    : `Elige 1 o ${productoSeleccionado.max_sabores} sabores (ej: mitad y mitad)`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {saboresPorProducto[productoSeleccionado.id].map((sabor) => {
                    const seleccionado = saboresSeleccionadosTemp.includes(sabor.id);
                    const alcanzoMaximo =
                      !seleccionado &&
                      (productoSeleccionado.max_sabores ?? 0) > 1 &&
                      saboresSeleccionadosTemp.length >= (productoSeleccionado.max_sabores ?? 0);
                    return (
                      <button
                        key={sabor.id}
                        type="button"
                        onClick={() => toggleSaborTemp(sabor.id)}
                        disabled={alcanzoMaximo}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition ${
                          seleccionado
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : alcanzoMaximo
                            ? "border-gray-100 text-gray-300 cursor-not-allowed"
                            : "border-gray-200 text-gray-600"
                        }`}
                      >
                        {sabor.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 bg-gray-100 rounded-xl p-3 mb-3">
              <button onClick={() => setCantidadTemp(Math.max(1, cantidadTemp - 1))} className="p-1"><Minus className="w-4 h-4" /></button>
              <span className="text-xl font-bold w-8 text-center">{cantidadTemp}</span>
              <button onClick={() => setCantidadTemp(cantidadTemp + 1)} className="p-1"><Plus className="w-4 h-4" /></button>
            </div>
            <textarea value={notasTemp} onChange={(e) => setNotasTemp(e.target.value)} placeholder="Ej: sin cebolla, término medio…" className="w-full border border-gray-200 rounded-xl p-2 text-sm resize-none min-h-[70px] mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setModalNotasOpen(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium">Cancelar</button>
              <button onClick={confirmarProducto} className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl py-2.5 text-sm font-semibold">Agregar</button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-center" richColors />
    </div>
  );
}