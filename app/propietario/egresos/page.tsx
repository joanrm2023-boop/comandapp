"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Banknote,
  Plus,
  History,
  Truck,
  Users,
  Loader2,
  Search,
  Ban,
  RotateCcw,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast, Toaster } from "sonner";

// ---------- Tipos ----------
type TipoGasto = "proveedor" | "colaborador" | "servicio" | "otro";

interface Proveedor {
  id: string;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  categoria: string;
  activo: boolean;
}

interface Colaborador {
  id: string;
  nombre: string;
  documento: string | null;
  telefono: string | null;
  cargo: string;
  activo: boolean;
}

interface Gasto {
  id: string;
  fecha: string; // yyyy-mm-dd
  tipo: TipoGasto;
  proveedor_id: string | null;
  colaborador_id: string | null;
  categoria: string;
  tipo_pago_colab: string | null;
  valor: number;
  medio_pago: string;
  nota: string | null;
  anulado: boolean;
  created_at: string;
}

// ---------- Catálogos ----------
// Sin categorías fijas: cada negocio crea las suyas con "＋ Agregar…"
// y quedan disponibles en adelante (salen de sus proveedores y gastos guardados).
const CATEGORIAS: string[] = [];
// Servicios públicos: tienen su propio tipo de gasto y su propia lista
const SERVICIOS = ["Luz", "Agua", "Gas", "Internet"];
const MEDIOS = ["Efectivo", "Nequi", "Daviplata", "Transferencia"];
const PAGOS_COLAB = ["Sueldo", "Adelanto", "Bonificación", "Turno extra"];
const CARGOS = ["Cocinero", "Pizzero", "Mesero", "Domiciliario", "Cajero", "Ayudante", "Otro"];
const TIPO_TXT: Record<TipoGasto, string> = {
  proveedor: "Proveedor",
  colaborador: "Colaborador",
  servicio: "Servicios públicos",
  otro: "Otro gasto",
};
const TIPO_CLS: Record<TipoGasto, string> = {
  proveedor: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  colaborador: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  servicio: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  otro: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100",
};

// ---------- Utilidades de fecha (hora local) ----------
const iso = (d: Date) => {
  const z = new Date(d);
  z.setMinutes(z.getMinutes() - z.getTimezoneOffset());
  return z.toISOString().slice(0, 10);
};
const hoy = () => iso(new Date());
const haceDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};
const inicioMes = () => {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth(), 1));
};
const fechaBonita = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" });
};
// Límites del día en hora local, para filtrar pedidos por created_at
const inicioDelDia = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const finDelDia = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
};
const pesos = (n: number) => "$" + Math.round(Number(n) || 0).toLocaleString("es-CO");

// Supabase devuelve máximo 1000 filas por consulta: se trae por páginas
async function traerTodo<T>(armarConsulta: (desde: number, hasta: number) => PromiseLike<{ data: any; error: any }>): Promise<T[]> {
  const TAM = 1000;
  let desde = 0;
  const todo: T[] = [];
  while (true) {
    const { data, error } = await armarConsulta(desde, desde + TAM - 1);
    if (error) throw error;
    todo.push(...((data || []) as T[]));
    if (!data || data.length < TAM) break;
    desde += TAM;
  }
  return todo;
}

