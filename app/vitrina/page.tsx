"use client";

/**
 * app/vitrina/page.tsx
 *
 * Pantalla para el rol "vitrina": una tablet en el mostrador para tomar
 * pedidos para llevar muy rápido (porciones, pizzas, bebidas).
 *
 * - Categorías en el orden de `categorias.orden` (la primera queda activa).
 *   Con "Editar orden" se pueden mover; ese orden se guarda en la tablet
 *   (localStorage), sin cambiar el menú de domicilios ni el del mesero.
 * - Filtro "Ordenar" para los productos: como el menú, precio ↑/↓ o nombre.
 * - Productos con sabores/porciones abren un modal grande de chips (misma
 *   lógica que la página pública del slug). Los demás se agregan con un toque.
 * - La cesta junta las líneas con la misma combinación (producto + sabores +
 *   porciones + nota).
 * - El pedido se crea igual que en /mesero/menumesero: estado 'vendido' y el
 *   número consecutivo lo pone la base de datos. Se usa la mesa del negocio
 *   cuyo nombre contiene "vitrina" (ej: "Vitrina (para llevar)").
 * - Interruptor "Imprimir ticket": se guarda en pedidos.imprimir. La página de
 *   Pedidos del admin no manda a la impresora los que lleguen en false.
 */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast, Toaster } from "sonner";
import {
  Check, Loader2, LogOut, Minus, Plus, ShoppingBag, X, ChefHat,
  Pencil, ChevronLeft, ChevronRight, ArrowUpDown, StickyNote,
} from "lucide-react";

interface Categoria {
  id: string;
  nombre: string;
  icono: string | null; // 🆕 el mismo ícono que se elige en /admin/menu
  orden: number;
}

interface Sabor {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria_id: string;
  orden: number;
  max_sabores: number;
  porciones_min: number | null;
  porciones_max: number | null;
}

interface ItemCesta {
  key: string;
  producto: Producto;
  cantidad: number;
  sabores: Sabor[];
  porciones: number | null;
  nota: string;
}

const MEDIOS_PAGO = [
  { v: "efectivo", label: "Efectivo" },
  { v: "nequi", label: "Nequi" },
  { v: "daviplata", label: "Daviplata" },
  { v: "bold", label: "Bold" },
];

// 🆕 Orden de productos dentro de una categoría
type OrdenProductos = "menu" | "precio_asc" | "precio_desc" | "nombre";

const OPCIONES_ORDEN: { v: OrdenProductos; label: string }[] = [
  { v: "menu", label: "Como el menú" },
  { v: "precio_asc", label: "Precio ↑" },
  { v: "precio_desc", label: "Precio ↓" },
  { v: "nombre", label: "Nombre A-Z" },
];

// 🆕 Preferencias guardadas en ESTA tablet (localStorage). No tocan la base
// de datos, así no cambian el orden del menú de domicilios ni del mesero.
const leerPreferencia = <T,>(clave: string): T | null => {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};

const guardarPreferencia = (clave: string, valor: unknown) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento disponible: el cambio dura hasta recargar
  }
};

const pesos = (n: number) => "$" + Number(n).toLocaleString("es-CO");

const opcionesPorciones = (min: number, max: number) => {
  const r: number[] = [];
  for (let n = min; n <= max; n += 2) r.push(n);
  return r;
};