// Botón tipo "chip" para elegir una opción
function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
        activo
          ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent shadow-md shadow-orange-500/30"
          : "bg-white text-zinc-700 border-zinc-200 hover:border-orange-300 hover:bg-orange-50"
      }`}
    >
      {children}
    </button>
  );
}

const claseCampo =
  "w-full h-11 px-3 border-2 border-zinc-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500";

// "masa congelada" -> "Masa congelada", sin espacios de más
const normalizarOpcion = (t: string) => {
  const limpio = t.trim().replace(/\s+/g, " ");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
};

// Une las opciones fijas con las que el negocio ya ha usado, sin repetir (ignora mayúsculas)
const unirOpciones = (base: string[], extra: (string | null | undefined)[]) => {
  const vistos = new Set(base.map((o) => o.toLowerCase()));
  const nuevas: string[] = [];
  extra.forEach((o) => {
    if (o && !vistos.has(o.toLowerCase())) {
      vistos.add(o.toLowerCase());
      nuevas.push(o);
    }
  });
  return [...base, ...nuevas.sort((a, b) => a.localeCompare(b, "es"))];
};

const VALOR_NUEVA = "__nueva__";

// Lista desplegable con la opción "+ Agregar otra…" al final.
// Al elegirla aparece un campo para escribir la nueva opción; queda elegida y se suma a la lista.
function SelectConOtro({
  valor,
  opciones,
  onCambiar,
  onNuevaOpcion,
  textoNueva,
  textoElegir = "Elegir…",
}: {
  valor: string;
  opciones: string[];
  onCambiar: (v: string) => void;
  onNuevaOpcion: (v: string) => void;
  textoNueva: string;
  textoElegir?: string;
}) {
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");

  const confirmar = () => {
    const nueva = normalizarOpcion(texto);
    if (!nueva) {
      setError("Escribe un nombre");
      return;
    }
    // Si ya existe (aunque cambien mayúsculas), se usa la existente
    const existente = opciones.find((o) => o.toLowerCase() === nueva.toLowerCase());
    if (existente) onCambiar(existente);
    else {
      onNuevaOpcion(nueva);
      onCambiar(nueva);
    }
    setTexto("");
    setError("");
    setEscribiendo(false);
  };

  if (escribiendo) {
    return (
      <div>
        <div className="flex gap-2">
          <input
            autoFocus
            value={texto}
            maxLength={50}
            placeholder={textoNueva}
            onChange={(e) => {
              setTexto(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmar();
              }
              if (e.key === "Escape") setEscribiendo(false);
            }}
            className={claseCampo}
          />
          <Button type="button" onClick={confirmar} className="h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            Usar
          </Button>
        </div>
        {error && <p className="text-xs font-semibold text-red-600 mt-1">{error}</p>}
        <button type="button" onClick={() => setEscribiendo(false)} className="text-xs text-zinc-500 hover:text-orange-600 mt-1">
          Volver a la lista
        </button>
      </div>
    );
  }

  return (
    <select
      value={opciones.includes(valor) ? valor : ""}
      onChange={(e) => {
        if (e.target.value === VALOR_NUEVA) setEscribiendo(true);
        else onCambiar(e.target.value);
      }}
      className={claseCampo}
    >
      {!opciones.includes(valor) && (
        <option value="" disabled>
          {opciones.length === 0 ? "Aún no hay opciones: agrega la primera" : textoElegir}
        </option>
      )}
      {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value={VALOR_NUEVA}>＋ Agregar {opciones.length === 0 ? "" : "otra"}…</option>
    </select>
  );
}

export default function EgresosPage() {
  // ---------- Sesión ----------
  const [cargando, setCargando] = useState(true);
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  // ---------- Datos ----------
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  // Categorías y cargos nuevos que el negocio ha creado (salen de lo ya guardado + lo creado ahora)
  const [categoriasUsadas, setCategoriasUsadas] = useState<string[]>([]);
  const [cargosNuevos, setCargosNuevos] = useState<string[]>([]);
  const [serviciosUsados, setServiciosUsados] = useState<string[]>([]);
  const [escribiendoServicio, setEscribiendoServicio] = useState(false);
  const [nuevoServicio, setNuevoServicio] = useState("");
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  // ---------- Resumen ----------
  const [periodo, setPeriodo] = useState<"hoy" | "semana" | "mes">("mes");
  const [resumen, setResumen] = useState({ ventas: 0, egresos: 0, registros: 0, cajaHoy: 0 });
  const [cargandoResumen, setCargandoResumen] = useState(false);

  // ---------- Pestañas ----------
  const [pestana, setPestana] = useState<"registrar" | "historial" | "proveedores" | "colaboradores">("registrar");

  // ---------- Formulario de gasto ----------
  const [fFecha, setFFecha] = useState(hoy());
  const [fTipo, setFTipo] = useState<TipoGasto>("proveedor");
  const [fPersona, setFPersona] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fPagoColab, setFPagoColab] = useState("Sueldo");
  const [fValor, setFValor] = useState("");
  const [fMedio, setFMedio] = useState("Efectivo");
  const [fNota, setFNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [gastosDelDia, setGastosDelDia] = useState<Gasto[]>([]);

  // ---------- Historial ----------
  const [hDesde, setHDesde] = useState(inicioMes());
  const [hHasta, setHHasta] = useState(hoy());
  const [hTipo, setHTipo] = useState<"todos" | TipoGasto>("todos");
  const [hBuscar, setHBuscar] = useState("");
  const [historial, setHistorial] = useState<Gasto[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [confirmarAnular, setConfirmarAnular] = useState<string | null>(null);

  // ---------- Proveedores / colaboradores ----------
  const [verInactivosProv, setVerInactivosProv] = useState(false);
  const [verInactivosColab, setVerInactivosColab] = useState(false);
  const [nuevoProv, setNuevoProv] = useState({ nombre: "", nit: "", telefono: "", categoria: "" });
  const [nuevoColab, setNuevoColab] = useState({ nombre: "", documento: "", telefono: "", cargo: "Cocinero" });
  const [guardandoPersona, setGuardandoPersona] = useState(false);

  // ---------- Carga inicial ----------
  useEffect(() => {
    const iniciar = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: usuarioData } = await supabase
          .from("usuarios")
          .select("id, negocio_id")
          .eq("auth_user_id", user.id)
          .single();
        if (!usuarioData) return;
        setUsuarioId(usuarioData.id);
        setNegocioId(usuarioData.negocio_id);
        await cargarPersonas(usuarioData.negocio_id);
      } catch (error) {
        console.error("Error iniciando Egresos:", error);
        toast.error("No se pudo cargar la página de egresos");
      } finally {
        setCargando(false);
      }
    };
    iniciar();
  }, []);

  useEffect(() => {
    if (negocioId) cargarResumen();
  }, [negocioId, periodo]);

  useEffect(() => {
    if (negocioId) cargarGastosDelDia();
  }, [negocioId, fFecha]);

  useEffect(() => {
    if (negocioId && pestana === "historial") cargarHistorial();
  }, [negocioId, pestana, hDesde, hHasta]);

  const cargarPersonas = async (negId: string) => {
    const [{ data: provs }, { data: colabs }] = await Promise.all([
      supabase.from("proveedores").select("*").eq("negocio_id", negId).order("nombre"),
      supabase.from("colaboradores").select("*").eq("negocio_id", negId).order("nombre"),
    ]);
    setProveedores((provs as Proveedor[]) || []);
    setColaboradores((colabs as Colaborador[]) || []);

    // Categorías que ya se han usado en gastos (incluye las personalizadas)
    try {
      const usadas = await traerTodo<{ categoria: string; tipo: TipoGasto }>((a, b) =>
        supabase.from("gastos").select("categoria, tipo").eq("negocio_id", negId).range(a, b)
      );
      setCategoriasUsadas(usadas.filter((u) => u.tipo !== "servicio").map((u) => u.categoria));
      setServiciosUsados(usadas.filter((u) => u.tipo === "servicio").map((u) => u.categoria));
    } catch (error) {
      console.error("Error cargando categorías:", error);
    }
  };

  const rangoPeriodo = (): [string, string] => {
    if (periodo === "hoy") return [hoy(), hoy()];
    if (periodo === "semana") return [haceDias(6), hoy()];
    return [inicioMes(), hoy()];
  };

  const cargarResumen = async () => {
    if (!negocioId) return;
    try {
      setCargandoResumen(true);
      const [desde, hasta] = rangoPeriodo();

      // Ventas: pedidos vendidos del período (misma regla que la página de Ventas)
      const pedidos = await traerTodo<{ total: number; medio_pago: string; created_at: string }>((a, b) =>
        supabase
          .from("pedidos")
          .select("total, medio_pago, created_at")
          .eq("negocio_id", negocioId)
          .eq("estado", "vendido")
          .gte("created_at", inicioDelDia(desde).toISOString())
          .lte("created_at", finDelDia(hasta).toISOString())
          .order("created_at")
          .range(a, b)
      );

      const gastos = await traerTodo<Gasto>((a, b) =>
        supabase
          .from("gastos")
          .select("*")
          .eq("negocio_id", negocioId)
          .eq("anulado", false)
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("fecha")
          .range(a, b)
      );

      const ventas = pedidos.reduce((s, p) => s + Number(p.total), 0);
      const egresos = gastos.reduce((s, g) => s + Number(g.valor), 0);

      // Efectivo en caja HOY = ventas en efectivo de hoy − gastos en efectivo de hoy
      const inicioHoy = inicioDelDia(hoy()).getTime();
      const ventasEfectivoHoy = pedidos
        .filter((p) => p.medio_pago === "efectivo" && new Date(p.created_at).getTime() >= inicioHoy)
        .reduce((s, p) => s + Number(p.total), 0);
      const gastosEfectivoHoy = gastos
        .filter((g) => g.fecha === hoy() && g.medio_pago === "Efectivo")
        .reduce((s, g) => s + Number(g.valor), 0);

      setResumen({ ventas, egresos, registros: gastos.length, cajaHoy: ventasEfectivoHoy - gastosEfectivoHoy });
    } catch (error) {
      console.error("Error cargando resumen:", error);
    } finally {
      setCargandoResumen(false);
    }
  };

  const cargarGastosDelDia = async () => {
    if (!negocioId) return;
    const { data } = await supabase
      .from("gastos")
      .select("*")
      .eq("negocio_id", negocioId)
      .eq("fecha", fFecha)
      .order("created_at", { ascending: false });
    setGastosDelDia((data as Gasto[]) || []);
  };

  const cargarHistorial = async () => {
    if (!negocioId) return;
    try {
      setCargandoHistorial(true);
      const datos = await traerTodo<Gasto>((a, b) =>
        supabase
          .from("gastos")
          .select("*")
          .eq("negocio_id", negocioId)
          .gte("fecha", hDesde)
          .lte("fecha", hHasta)
          .order("fecha", { ascending: false })
          .order("created_at", { ascending: false })
          .range(a, b)
      );
      setHistorial(datos);
    } catch (error) {
      console.error("Error cargando historial:", error);
      toast.error("No se pudo cargar el historial");
    } finally {
      setCargandoHistorial(false);
    }
  };

  // ---------- Helpers de nombres ----------
  const nombrePersona = (g: Gasto) => {
    if (g.tipo === "proveedor") return proveedores.find((p) => p.id === g.proveedor_id)?.nombre ?? "—";
    if (g.tipo === "colaborador") return colaboradores.find((c) => c.id === g.colaborador_id)?.nombre ?? "—";
    if (g.tipo === "servicio") return g.categoria;
    return "—";
  };

  // ---------- Formulario ----------
  const cambiarTipo = (t: TipoGasto) => {
    setFTipo(t);
    setFPersona("");
    setErrorForm("");
    setEscribiendoServicio(false);
    if (t === "colaborador") setFCategoria("Nómina");
    else if (t === "servicio") setFCategoria("Luz");
    else setFCategoria(""); // proveedor: la toma del proveedor elegido · otro: la elige el usuario
  };

  const elegirPersona = (id: string) => {
    setFPersona(id);
    setErrorForm("");
    if (fTipo === "proveedor") {
      const prov = proveedores.find((p) => p.id === id);
      if (prov) setFCategoria(prov.categoria);
    }
  };

  const guardarGasto = async () => {
    const valor = Number(fValor.replace(/\D/g, ""));
    if ((fTipo === "proveedor" || fTipo === "colaborador") && !fPersona) {
      setErrorForm(fTipo === "proveedor" ? "Elige el proveedor" : "Elige el colaborador");
      return;
    }
    if (!fCategoria) {
      setErrorForm(fTipo === "servicio" ? "Elige el servicio" : "Elige o agrega la categoría");
      return;
    }
    if (!valor || valor <= 0) {
      setErrorForm("Escribe el valor pagado");
      return;
    }
    if (!fFecha) {
      setErrorForm("Elige la fecha del pago");
      return;
    }
    if (!negocioId) return;

    try {
      setGuardando(true);
      const { error } = await supabase.from("gastos").insert({
        negocio_id: negocioId,
        fecha: fFecha,
        tipo: fTipo,
        proveedor_id: fTipo === "proveedor" ? fPersona : null,
        colaborador_id: fTipo === "colaborador" ? fPersona : null,
        categoria: fCategoria,
        tipo_pago_colab: fTipo === "colaborador" ? fPagoColab : null,
        valor,
        medio_pago: fMedio,
        nota: fNota.trim() || null,
        creado_por: usuarioId,
      });
      if (error) throw error;

      toast.success(`Gasto de ${pesos(valor)} registrado`);
      if (fTipo === "servicio") setServiciosUsados((prev) => [...prev, fCategoria]);
      else setCategoriasUsadas((prev) => [...prev, fCategoria]);
      // Se conservan fecha y tipo para registrar varios seguidos
      setFValor("");
      setFNota("");
      setFPersona("");
      setErrorForm("");
      await Promise.all([cargarGastosDelDia(), cargarResumen()]);
    } catch (error: any) {
      console.error("Error guardando gasto:", error);
      toast.error("No se pudo guardar el gasto", { description: error?.message });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarAnulado = async (g: Gasto, anulado: boolean) => {
    const { error } = await supabase.from("gastos").update({ anulado }).eq("id", g.id);
    if (error) {
      toast.error("No se pudo actualizar el gasto");
      return;
    }
    toast.success(anulado ? "Gasto anulado" : "Gasto restaurado");
    setConfirmarAnular(null);
    await Promise.all([cargarGastosDelDia(), cargarResumen(), pestana === "historial" ? cargarHistorial() : Promise.resolve()]);
  };

  // ---------- Proveedores / colaboradores ----------
  const agregarProveedor = async () => {
    if (!nuevoProv.nombre.trim() || !negocioId) {
      toast.error("Escribe el nombre del proveedor");
      return;
    }
    if (!nuevoProv.categoria) {
      toast.error("Elige o agrega qué suministra");
      return;
    }
    try {
      setGuardandoPersona(true);
      const { error } = await supabase.from("proveedores").insert({
        negocio_id: negocioId,
        nombre: nuevoProv.nombre.trim(),
        nit: nuevoProv.nit.trim() || null,
        telefono: nuevoProv.telefono.trim() || null,
        categoria: nuevoProv.categoria,
      });
      if (error) throw error;
      toast.success("Proveedor agregado");
      setNuevoProv({ nombre: "", nit: "", telefono: "", categoria: "" });
      await cargarPersonas(negocioId);
    } catch (error: any) {
      toast.error("No se pudo agregar el proveedor", { description: error?.message });
    } finally {
      setGuardandoPersona(false);
    }
  };

  const agregarColaborador = async () => {
    if (!nuevoColab.nombre.trim() || !negocioId) {
      toast.error("Escribe el nombre del colaborador");
      return;
    }
    try {
      setGuardandoPersona(true);
      const { error } = await supabase.from("colaboradores").insert({
        negocio_id: negocioId,
        nombre: nuevoColab.nombre.trim(),
        documento: nuevoColab.documento.trim() || null,
        telefono: nuevoColab.telefono.trim() || null,
        cargo: nuevoColab.cargo,
      });
      if (error) throw error;
      toast.success("Colaborador agregado");
      setNuevoColab({ nombre: "", documento: "", telefono: "", cargo: "Cocinero" });
      await cargarPersonas(negocioId);
    } catch (error: any) {
      toast.error("No se pudo agregar el colaborador", { description: error?.message });
    } finally {
      setGuardandoPersona(false);
    }
  };

  const cambiarActivo = async (tabla: "proveedores" | "colaboradores", id: string, activo: boolean) => {
    const { error } = await supabase.from(tabla).update({ activo }).eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar");
      return;
    }
    if (negocioId) await cargarPersonas(negocioId);
  };

  // ---------- Derivados ----------
  const historialFiltrado = useMemo(() => {
    const q = hBuscar.trim().toLowerCase();
    return historial.filter((g) => {
      if (hTipo !== "todos" && g.tipo !== hTipo) return false;
      if (!q) return true;
      return [nombrePersona(g), g.categoria, g.nota ?? "", g.medio_pago, g.tipo_pago_colab ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [historial, hTipo, hBuscar, proveedores, colaboradores]);

  const totalHistorial = historialFiltrado.filter((g) => !g.anulado).reduce((s, g) => s + Number(g.valor), 0);
  const totalDelDia = gastosDelDia.filter((g) => !g.anulado).reduce((s, g) => s + Number(g.valor), 0);
  const utilidad = resumen.ventas - resumen.egresos;
  const provsActivos = proveedores.filter((p) => p.activo);
  const opcionesCategoria = unirOpciones(CATEGORIAS, [...proveedores.map((p) => p.categoria), ...categoriasUsadas]);
  const opcionesCargo = unirOpciones(CARGOS, [...colaboradores.map((c) => c.cargo), ...cargosNuevos]);
  const sumarCategoria = (c: string) => setCategoriasUsadas((prev) => [...prev, c]);
  const opcionesServicio = unirOpciones(SERVICIOS, serviciosUsados);
  const confirmarNuevoServicio = () => {
    const nuevo = normalizarOpcion(nuevoServicio);
    if (!nuevo) return;
    const existente = opcionesServicio.find((o) => o.toLowerCase() === nuevo.toLowerCase());
    if (!existente) setServiciosUsados((prev) => [...prev, nuevo]);
    setFCategoria(existente ?? nuevo);
    setNuevoServicio("");
    setEscribiendoServicio(false);
  };
  const sumarCargo = (c: string) => setCargosNuevos((prev) => [...prev, c]);
  const colabsActivos = colaboradores.filter((c) => c.activo);

  if (cargando) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl shadow-lg shadow-orange-500/30">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Egresos
              </h1>
              <p className="text-zinc-600 text-sm">Pagos a proveedores, colaboradores y gastos del negocio</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Chip activo={periodo === "hoy"} onClick={() => setPeriodo("hoy")}>Hoy</Chip>
            <Chip activo={periodo === "semana"} onClick={() => setPeriodo("semana")}>Últimos 7 días</Chip>
            <Chip activo={periodo === "mes"} onClick={() => setPeriodo("mes")}>Este mes</Chip>
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 transition-opacity ${cargandoResumen ? "opacity-60" : ""}`}>
          <div className="rounded-xl border-2 border-zinc-200 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-600 mb-2">
              Ventas <DollarSign className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-zinc-900">{pesos(resumen.ventas)}</div>
            <div className="text-xs text-zinc-500 mt-1">Pedidos vendidos</div>
          </div>
          <div className="rounded-xl border-2 border-zinc-200 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-600 mb-2">
              Egresos <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{pesos(resumen.egresos)}</div>
            <div className="text-xs text-zinc-500 mt-1">
              {resumen.registros} registro{resumen.registros === 1 ? "" : "s"}
            </div>
          </div>
          <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center justify-between text-sm text-orange-800 mb-2">
              Utilidad <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${utilidad >= 0 ? "text-green-600" : "text-red-600"}`}>
              {pesos(utilidad)}
            </div>
            <div className="text-xs text-orange-700 mt-1">Ventas − egresos</div>
          </div>
          <div className="rounded-xl border-2 border-zinc-200 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-600 mb-2">
              Efectivo en caja hoy <Banknote className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-zinc-900">{pesos(resumen.cajaHoy)}</div>
            <div className="text-xs text-zinc-500 mt-1">Ventas en efectivo − gastos en efectivo</div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="grid grid-cols-4 mb-6 border-b border-zinc-200">
          {([
            ["registrar", "Registrar gasto", "Registrar", Plus],
            ["historial", "Historial", "Historial", History],
            ["proveedores", "Proveedores", "Proveedores", Truck],
            ["colaboradores", "Colaboradores", "Colaboradores", Users],
          ] as const).map(([clave, texto, textoCorto, Icono]) => (
            <button
              key={clave}
              onClick={() => setPestana(clave)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 py-3 font-semibold text-xs sm:text-base transition-colors border-b-2 -mb-px ${
                pestana === clave
                  ? "text-orange-600 border-orange-500 bg-orange-50/60"
                  : "text-zinc-500 border-transparent hover:text-orange-500 hover:bg-zinc-50"
              }`}
            >
              <Icono className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{texto}</span>
              <span className="sm:hidden">{textoCorto}</span>
            </button>
          ))}
        </div>

        {/* ============ REGISTRAR ============ */}
        {pestana === "registrar" && (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            <div className="rounded-xl border-2 border-zinc-200 p-5 sm:p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Nuevo gasto</h2>
                <p className="text-sm text-zinc-500">Después de guardar se conservan la fecha y el tipo, para registrar varios seguidos.</p>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Fecha del pago</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" value={fFecha} max={hoy()} onChange={(e) => setFFecha(e.target.value)} className={`${claseCampo} max-w-[200px]`} />
                  <Chip activo={fFecha === hoy()} onClick={() => setFFecha(hoy())}>Hoy</Chip>
                  <Chip activo={fFecha === haceDias(1)} onClick={() => setFFecha(haceDias(1))}>Ayer</Chip>
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Qué se pagó?</label>
                <div className="flex flex-wrap gap-2">
                  {(["proveedor", "colaborador", "servicio", "otro"] as TipoGasto[]).map((t) => (
                    <Chip key={t} activo={fTipo === t} onClick={() => cambiarTipo(t)}>{TIPO_TXT[t]}</Chip>
                  ))}
                </div>
              </div>

              {/* Persona */}
              {/* Servicio público */}
              {fTipo === "servicio" && (
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">¿Cuál servicio?</label>
                  <div className="flex flex-wrap gap-2">
                    {opcionesServicio.map((sv) => (
                      <Chip key={sv} activo={fCategoria === sv && !escribiendoServicio} onClick={() => { setFCategoria(sv); setEscribiendoServicio(false); }}>
                        {sv}
                      </Chip>
                    ))}
                    <Chip activo={escribiendoServicio} onClick={() => setEscribiendoServicio(true)}>＋ Otro</Chip>
                  </div>
                  {escribiendoServicio && (
                    <div className="flex gap-2 mt-2 max-w-md">
                      <input
                        autoFocus
                        value={nuevoServicio}
                        maxLength={50}
                        placeholder="Ej: Teléfono, Televisión, Aseo"
                        onChange={(e) => setNuevoServicio(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmarNuevoServicio();
                          }
                          if (e.key === "Escape") setEscribiendoServicio(false);
                        }}
                        className={claseCampo}
                      />
                      <Button type="button" onClick={confirmarNuevoServicio} className="h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                        Usar
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {(fTipo === "proveedor" || fTipo === "colaborador") && (
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">
                    {fTipo === "proveedor" ? "Proveedor" : "Colaborador"}
                  </label>
                  {(fTipo === "proveedor" ? provsActivos : colabsActivos).length === 0 ? (
                    <div className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                      Aún no tienes {fTipo === "proveedor" ? "proveedores" : "colaboradores"}.{" "}
                      <button
                        className="font-semibold text-orange-600 underline"
                        onClick={() => setPestana(fTipo === "proveedor" ? "proveedores" : "colaboradores")}
                      >
                        Agrégalo aquí
                      </button>
                    </div>
                  ) : (
                    <select value={fPersona} onChange={(e) => elegirPersona(e.target.value)} className={claseCampo}>
                      <option value="">{fTipo === "proveedor" ? "Elegir proveedor…" : "Elegir colaborador…"}</option>
                      {fTipo === "proveedor"
                        ? provsActivos.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre} · {p.categoria}</option>
                          ))
                        : colabsActivos.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre} · {c.cargo}</option>
                          ))}
                    </select>
                  )}
                </div>
              )}

              {/* Tipo de pago a colaborador */}
              {fTipo === "colaborador" && (
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Tipo de pago</label>
                  <div className="flex flex-wrap gap-2">
                    {PAGOS_COLAB.map((p) => (
                      <Chip key={p} activo={fPagoColab === p} onClick={() => setFPagoColab(p)}>{p}</Chip>
                    ))}
                  </div>
                </div>
              )}

              <div className={`grid gap-4 ${fTipo === "proveedor" || fTipo === "otro" ? "sm:grid-cols-2" : ""}`}>
                {/* Categoría: solo proveedor y otro gasto
                    (colaborador = Nómina; servicio = el servicio elegido arriba) */}
                {(fTipo === "proveedor" || fTipo === "otro") && (
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Categoría</label>
                    <SelectConOtro
                      valor={fCategoria}
                      opciones={opcionesCategoria}
                      onCambiar={setFCategoria}
                      onNuevaOpcion={sumarCategoria}
                      textoNueva={fTipo === "otro" ? "Ej: Arriendo, Publicidad" : "Ej: Lácteos, Verduras"}
                      textoElegir="Elegir categoría…"
                    />
                  </div>
                )}

                {/* Valor */}
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Valor pagado</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold">$</span>
                    <input
                      inputMode="numeric"
                      placeholder="0"
                      value={fValor ? Number(fValor).toLocaleString("es-CO") : ""}
                      onChange={(e) => {
                        setFValor(e.target.value.replace(/\D/g, ""));
                        setErrorForm("");
                      }}
                      className={`${claseCampo} pl-7 text-lg font-bold`}
                    />
                  </div>
                </div>
              </div>

              {/* Medio de pago */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Medio de pago</label>
                <div className="flex flex-wrap gap-2">
                  {MEDIOS.map((m) => (
                    <Chip key={m} activo={fMedio === m} onClick={() => setFMedio(m)}>{m}</Chip>
                  ))}
                </div>
              </div>

              {/* Nota */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Nota (opcional)</label>
                <Input
                  value={fNota}
                  onChange={(e) => setFNota(e.target.value)}
                  placeholder="Ej: Queso mozzarella 10 kg, factura 1234"
                  maxLength={200}
                  className="h-11 border-2 border-zinc-200"
                />
              </div>

              {errorForm && <p className="text-sm font-semibold text-red-600">{errorForm}</p>}

              <Button
                onClick={guardarGasto}
                disabled={guardando}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {guardando ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                {guardando ? "Guardando..." : "Guardar gasto"}
              </Button>
            </div>

            {/* Registrados ese día */}
            <div className="rounded-xl border-2 border-zinc-200 p-5 h-fit">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-zinc-900">Registrados el {fechaBonita(fFecha)}</h3>
              </div>
              <p className="text-sm text-zinc-500 mb-4">Lo que ya cargaste para la fecha elegida.</p>

              {gastosDelDia.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-6">Sin gastos registrados ese día</p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {gastosDelDia.map((g) => (
                    <div key={g.id} className={`p-3 rounded-lg border ${g.anulado ? "bg-zinc-50 border-zinc-200 opacity-60" : "border-zinc-200"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-semibold text-sm text-zinc-900 truncate ${g.anulado ? "line-through" : ""}`}>
                            {g.tipo === "otro" ? g.categoria : g.tipo === "servicio" ? `Servicio de ${g.categoria.toLowerCase()}` : nombrePersona(g)}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {TIPO_TXT[g.tipo]} · {g.tipo_pago_colab ?? g.categoria} · {g.medio_pago}
                          </p>
                          {g.nota && <p className="text-xs text-zinc-500 italic truncate">{g.nota}</p>}
                        </div>
                        <span className={`font-bold text-sm whitespace-nowrap ${g.anulado ? "line-through text-zinc-400" : "text-red-600"}`}>
                          {pesos(g.valor)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t-2 border-zinc-200 flex justify-between items-center">
                <span className="font-bold text-zinc-900">Total del día</span>
                <span className="text-xl font-bold text-red-600">{pesos(totalDelDia)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ============ HISTORIAL ============ */}
        {pestana === "historial" && (
          <div className="rounded-xl border-2 border-zinc-200 p-4 sm:p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Desde</label>
                <input type="date" value={hDesde} min={inicioMes()} max={hHasta} onChange={(e) => setHDesde(e.target.value)} className={claseCampo} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Hasta</label>
                <input type="date" value={hHasta} min={hDesde} max={hoy()} onChange={(e) => setHHasta(e.target.value)} className={claseCampo} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Tipo</label>
                <select value={hTipo} onChange={(e) => setHTipo(e.target.value as any)} className={claseCampo}>
                  <option value="todos">Todos</option>
                  <option value="proveedor">Proveedores</option>
                  <option value="colaborador">Colaboradores</option>
                  <option value="servicio">Servicios públicos</option>
                  <option value="otro">Otros gastos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input value={hBuscar} onChange={(e) => setHBuscar(e.target.value)} placeholder="Nombre, nota…" className={`${claseCampo} pl-9`} />
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              Aquí ves los gastos del mes actual. Los meses anteriores están en el reporte de gastos de Looker.
            </p>

            {cargandoHistorial ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
            ) : historialFiltrado.length === 0 ? (
              <p className="text-center text-zinc-500 py-12">No hay gastos con esos filtros</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-zinc-200 text-left text-zinc-700">
                      <th className="p-3 font-semibold">Fecha</th>
                      <th className="p-3 font-semibold">Tipo</th>
                      <th className="p-3 font-semibold">A quién</th>
                      <th className="p-3 font-semibold">Categoría</th>
                      <th className="p-3 font-semibold">Medio</th>
                      <th className="p-3 font-semibold">Nota</th>
                      <th className="p-3 font-semibold text-right">Valor</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialFiltrado.map((g) => (
                      <tr key={g.id} className={`border-b border-zinc-100 ${g.anulado ? "opacity-50" : "hover:bg-zinc-50"}`}>
                        <td className="p-3 whitespace-nowrap text-zinc-600">{fechaBonita(g.fecha)}</td>
                        <td className="p-3"><Badge className={TIPO_CLS[g.tipo]}>{TIPO_TXT[g.tipo]}</Badge></td>
                        <td className={`p-3 font-medium text-zinc-900 ${g.anulado ? "line-through" : ""}`}>{nombrePersona(g)}</td>
                        <td className="p-3 text-zinc-600">{g.tipo_pago_colab ? `${g.categoria} · ${g.tipo_pago_colab}` : g.categoria}</td>
                        <td className="p-3 text-zinc-600">{g.medio_pago}</td>
                        <td className="p-3 text-zinc-500 max-w-[220px] truncate">{g.nota || "—"}</td>
                        <td className={`p-3 text-right font-bold whitespace-nowrap ${g.anulado ? "line-through text-zinc-400" : "text-red-600"}`}>
                          {pesos(g.valor)}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {g.anulado ? (
                            <button onClick={() => cambiarAnulado(g, false)} className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-orange-600">
                              <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                            </button>
                          ) : confirmarAnular === g.id ? (
                            <span className="inline-flex items-center gap-2">
                              <button onClick={() => cambiarAnulado(g, true)} className="text-xs font-bold text-red-600 hover:underline">Sí, anular</button>
                              <button onClick={() => setConfirmarAnular(null)} className="text-xs text-zinc-500 hover:underline">No</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmarAnular(g.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-red-600">
                              <Ban className="w-3.5 h-3.5" /> Anular
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-300">
                      <td colSpan={6} className="p-3 font-bold text-zinc-900">
                        Total ({historialFiltrado.filter((g) => !g.anulado).length} gastos, sin anulados)
                      </td>
                      <td className="p-3 text-right text-lg font-bold text-red-600 whitespace-nowrap">{pesos(totalHistorial)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============ PROVEEDORES ============ */}
        {pestana === "proveedores" && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="rounded-xl border-2 border-zinc-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-900">Proveedores</h2>
                <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                  <input type="checkbox" checked={verInactivosProv} onChange={(e) => setVerInactivosProv(e.target.checked)} className="accent-orange-500" />
                  Ver desactivados
                </label>
              </div>
              <div className="space-y-2">
                {proveedores.filter((p) => verInactivosProv || p.activo).length === 0 && (
                  <p className="text-center text-zinc-500 py-8">Todavía no hay proveedores</p>
                )}
                {proveedores
                  .filter((p) => verInactivosProv || p.activo)
                  .map((p) => (
                    <div key={p.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 ${p.activo ? "" : "opacity-50"}`}>
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 truncate">{p.nombre}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {p.categoria}
                          {p.nit ? ` · NIT ${p.nit}` : ""}
                          {p.telefono ? ` · ${p.telefono}` : ""}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => cambiarActivo("proveedores", p.id, !p.activo)} className="border-zinc-300 shrink-0">
                        {p.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-xl border-2 border-zinc-200 p-5 h-fit space-y-3">
              <h3 className="font-bold text-zinc-900">Agregar proveedor</h3>
              <p className="text-xs text-zinc-500">Desactivar no borra su historial de pagos.</p>
              <Input placeholder="Nombre" value={nuevoProv.nombre} onChange={(e) => setNuevoProv({ ...nuevoProv, nombre: e.target.value })} className="h-11 border-2 border-zinc-200" />
              <Input placeholder="NIT / cédula (opcional)" value={nuevoProv.nit} onChange={(e) => setNuevoProv({ ...nuevoProv, nit: e.target.value })} className="h-11 border-2 border-zinc-200" />
              <Input placeholder="Teléfono (opcional)" inputMode="tel" value={nuevoProv.telefono} onChange={(e) => setNuevoProv({ ...nuevoProv, telefono: e.target.value })} className="h-11 border-2 border-zinc-200" />
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">¿Qué suministra?</label>
                <SelectConOtro
                  valor={nuevoProv.categoria}
                  opciones={opcionesCategoria}
                  onCambiar={(v) => setNuevoProv({ ...nuevoProv, categoria: v })}
                  onNuevaOpcion={sumarCategoria}
                  textoNueva="Ej: Lácteos, Verduras, Hielo"
                  textoElegir="Elegir qué suministra…"
                />
              </div>
              <Button onClick={agregarProveedor} disabled={guardandoPersona} className="w-full h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                <Plus className="w-4 h-4 mr-2" /> Agregar proveedor
              </Button>
            </div>
          </div>
        )}

        {/* ============ COLABORADORES ============ */}
        {pestana === "colaboradores" && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="rounded-xl border-2 border-zinc-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-900">Colaboradores</h2>
                <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                  <input type="checkbox" checked={verInactivosColab} onChange={(e) => setVerInactivosColab(e.target.checked)} className="accent-orange-500" />
                  Ver desactivados
                </label>
              </div>
              <div className="space-y-2">
                {colaboradores.filter((c) => verInactivosColab || c.activo).length === 0 && (
                  <p className="text-center text-zinc-500 py-8">Todavía no hay colaboradores</p>
                )}
                {colaboradores
                  .filter((c) => verInactivosColab || c.activo)
                  .map((c) => (
                    <div key={c.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border border-zinc-200 ${c.activo ? "" : "opacity-50"}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                          {c.nombre.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">{c.nombre}</p>
                          <p className="text-xs text-zinc-500 truncate">
                            {c.cargo}
                            {c.documento ? ` · CC ${c.documento}` : ""}
                            {c.telefono ? ` · ${c.telefono}` : ""}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => cambiarActivo("colaboradores", c.id, !c.activo)} className="border-zinc-300 shrink-0">
                        {c.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-xl border-2 border-zinc-200 p-5 h-fit space-y-3">
              <h3 className="font-bold text-zinc-900">Agregar colaborador</h3>
              <p className="text-xs text-zinc-500">No necesita usuario en la app (cocina, domicilios, ayudantes).</p>
              <Input placeholder="Nombre" value={nuevoColab.nombre} onChange={(e) => setNuevoColab({ ...nuevoColab, nombre: e.target.value })} className="h-11 border-2 border-zinc-200" />
              <Input placeholder="Documento (opcional)" value={nuevoColab.documento} onChange={(e) => setNuevoColab({ ...nuevoColab, documento: e.target.value })} className="h-11 border-2 border-zinc-200" />
              <Input placeholder="Teléfono (opcional)" inputMode="tel" value={nuevoColab.telefono} onChange={(e) => setNuevoColab({ ...nuevoColab, telefono: e.target.value })} className="h-11 border-2 border-zinc-200" />
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Cargo</label>
                <SelectConOtro
                  valor={nuevoColab.cargo}
                  opciones={opcionesCargo}
                  onCambiar={(v) => setNuevoColab({ ...nuevoColab, cargo: v })}
                  onNuevaOpcion={sumarCargo}
                  textoNueva="Ej: Lavaplatos, Auxiliar de caja"
                />
              </div>
              <Button onClick={agregarColaborador} disabled={guardandoPersona} className="w-full h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                <Plus className="w-4 h-4 mr-2" /> Agregar colaborador
              </Button>
            </div>
          </div>
        )}
      </div>

      <Toaster position="top-center" richColors />
    </div>
  );
}