export default function VitrinaPage() {
  // ---------- Datos ----------
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [nombreNegocio, setNombreNegocio] = useState("DishHub");
  const [nombreSede, setNombreSede] = useState<string | null>(null);
  const [logoNegocio, setLogoNegocio] = useState<string | null>(null);
  const [mesaVitrinaId, setMesaVitrinaId] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [saboresPorProducto, setSaboresPorProducto] = useState<Record<string, Sabor[]>>({});

  // ---------- UI ----------
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [cesta, setCesta] = useState<ItemCesta[]>([]);
  const [medioPago, setMedioPago] = useState("efectivo");
  const [imprimir, setImprimir] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cestaAbierta, setCestaAbierta] = useState(false); // 🆕 hoja de la cesta en celular

  // 🆕 Edición del orden de categorías y orden de productos
  const [editandoCategorias, setEditandoCategorias] = useState(false);
  const [ordenProductos, setOrdenProductos] = useState<OrdenProductos>("menu");

  // 🆕 Nota sobre una línea de la cesta (ej: "sin cebolla")
  const [notaItemKey, setNotaItemKey] = useState<string | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [notaCantidad, setNotaCantidad] = useState(1);

  // ---------- Modal ----------
  const [prodModal, setProdModal] = useState<Producto | null>(null);
  const [saboresSel, setSaboresSel] = useState<string[]>([]);
  const [porcionesSel, setPorcionesSel] = useState<number | null>(null);
  const [cantidadModal, setCantidadModal] = useState(1);
  const [notaModal, setNotaModal] = useState("");
  const [errorModal, setErrorModal] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  // 🆕 Nombre de la pestaña del navegador (antes decía "Create Next App")
  useEffect(() => {
    document.title = `${nombreNegocio} - Vitrina`;
  }, [nombreNegocio]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setErrorCarga(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorCarga("Sesión no iniciada");
        return;
      }

      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id, negocio_id")
        .eq("auth_user_id", user.id)
        .single();

      if (usuarioError || !usuarioData) {
        setErrorCarga("Usuario no encontrado en el sistema");
        return;
      }
      setUsuarioId(usuarioData.id);
      setNegocioId(usuarioData.negocio_id);
      const negId = usuarioData.negocio_id;

      const { data: negocioData } = await supabase
        .from("negocios")
        .select("nombre, logo_url, nombre_sede")
        .eq("id", negId)
        .single();

      if (negocioData) {
        setNombreNegocio(negocioData.nombre);
        setLogoNegocio(negocioData.logo_url);
        setNombreSede(negocioData.nombre_sede);
      }

      const { data: mesaData } = await supabase
        .from("mesas")
        .select("id")
        .eq("negocio_id", negId)
        .eq("activo", true)
        .ilike("numero", "%llevar%")
        .limit(1)
        .maybeSingle();

      if (!mesaData) {
        setErrorCarga('Este negocio no tiene una mesa "Para Llevar". Créala en Mesas para usar la vitrina.');
        return;
      }
      setMesaVitrinaId(mesaData.id);

      const { data: categoriasData, error: errorCat } = await supabase
        .from("categorias")
        .select("id, nombre, icono, orden")
        .eq("negocio_id", negId)
        .eq("activo", true)
        .order("orden", { ascending: true });
      if (errorCat) throw errorCat;

      const { data: productosData, error: errorProd } = await supabase
        .from("productos")
        .select("id, nombre, precio, categoria_id, orden, max_sabores, porciones_min, porciones_max")
        .eq("negocio_id", negId)
        .eq("activo", true)
        .order("orden", { ascending: true });
      if (errorProd) throw errorProd;

      const lista = (productosData as Producto[]) ?? [];

      const idsConSabores = lista.filter((p) => (p.max_sabores ?? 0) > 0).map((p) => p.id);
      const mapa: Record<string, Sabor[]> = {};
      if (idsConSabores.length > 0) {
        const { data: relaciones } = await supabase
          .from("producto_sabores")
          .select("producto_id, sabores ( id, nombre, activo, orden )")
          .in("producto_id", idsConSabores);

        (relaciones as any[] ?? []).forEach((r) => {
          if (!r.sabores || r.sabores.activo === false) return;
          if (!mapa[r.producto_id]) mapa[r.producto_id] = [];
          mapa[r.producto_id].push(r.sabores);
        });
        Object.values(mapa).forEach((arr) =>
          arr.sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre))
        );
      }

      // Solo categorías que tengan al menos un producto
      const conProductos = ((categoriasData as Categoria[]) ?? []).filter((c) =>
        lista.some((p) => p.categoria_id === c.id)
      );

      // 🆕 Aplicar el orden de categorías guardado en esta tablet. Las
      // categorías nuevas (que no estaban guardadas) quedan al final,
      // en el orden del menú.
      const ordenGuardado = leerPreferencia<string[]>(`vitrina-orden-categorias-${negId}`) ?? [];
      const posicion = (id: string) => {
        const i = ordenGuardado.indexOf(id);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      };
      const categoriasOrdenadas = conProductos
        .map((c, i) => ({ c, i }))
        .sort((a, b) => posicion(a.c.id) - posicion(b.c.id) || a.i - b.i)
        .map((x) => x.c);

      const ordenProdGuardado = leerPreferencia<OrdenProductos>(`vitrina-orden-productos-${negId}`);
      if (ordenProdGuardado && OPCIONES_ORDEN.some((o) => o.v === ordenProdGuardado)) {
        setOrdenProductos(ordenProdGuardado);
      }

      setProductos(lista);
      setSaboresPorProducto(mapa);
      setCategorias(categoriasOrdenadas);
      setCategoriaActiva(categoriasOrdenadas[0]?.id ?? null);
    } catch (err) {
      console.error("Error cargando vitrina:", err);
      setErrorCarga("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Derivados ----------
  const productosCategoria = useMemo(() => {
    const lista = productos.filter((p) => p.categoria_id === categoriaActiva);
    switch (ordenProductos) {
      case "precio_asc":
        return [...lista].sort((a, b) => a.precio - b.precio || a.nombre.localeCompare(b.nombre));
      case "precio_desc":
        return [...lista].sort((a, b) => b.precio - a.precio || a.nombre.localeCompare(b.nombre));
      case "nombre":
        return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      default:
        return lista; // ya viene ordenada por productos.orden
    }
  }, [productos, categoriaActiva, ordenProductos]);

  // 🆕 Mover una categoría a la izquierda (-1) o derecha (+1) y guardarlo
  const moverCategoria = (id: string, direccion: -1 | 1) => {
    setCategorias((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = i + direccion;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const nueva = [...prev];
      [nueva[i], nueva[j]] = [nueva[j], nueva[i]];
      if (negocioId) guardarPreferencia(`vitrina-orden-categorias-${negocioId}`, nueva.map((c) => c.id));
      return nueva;
    });
  };

  const cambiarOrdenProductos = (v: OrdenProductos) => {
    setOrdenProductos(v);
    if (negocioId) guardarPreferencia(`vitrina-orden-productos-${negocioId}`, v);
  };

  const tieneSabores = (p: Producto) => (saboresPorProducto[p.id]?.length ?? 0) > 0;
  const tienePorciones = (p: Producto) => p.porciones_min != null && p.porciones_max != null;

  const etiqueta = (p: Producto) => {
    const partes: string[] = [];
    if (tieneSabores(p)) partes.push(p.max_sabores === 1 ? "1 sabor" : `${p.max_sabores} sabores`);
    if (tienePorciones(p)) partes.push("porciones");
    return partes.length ? partes.join(" · ") : null;
  };

  const unidades = cesta.reduce((s, i) => s + i.cantidad, 0);
  const total = cesta.reduce((s, i) => s + i.producto.precio * i.cantidad, 0);

  // ---------- Cesta ----------
  const claveItem = (producto: Producto, sabores: Sabor[], porciones: number | null, nota: string) =>
    [producto.id, sabores.map((s) => s.id).sort().join("|"), porciones ?? "", nota.trim()].join("#");

  const agregarACesta = (
    producto: Producto,
    cantidad: number,
    sabores: Sabor[],
    porciones: number | null,
    nota: string
  ) => {
    const key = claveItem(producto, sabores, porciones, nota);

    setCesta((prev) => {
      const existe = prev.find((i) => i.key === key);
      if (existe) {
        return prev.map((i) => (i.key === key ? { ...i, cantidad: i.cantidad + cantidad } : i));
      }
      return [...prev, { key, producto, cantidad, sabores, porciones, nota: nota.trim() }];
    });
  };

  const cambiarCantidad = (key: string, delta: number) => {
    setCesta((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    );
  };

  const quitar = (key: string) => setCesta((prev) => prev.filter((i) => i.key !== key));

  // 🆕 Abrir la nota de una línea de la cesta
  const abrirNotaItem = (it: ItemCesta) => {
    setNotaItemKey(it.key);
    setNotaTexto(it.nota);
    setNotaCantidad(it.cantidad); // por defecto, a todas las unidades de la línea
  };

  const itemNota = cesta.find((i) => i.key === notaItemKey) ?? null;

  // 🆕 Guardar la nota. Si se aplica solo a algunas unidades (ej: 1 de 3
  // hamburguesas "sin cebolla"), la línea se divide en dos. Si el resultado
  // coincide con otra línea igual, se juntan.
  const guardarNotaItem = () => {
    if (!itemNota) return;
    const it = itemNota;
    const nota = notaTexto.trim();
    const cant = Math.min(Math.max(1, notaCantidad), it.cantidad);
    const nuevaKey = claveItem(it.producto, it.sabores, it.porciones, nota);

    setCesta((prev) => {
      // 1. Quitar de la línea original las unidades que cambian de nota
      let lista = prev
        .map((i) => (i.key === it.key ? { ...i, cantidad: i.cantidad - cant } : i))
        .filter((i) => i.cantidad > 0);

      // 2. Sumarlas a la línea con la nota nueva (o crearla)
      const destino = lista.find((i) => i.key === nuevaKey);
      if (destino) {
        lista = lista.map((i) => (i.key === nuevaKey ? { ...i, cantidad: i.cantidad + cant } : i));
      } else {
        const nueva: ItemCesta = { ...it, key: nuevaKey, nota, cantidad: cant };
        // Queda justo donde estaba la original para no "saltar" en la lista
        const pos = prev.findIndex((i) => i.key === it.key);
        lista.splice(Math.min(pos + (cant < it.cantidad ? 1 : 0), lista.length), 0, nueva);
      }
      return lista;
    });

    setNotaItemKey(null);
  };

  const tocarProducto = (p: Producto) => {
    if (tieneSabores(p) || tienePorciones(p)) {
      setProdModal(p);
      setSaboresSel([]);
      setPorcionesSel(null);
      setCantidadModal(1);
      setNotaModal("");
      setErrorModal("");
    } else {
      agregarACesta(p, 1, [], null, "");
    }
  };

  // ---------- Modal ----------
  const toggleSabor = (id: string) => {
    if (!prodModal) return;
    const max = prodModal.max_sabores ?? 1;
    setErrorModal("");
    setSaboresSel((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (max === 1) return [id];
      if (prev.length >= max) return prev;
      return [...prev, id];
    });
  };

  const confirmarModal = () => {
    if (!prodModal) return;
    if (tieneSabores(prodModal) && saboresSel.length === 0) {
      setErrorModal("Elige al menos un sabor");
      return;
    }
    if (tienePorciones(prodModal) && porcionesSel === null) {
      setErrorModal("Elige en cuántas porciones cortarla");
      return;
    }
    const disponibles = saboresPorProducto[prodModal.id] ?? [];
    const elegidos = saboresSel
      .map((id) => disponibles.find((s) => s.id === id))
      .filter(Boolean) as Sabor[];

    agregarACesta(prodModal, cantidadModal, elegidos, tienePorciones(prodModal) ? porcionesSel : null, notaModal);
    setProdModal(null);
  };

  // ---------- Enviar pedido ----------
  const confirmarPedido = async () => {
    if (enviando || cesta.length === 0 || !negocioId || !mesaVitrinaId || !usuarioId) return;

    setEnviando(true);

    try {
      // Pedido + productos + sabores en una sola transacción (función crear_pedido_vitrina).
      // Así la página de Pedidos solo se entera cuando todo ya está guardado.
      const items = cesta.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        notas: item.nota || null,
        porciones_elegidas: item.porciones,
        sabor_ids: item.sabores.map((s) => s.id),
      }));

      const { data: pedidoData, error: errorPedido } = await supabase.rpc("crear_pedido_vitrina", {
        p_mesa_id: mesaVitrinaId,
        p_medio_pago: medioPago,
        p_imprimir: imprimir,
        p_items: items,
      });

      if (errorPedido || !pedidoData) throw errorPedido ?? new Error("No se pudo crear el pedido");

      const numero = pedidoData.numero_pedido ?? pedidoData.id.slice(-6).toUpperCase();
      const pagoTxt = MEDIOS_PAGO.find((m) => m.v === medioPago)?.label ?? medioPago;

      toast.success(`Pedido #${numero} enviado a Pedidos`, {
        description: `${pesos(total)} · ${pagoTxt} · ${imprimir ? "se imprime ticket" : "sin imprimir"}`,
        duration: 3000,
      });

      // Listo para el siguiente cliente
      setCesta([]);
      setMedioPago("efectivo");
      setImprimir(false);
      setCategoriaActiva(categorias[0]?.id ?? null);
      setCestaAbierta(false);
    } catch (err: any) {
      console.error("Error enviando pedido de vitrina:", err);
      // Si algo falla, la función no guarda nada (ni pedido ni productos)
      toast.error("No se pudo enviar el pedido", { description: err?.message || "Intenta de nuevo" });
    } finally {
      setEnviando(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    document.cookie = "sb-access-token=; path=/; max-age=0";
    document.cookie = "user-role=; path=/; max-age=0";
    window.location.href = "/login";
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-zinc-200 text-lg max-w-md">{errorCarga}</p>
        <button onClick={cerrarSesion} className="h-12 px-6 rounded-xl border border-zinc-700 text-zinc-300">
          Cerrar sesión
        </button>
      </div>
    );
  }

  const disponiblesModal = prodModal ? saboresPorProducto[prodModal.id] ?? [] : [];
  const maxModal = prodModal?.max_sabores ?? 1;

  // 🆕 Contenido de la cesta (lista + pie). Se usa en el panel lateral
  // (tablet/PC) y en la hoja que sube desde abajo (celular).
  const contenidoCesta = (
    <>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 min-h-[100px]">
            {cesta.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-500 py-4">
                <ShoppingBag className="w-8 h-8" />
                <span className="text-zinc-400">La cesta está vacía</span>
              </div>
            )}
            {cesta.map((it) => (
              <div key={it.key} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                  <button
                    onClick={() => cambiarCantidad(it.key, -1)}
                    aria-label="Restar uno"
                    className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-7 text-center text-lg font-extrabold">{it.cantidad}</span>
                  <button
                    onClick={() => cambiarCantidad(it.key, 1)}
                    aria-label="Sumar uno"
                    className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold leading-tight">{it.producto.nombre}</p>
                  {it.sabores.length > 0 && (
                    <p className="text-sm text-purple-300">{it.sabores.map((s) => s.nombre).join(" / ")}</p>
                  )}
                  {it.porciones && <p className="text-sm text-orange-300">Cortar en {it.porciones} porciones</p>}
                  {it.nota && <p className="text-sm text-zinc-400 italic">• {it.nota}</p>}
                  <p className="text-sm font-semibold text-green-400">{pesos(it.producto.precio * it.cantidad)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => abrirNotaItem(it)}
                    aria-label={it.nota ? "Editar nota" : "Agregar nota"}
                    className={`w-11 h-11 rounded-lg flex items-center justify-center border ${
                      it.nota
                        ? "border-orange-500 bg-orange-950/60 text-orange-300"
                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    <StickyNote className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => quitar(it.key)}
                    aria-label="Quitar de la cesta"
                    className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-zinc-800"
                  >
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 🆕 Pie de la cesta más compacto: siempre visible sin bajar */}
          <div className="p-4 border-t border-zinc-800 space-y-2.5 shrink-0">
            <div className="grid grid-cols-4 gap-2">
              {MEDIOS_PAGO.map((m) => {
                const on = medioPago === m.v;
                return (
                  <button
                    key={m.v}
                    onClick={() => setMedioPago(m.v)}
                    aria-pressed={on}
                    className={`h-11 rounded-xl text-sm font-semibold ${
                      on
                        ? "bg-orange-950/60 text-orange-300 border-2 border-orange-500"
                        : "bg-zinc-900 text-zinc-300 border border-zinc-700"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 cursor-pointer">
              <span>
                <span className="block font-semibold">Imprimir ticket</span>
                <span className="block text-xs text-zinc-400">
                  {imprimir ? "Encendido: sale ticket en la impresora" : "Apagado: va directo a Pedidos como vendido"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={imprimir}
                onChange={(e) => setImprimir(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-14 h-8 shrink-0 rounded-full bg-zinc-700 p-1 flex transition peer-checked:bg-orange-500 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-300">
                <span className={`w-6 h-6 rounded-full transition ${imprimir ? "translate-x-6 bg-zinc-950" : "bg-zinc-300"}`} />
              </span>
            </label>

            {/* 🆕 Total y botón en la misma fila para ahorrar alto */}
            <div className="flex items-center gap-3">
              <div className="leading-tight shrink-0">
                <span className="block text-sm text-zinc-400">Total</span>
                <span className="block text-2xl font-extrabold text-orange-400">{pesos(total)}</span>
              </div>
              <button
                onClick={confirmarPedido}
                disabled={cesta.length === 0 || enviando}
                className="flex-1 h-14 rounded-2xl bg-orange-500 text-zinc-950 text-lg font-extrabold flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {enviando ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" strokeWidth={3} />}
                {enviando ? "Enviando..." : "Confirmar"}
              </button>
            </div>
          </div>
    </>
  );


  return (
    // 🆕 h-dvh: alto real visible en tablet (descuenta la barra del navegador),
    // así el botón "Confirmar pedido" siempre queda a la vista sin bajar.
    <div className="h-dvh flex flex-col bg-zinc-950 text-zinc-50 select-none overflow-hidden">
      {/* Header */}
      <header className="h-14 shrink-0 px-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-3">
          {logoNegocio ? (
            <img src={logoNegocio} alt={nombreNegocio} className="w-11 h-11 rounded-xl object-cover border border-zinc-700" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-orange-500" />
            </div>
          )}
          <div className="leading-tight">
            <p className="text-lg font-extrabold text-orange-400">{nombreNegocio}</p>
            <p className="text-sm text-zinc-400">{nombreSede ? `${nombreSede} · Vitrina` : "Vitrina"}</p>
          </div>
        </div>
        <button
          onClick={cerrarSesion}
          aria-label="Cerrar sesión"
          className="w-11 h-11 rounded-xl border border-zinc-700 bg-zinc-900 flex items-center justify-center hover:bg-zinc-800"
        >
          <LogOut className="w-5 h-5 text-zinc-300" />
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Productos */}
        <main className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-4 space-y-3">
          {/* 🆕 Categorías en UNA sola fila que se desliza de lado (antes ocupaban
              varias filas y empujaban los productos hacia abajo) */}
          <div className="flex items-center gap-2">
            <nav aria-label="Categorías" className="flex gap-2 flex-1 min-w-0 overflow-x-auto pb-1">
              {categorias.map((c, index) => {
                const activa = c.id === categoriaActiva;

                if (editandoCategorias) {
                  return (
                    <div
                      key={c.id}
                      className="h-12 shrink-0 flex items-center gap-1 rounded-2xl border border-dashed border-orange-500/70 bg-zinc-900 px-1 whitespace-nowrap"
                    >
                      <button
                        onClick={() => moverCategoria(c.id, -1)}
                        disabled={index === 0}
                        aria-label={`Mover ${c.nombre} a la izquierda`}
                        className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-zinc-800 disabled:opacity-25"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="px-1 text-base font-bold text-zinc-200 flex items-center gap-2">
                        {c.icono && <span aria-hidden="true" className="text-xl">{c.icono}</span>}
                        {c.nombre}
                      </span>
                      <button
                        onClick={() => moverCategoria(c.id, 1)}
                        disabled={index === categorias.length - 1}
                        aria-label={`Mover ${c.nombre} a la derecha`}
                        className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-zinc-800 disabled:opacity-25"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoriaActiva(c.id)}
                    aria-pressed={activa}
                    className={`h-12 shrink-0 whitespace-nowrap px-4 rounded-2xl text-base font-bold border transition flex items-center gap-2 ${
                      activa
                        ? "bg-orange-500 border-orange-500 text-zinc-950"
                        : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {c.icono && <span aria-hidden="true" className="text-xl leading-none">{c.icono}</span>}
                    {c.nombre}
                  </button>
                );
              })}
            </nav>

            <button
              onClick={() => setEditandoCategorias(!editandoCategorias)}
              className={`h-12 px-3 rounded-2xl border text-sm font-bold flex items-center gap-2 shrink-0 whitespace-nowrap ${
                editandoCategorias
                  ? "bg-green-600 border-green-600 text-white"
                  : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {editandoCategorias ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              {editandoCategorias ? "Listo" : "Editar orden"}
            </button>
          </div>

          {editandoCategorias && (
            <p className="text-sm text-orange-300">
              Usa las flechas para mover las categorías. El orden se guarda solo en esta tablet.
            </p>
          )}

          {/* 🆕 Orden de los productos dentro de la categoría */}
          {!editandoCategorias && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="flex items-center gap-1.5 text-sm text-zinc-400 mr-1 shrink-0">
                <ArrowUpDown className="w-4 h-4" /> Ordenar:
              </span>
              {OPCIONES_ORDEN.map((o) => {
                const on = ordenProductos === o.v;
                return (
                  <button
                    key={o.v}
                    onClick={() => cambiarOrdenProductos(o.v)}
                    aria-pressed={on}
                    className={`h-10 px-3 shrink-0 whitespace-nowrap rounded-xl text-sm font-semibold border ${
                      on
                        ? "bg-orange-950/60 text-orange-300 border-orange-500"
                        : "bg-zinc-900 text-zinc-300 border-zinc-700"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 🆕 Tarjetas más anchas y con alto flexible: los nombres largos
              (ej. "PIZZA FAMILIAR: ESPECIALES") ya no se amontonan */}
          {/* 2 columnas en celular, más en tablet/PC */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5 sm:gap-3 pt-1">
            {productosCategoria.map((p) => {
              const et = etiqueta(p);
              const enCesta = cesta.filter((i) => i.producto.id === p.id).reduce((s, i) => s + i.cantidad, 0);
              return (
                <button
                  key={p.id}
                  onClick={() => tocarProducto(p)}
                  className={`relative min-h-[120px] p-3.5 rounded-2xl border bg-zinc-900 text-left flex flex-col justify-between gap-3 active:scale-[0.97] transition ${
                    enCesta > 0 ? "border-orange-500" : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  {enCesta > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-7 h-7 px-2 rounded-full bg-orange-500 text-zinc-950 text-sm font-extrabold flex items-center justify-center">
                      {enCesta}
                    </span>
                  )}
                  <span className="text-base font-bold leading-tight line-clamp-2 pr-2">{p.nombre}</span>
                  <span className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5">
                    {et ? (
                      <span className="text-xs leading-tight text-orange-300 bg-orange-950/60 border border-orange-900 rounded-lg px-2 py-1">
                        {et}
                      </span>
                    ) : (
                      <span className="text-xs leading-tight text-green-300 bg-green-950/60 border border-green-900 rounded-lg px-2 py-1">
                        Toque y listo
                      </span>
                    )}
                    <span className="text-base font-bold text-green-400 whitespace-nowrap">{pesos(p.precio)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </main>

        {/* Cesta lateral: solo en pantallas anchas (tablet horizontal / PC) */}
        <aside aria-label="Cesta" className="hidden lg:flex lg:w-[360px] xl:w-[400px] shrink-0 border-l border-zinc-800 bg-zinc-900/40 flex-col min-h-0">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <h2 className="text-xl font-extrabold">Cesta</h2>
            <span className="text-sm text-zinc-400">
              {unidades ? `${unidades} producto${unidades > 1 ? "s" : ""}` : "Sin productos"}
            </span>
          </div>

          {contenidoCesta}
        </aside>
      </div>

      {/* 🆕 Celular / tablet vertical: barra inferior con el total que abre la cesta */}
      <div className="lg:hidden shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center gap-3">
        <div className="leading-tight min-w-0">
          <span className="block text-xs text-zinc-400">
            {unidades ? `${unidades} producto${unidades > 1 ? "s" : ""}` : "Cesta vacía"}
          </span>
          <span className="block text-xl font-extrabold text-orange-400">{pesos(total)}</span>
        </div>
        <button
          onClick={() => setCestaAbierta(true)}
          disabled={cesta.length === 0}
          className="flex-1 h-14 rounded-2xl bg-orange-500 text-zinc-950 text-lg font-extrabold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <ShoppingBag className="w-5 h-5" />
          Ver cesta
        </button>
      </div>

      {/* 🆕 Hoja de la cesta en celular (sube desde abajo) */}
      {cestaAbierta && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 flex items-end"
          onClick={() => setCestaAbierta(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cesta"
            className="w-full max-h-[92dvh] rounded-t-3xl border-t border-zinc-700 bg-zinc-950 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-extrabold">Cesta</h2>
                <span className="text-sm text-zinc-400">
                  {unidades ? `${unidades} producto${unidades > 1 ? "s" : ""}` : "Sin productos"}
                </span>
              </div>
              <button
                onClick={() => setCestaAbierta(false)}
                aria-label="Cerrar cesta"
                className="w-12 h-12 rounded-xl border border-zinc-700 bg-zinc-900 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {contenidoCesta}
          </div>
        </div>
      )}

      {/* Modal sabores / porciones */}
      {prodModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setProdModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={prodModal.nombre}
            className="w-full max-w-2xl max-h-full overflow-y-auto rounded-3xl border border-zinc-700 bg-zinc-900 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">{prodModal.nombre}</h2>
                <p className="text-green-400 font-semibold">{pesos(prodModal.precio)}</p>
              </div>
              <button
                onClick={() => setProdModal(null)}
                aria-label="Cerrar"
                className="w-12 h-12 rounded-xl border border-zinc-700 bg-zinc-950 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {disponiblesModal.length > 0 && (
              <section className="space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold">Sabores</h3>
                  <span className="text-sm text-zinc-400">
                    {maxModal === 1 ? "Elige 1" : `Hasta ${maxModal} · ${saboresSel.length} de ${maxModal}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {disponiblesModal.map((s) => {
                    const on = saboresSel.includes(s.id);
                    const lleno = !on && maxModal > 1 && saboresSel.length >= maxModal;
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSabor(s.id)}
                        disabled={lleno}
                        aria-pressed={on}
                        className={`min-h-[60px] px-2 rounded-2xl font-bold transition ${
                          on
                            ? "bg-purple-950 text-purple-200 border-2 border-purple-500"
                            : "bg-zinc-950 text-zinc-300 border border-zinc-700"
                        } disabled:opacity-35`}
                      >
                        {s.nombre}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {tienePorciones(prodModal) && (
              <section className="space-y-2.5">
                <h3 className="font-bold">¿En cuántas porciones la cortamos?</h3>
                <div className="grid grid-cols-4 gap-2.5">
                  {opcionesPorciones(prodModal.porciones_min!, prodModal.porciones_max!).map((n) => {
                    const on = porcionesSel === n;
                    return (
                      <button
                        key={n}
                        onClick={() => { setPorcionesSel(n); setErrorModal(""); }}
                        aria-pressed={on}
                        className={`h-14 rounded-2xl text-lg font-extrabold ${
                          on
                            ? "bg-orange-950/60 text-orange-300 border-2 border-orange-500"
                            : "bg-zinc-950 text-zinc-300 border border-zinc-700"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <h3 className="font-bold">Cantidad</h3>
                <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-700 rounded-2xl p-1">
                  <button
                    onClick={() => setCantidadModal(Math.max(1, cantidadModal - 1))}
                    aria-label="Restar uno"
                    className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-10 text-center text-xl font-extrabold">{cantidadModal}</span>
                  <button
                    onClick={() => setCantidadModal(cantidadModal + 1)}
                    aria-label="Sumar uno"
                    className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <label className="flex-1 min-w-[200px] space-y-1">
                <span className="text-sm text-zinc-400">Nota (opcional)</span>
                <input
                  value={notaModal}
                  onChange={(e) => setNotaModal(e.target.value)}
                  placeholder="Ej: bien tostada"
                  className="w-full h-12 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-zinc-50 outline-none focus:border-orange-500"
                />
              </label>
            </div>

            {errorModal && <p role="alert" className="text-red-300 text-sm">{errorModal}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setProdModal(null)}
                className="flex-1 h-14 rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-300 text-lg font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarModal}
                className="flex-[2] h-14 rounded-2xl bg-orange-500 text-zinc-950 text-lg font-extrabold"
              >
                Agregar a la cesta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal de nota para una línea de la cesta (ej: hamburguesa sin cebolla) */}
      {itemNota && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setNotaItemKey(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Nota para ${itemNota.producto.nombre}`}
            className="w-full max-w-lg rounded-3xl border border-zinc-700 bg-zinc-900 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">Nota</h2>
                <p className="text-zinc-400">
                  {itemNota.cantidad}x {itemNota.producto.nombre}
                  {itemNota.sabores.length > 0 && ` · ${itemNota.sabores.map((s) => s.nombre).join(" / ")}`}
                </p>
              </div>
              <button
                onClick={() => setNotaItemKey(null)}
                aria-label="Cerrar"
                className="w-12 h-12 rounded-xl border border-zinc-700 bg-zinc-950 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block space-y-1">
              <span className="text-sm text-zinc-400">¿Qué le cambiamos?</span>
              <input
                autoFocus
                value={notaTexto}
                onChange={(e) => setNotaTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") guardarNotaItem(); }}
                placeholder="Ej: sin cebolla"
                className="w-full h-14 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-lg text-zinc-50 outline-none focus:border-orange-500"
              />
            </label>

            {/* Solo si la línea tiene varias unidades: a cuántas aplica la nota */}
            {itemNota.cantidad > 1 && (
              <div className="space-y-2">
                <span className="block text-sm text-zinc-400">¿A cuántas unidades?</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-700 rounded-2xl p-1">
                    <button
                      onClick={() => setNotaCantidad(Math.max(1, notaCantidad - 1))}
                      aria-label="Menos unidades"
                      className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="w-10 text-center text-xl font-extrabold">{notaCantidad}</span>
                    <button
                      onClick={() => setNotaCantidad(Math.min(itemNota.cantidad, notaCantidad + 1))}
                      aria-label="Más unidades"
                      className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <span className="text-sm text-zinc-400">
                    {notaCantidad === itemNota.cantidad ? "A todas" : `${notaCantidad} de ${itemNota.cantidad}`}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {itemNota.nota ? (
                <button
                  onClick={() => { setNotaTexto(""); setNotaCantidad(itemNota.cantidad); }}
                  className="flex-1 h-14 rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-300 text-lg font-bold"
                >
                  Borrar nota
                </button>
              ) : (
                <button
                  onClick={() => setNotaItemKey(null)}
                  className="flex-1 h-14 rounded-2xl border border-zinc-700 bg-zinc-950 text-zinc-300 text-lg font-bold"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={guardarNotaItem}
                className="flex-[2] h-14 rounded-2xl bg-orange-500 text-zinc-950 text-lg font-extrabold"
              >
                Guardar nota
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-center" richColors />
    </div>
  );
}