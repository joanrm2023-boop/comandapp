"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, ShoppingBag, TrendingUp, Clock, ChevronDown, ChevronUp, Loader2, CreditCard, UtensilsCrossed, Home, ShoppingBag as ShoppingBagIcon, Printer, FileDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Tipos
interface Pedido {
  id: string;
  numero_pedido: number | null;
  mesa_id: string;
  estado: string;
  total: number;
  created_at: string;
  medio_pago: string;
  mesas: {
    numero: string;
  };
  detalle_pedidos: Array<{
    id: string;
    cantidad: number;
    productos: {
      nombre: string;
    };
  }>;
}

interface ProductoVendido {
  nombre: string;
  cantidad: number;
  total: number;
}

export default function VentasPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState("hoy");
  const [filtroPago, setFiltroPago] = useState("todos");
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // 🆕 Datos del negocio para el encabezado del ticket de resumen, y estado del botón
  const [negocioInfo, setNegocioInfo] = useState<{
    nombre: string;
    nombre_sede: string | null;
    direccion: string | null;
    telefono?: string | null;
    ciudad?: string | null;
    logo_url?: string | null;
  } | null>(null);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    cargarVentas();
  }, [filtroFecha, filtroPago, fechaInicio, fechaFin]);

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

  const cargarVentas = async () => {
    try {
      setLoading(true);

      // Obtener negocio_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!usuarioData) return;

      const negocioId = usuarioData.negocio_id;

      // 🆕 Datos del negocio para el ticket de resumen
      const { data: negocioData } = await supabase
        .from('negocios')
        .select('nombre, nombre_sede, direccion, telefono, ciudad, logo_url')
        .eq('id', negocioId)
        .single();
      if (negocioData) setNegocioInfo(negocioData);

      const { inicio, fin } = obtenerRangoFechas();

      // Construir query base
      let query = supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          mesa_id,
          estado,
          total,
          created_at,
          medio_pago,
          mesas (numero),
          detalle_pedidos (
            id,
            cantidad,
            productos (nombre)
          )
        `)
        .eq('estado', 'vendido')
        .eq('negocio_id', negocioId)
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fin.toISOString())
        .order('created_at', { ascending: false });

      // Aplicar filtro de medio de pago si no es "todos"
      if (filtroPago !== 'todos') {
        query = query.eq('medio_pago', filtroPago);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPedidos(data as any || []);
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Determinar el tipo de pedido a partir del nombre de la mesa
  // (misma lógica que ya usa PedidosPage/Dashboard)
  const getTipoPedido = (pedido: Pedido): 'mesa' | 'domicilio' | 'para_llevar' => {
    const mesaNumero = pedido.mesas.numero.toLowerCase();
    if (mesaNumero.includes('domicilio')) return 'domicilio';
    if (mesaNumero.includes('llevar')) return 'para_llevar';
    return 'mesa';
  };

  // Pedidos ya filtrados por fecha/medio de pago (desde la query).
  const pedidosFiltrados = pedidos;

  const calcularMetricas = () => {
    const totalVentas = pedidosFiltrados.reduce((sum, p) => sum + Number(p.total), 0);
    const totalPedidos = pedidosFiltrados.length;
    const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

    // Calcular pedidos por hora
    const { inicio, fin } = obtenerRangoFechas();
    const horasDiferencia = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);
    const pedidosPorHora = horasDiferencia > 0 ? totalPedidos / horasDiferencia : 0;

    return {
      totalVentas,
      totalPedidos,
      ticketPromedio,
      pedidosPorHora
    };
  };

  // 🆕 Resumen comparativo por tipo, SIEMPRE sobre el conjunto completo
  // (fecha + medio de pago aplicados, pero sin el filtro de tipo), para
  // que se vea el panorama completo sin importar qué tipo esté activo.
  const calcularResumenPorTipo = () => {
    const deTipo = (tipo: 'mesa' | 'domicilio' | 'para_llevar') =>
      pedidos.filter((p) => getTipoPedido(p) === tipo);

    const armar = (lista: Pedido[]) => ({
      cantidad: lista.length,
      total: lista.reduce((sum, p) => sum + Number(p.total), 0),
    });

    return {
      mesa: armar(deTipo('mesa')),
      domicilio: armar(deTipo('domicilio')),
      para_llevar: armar(deTipo('para_llevar')),
    };
  };

  // 🆕 Totales por medio de pago (sobre los pedidos ya filtrados por fecha/medio de pago)
  const calcularResumenPorPago = () => {
    const MEDIOS: [string, string][] = [
      ['efectivo', 'Efectivo'],
      ['nequi', 'Nequi'],
      ['daviplata', 'Daviplata'],
      ['bold', 'Bold'],
    ];
    const resumen = MEDIOS.map(([valor, nombre]) => {
      const lista = pedidos.filter((p) => p.medio_pago === valor);
      return { nombre, cantidad: lista.length, total: lista.reduce((s, p) => s + Number(p.total), 0) };
    });
    // Pedidos sin medio de pago registrado, si los hay
    const sinMedio = pedidos.filter((p) => !MEDIOS.some(([v]) => v === p.medio_pago));
    if (sinMedio.length > 0) {
      resumen.push({
        nombre: 'Sin medio',
        cantidad: sinMedio.length,
        total: sinMedio.reduce((s, p) => s + Number(p.total), 0),
      });
    }
    return resumen;
  };

  // 🆕 Enviar el resumen del período seleccionado al servidor de impresión
  const imprimirResumen = async () => {
    if (pedidos.length === 0) {
      alert('No hay ventas en el período seleccionado');
      return;
    }

    try {
      setImprimiendo(true);

      const { inicio, fin } = obtenerRangoFechas();
      const f = (d: Date) =>
        d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

      let titulo: string;
      if (filtroFecha === 'hoy') {
        titulo = `CIERRE DEL DIA ${f(inicio)}`;
      } else if (filtroFecha === 'mes') {
        titulo = `VENTAS ${inicio.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase()}`;
      } else if (f(inicio) === f(fin)) {
        titulo = `VENTAS DEL ${f(inicio)}`;
      } else {
        titulo = `VENTAS ${f(inicio)} - ${f(fin)}`;
      }

      const porTipo = calcularResumenPorTipo();
      const met = calcularMetricas();

      const resumen = {
        titulo,
        subtitulo: filtroPago !== 'todos' ? `Solo pagos con ${filtroPago}` : '',
        porTipo: [
          { nombre: 'Mesas', ...porTipo.mesa },
          { nombre: 'Para llevar', ...porTipo.para_llevar },
          { nombre: 'Domicilio', ...porTipo.domicilio },
        ],
        totalPedidos: met.totalPedidos,
        totalVentas: met.totalVentas,
        ticketPromedio: met.ticketPromedio,
        porPago: calcularResumenPorPago(),
      };

      // Si el servidor de impresión no responde en 4 s, se cancela
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('http://localhost:3001/print-resumen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumen, negocio: negocioInfo }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const resultado = await response.json();
      if (!resultado.success) throw new Error(resultado.error || 'Error al imprimir');
    } catch (error: any) {
      console.error('Error imprimiendo resumen:', error);
      alert(
        error?.name === 'AbortError' || error?.message?.includes('fetch')
          ? 'No se encontró el servidor de impresión. Verifica que esté abierto en este computador.'
          : 'No se pudo imprimir: ' + (error?.message || 'error desconocido')
      );
    } finally {
      setImprimiendo(false);
    }
  };

  // 🆕 Carga el logo del negocio como imagen PNG redonda para el PDF.
  // Si no hay logo o no se puede leer, devuelve null y el PDF usa las iniciales.
  const cargarLogoParaPdf = (url: string | null | undefined): Promise<string | null> =>
    new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const lado = 240;
          const canvas = document.createElement('canvas');
          canvas.width = lado;
          canvas.height = lado;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(lado / 2, lado / 2, lado / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.clip();
          // Recorte tipo "cover" para que el logo llene el círculo
          const escala = Math.max(lado / img.width, lado / img.height);
          const w = img.width * escala;
          const h = img.height * escala;
          ctx.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });

  // 🆕 Descargar el reporte de ventas del período seleccionado en PDF
  const descargarPdf = async () => {
    if (pedidos.length === 0) {
      alert('No hay ventas en el período seleccionado');
      return;
    }

    try {
      setGenerandoPdf(true);

      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      // Las fechas de es-CO traen espacios especiales ("p. m.") que la fuente del PDF no muestra
      const limpio = (t: string) => t.replace(/[  ]/g, ' ');
      const pesos = (n: number) => '$' + limpio(Math.round(Number(n) || 0).toLocaleString('es-CO'));
      const fechaCorta = (d: Date) =>
        d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const hora = (d: Date) =>
        limpio(d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }));

      // ---- Textos del período y filtros ----
      const { inicio, fin } = obtenerRangoFechas();
      let periodo: string;
      if (filtroFecha === 'hoy' || filtroFecha === 'ayer' || fechaCorta(inicio) === fechaCorta(fin)) {
        const dia = inicio.toLocaleDateString('es-CO', { weekday: 'long' });
        periodo = `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${fechaCorta(inicio)}`;
      } else if (filtroFecha === 'mes') {
        const m = inicio.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
        periodo = m.charAt(0).toUpperCase() + m.slice(1);
      } else {
        periodo = `${fechaCorta(inicio)} - ${fechaCorta(fin)}`;
      }
      const nombresFecha: Record<string, string> = {
        hoy: 'Hoy', ayer: 'Ayer', semana: 'Ultima semana', mes: 'Este mes', personalizado: 'Rango',
      };
      const nombresPago: Record<string, string> = {
        todos: 'Todos los pagos', efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', bold: 'Bold',
      };
      const textoFiltro = `Filtro: ${nombresFecha[filtroFecha] || filtroFecha} · ${nombresPago[filtroPago] || filtroPago}`;

      const nombreNegocio = negocioInfo?.nombre || 'DishHub';
      const sede = negocioInfo?.nombre_sede || '';
      const lineaNegocio = [
        sede,
        negocioInfo?.direccion,
        negocioInfo?.ciudad,
        negocioInfo?.telefono ? `Tel ${negocioInfo.telefono}` : null,
      ].filter(Boolean).join(' · ');

      // ---- Datos (los mismos que ya están en pantalla) ----
      const met = calcularMetricas();
      const porTipo = calcularResumenPorTipo();
      const filasTipo = [
        { nombre: 'Mesas', ...porTipo.mesa },
        { nombre: 'Para llevar', ...porTipo.para_llevar },
        { nombre: 'Domicilio', ...porTipo.domicilio },
      ].filter((t) => t.cantidad > 0).sort((a, b) => b.total - a.total);
      const filasPago = calcularResumenPorPago().filter((p) => p.cantidad > 0).sort((a, b) => b.total - a.total);
      const pct = (v: number) => (met.totalVentas > 0 ? (v / met.totalVentas) * 100 : 0);

      const varios = fechaCorta(inicio) !== fechaCorta(fin);
      const detalle = [...pedidos]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((p) => {
          const d = new Date(p.created_at);
          const tipo = getTipoPedido(p);
          return {
            numero: p.numero_pedido ? `#${p.numero_pedido}` : `#${p.id.slice(-6).toUpperCase()}`,
            hora: varios ? `${fechaCorta(d)} ${hora(d)}` : hora(d),
            tipo: tipo === 'domicilio' ? 'Domicilio' : tipo === 'para_llevar' ? 'Para llevar' : 'Mesa',
            mesa: tipo === 'mesa' ? `Mesa ${p.mesas.numero}` : p.mesas.numero,
            pago: nombresPago[p.medio_pago] || p.medio_pago || 'Sin medio',
            total: Number(p.total),
          };
        });

      // ---- Documento ----
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const W = doc.internal.pageSize.getWidth();   // 612
      const H = doc.internal.pageSize.getHeight();  // 792
      const M = 36;                                 // margen lateral
      const NARANJA: [number, number, number] = [249, 115, 22];
      const ROJO: [number, number, number] = [239, 68, 68];
      const NARANJA_OSCURO: [number, number, number] = [194, 65, 12];
      const TINTA: [number, number, number] = [24, 24, 27];
      const GRIS: [number, number, number] = [113, 113, 122];
      const LINEA: [number, number, number] = [228, 228, 231];

      // Membrete: franja degradada naranja → rojo
      const ALTO_FRANJA = 84;
      const pasos = 80;
      for (let i = 0; i < pasos; i++) {
        const t = i / (pasos - 1);
        doc.setFillColor(
          Math.round(NARANJA[0] + (ROJO[0] - NARANJA[0]) * t),
          Math.round(NARANJA[1] + (ROJO[1] - NARANJA[1]) * t),
          Math.round(NARANJA[2] + (ROJO[2] - NARANJA[2]) * t)
        );
        doc.rect((W / pasos) * i, 0, W / pasos + 1, ALTO_FRANJA, 'F');
      }

      // Logo (o iniciales si no hay logo)
      const logo = await cargarLogoParaPdf(negocioInfo?.logo_url);
      const cx = M + 26;
      const cy = ALTO_FRANJA / 2;
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, 27, 'F');
      if (logo) {
        doc.addImage(logo, 'PNG', cx - 25, cy - 25, 50, 50);
      } else {
        const iniciales = nombreNegocio.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
        doc.setTextColor(...ROJO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.text(iniciales, cx, cy + 6, { align: 'center' });
      }

      // Nombre y datos del negocio
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(19);
      doc.text(nombreNegocio, M + 64, cy - 3);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      if (lineaNegocio) doc.text(lineaNegocio, M + 64, cy + 12, { maxWidth: W - M * 2 - 64 - 170 });

      // Título del documento (derecha)
      doc.setFontSize(7.5);
      doc.text('REPORTE DE VENTAS', W - M, cy - 14, { align: 'right', charSpace: 1.5 });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(periodo, W - M, cy + 1, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(textoFiltro, W - M, cy + 13, { align: 'right' });

      // Tarjetas de resumen
      const yCards = ALTO_FRANJA + 20;
      const gap = 12;
      const anchoCard = (W - M * 2 - gap * 2) / 3;
      const tarjetas = [
        { l: 'TOTAL VENDIDO', v: pesos(met.totalVentas), destacada: true },
        { l: 'PEDIDOS', v: String(met.totalPedidos), destacada: false },
        { l: 'TICKET PROMEDIO', v: pesos(met.ticketPromedio), destacada: false },
      ];
      tarjetas.forEach((c, i) => {
        const x = M + i * (anchoCard + gap);
        if (c.destacada) {
          doc.setFillColor(255, 247, 237);
          doc.roundedRect(x, yCards, anchoCard, 52, 6, 6, 'F');
        }
        doc.setDrawColor(...LINEA);
        doc.setLineWidth(0.8);
        doc.roundedRect(x, yCards, anchoCard, 52, 6, 6, 'S');
        doc.setFillColor(...NARANJA);
        doc.rect(x + 3, yCards, anchoCard - 6, 3, 'F');
        doc.setTextColor(...GRIS);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(c.l, x + 12, yCards + 18, { charSpace: 0.8 });
        doc.setTextColor(...(c.destacada ? NARANJA_OSCURO : TINTA));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.text(c.v, x + 12, yCards + 40);
      });

      // Estilo común de las tablas
      const estiloTabla = {
        theme: 'plain' as const,
        styles: { font: 'helvetica', fontSize: 8.5, textColor: TINTA, cellPadding: { top: 4.5, bottom: 4.5, left: 6, right: 6 } },
        headStyles: { fillColor: [39, 39, 42] as [number, number, number], textColor: 255, fontStyle: 'bold' as const, fontSize: 7.5 },
        alternateRowStyles: { fillColor: [250, 250, 250] as [number, number, number] },
        bodyStyles: { lineColor: LINEA, lineWidth: { bottom: 0.6 } },
      };

      const titulo = (texto: string, x: number, y: number) => {
        doc.setTextColor(...NARANJA_OSCURO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(texto, x, y, { charSpace: 0.8 });
      };

      // Barra de porcentaje dentro de la columna 2
      const barra = (data: any, valores: number[]) => {
        if (data.section !== 'body' || data.column.index !== 2) return;
        const v = valores[data.row.index] ?? 0;
        const x = data.cell.x + 4;
        const y = data.cell.y + data.cell.height / 2 - 2.5;
        const w = data.cell.width - 8;
        doc.setFillColor(244, 244, 245);
        doc.roundedRect(x, y, w, 5, 2.5, 2.5, 'F');
        if (v > 0) {
          doc.setFillColor(...NARANJA);
          doc.roundedRect(x, y, Math.max(5, (w * v) / 100), 5, 2.5, 2.5, 'F');
        }
      };

      // Dos resúmenes lado a lado
      const yRes = yCards + 52 + 28;
      const anchoMitad = (W - M * 2 - 18) / 2;
      const columnasRes = (primera: string) => [primera, 'Ped.', '', '%', 'Total'];
      const estiloColsRes = {
        1: { halign: 'right' as const, cellWidth: 30 },
        2: { cellWidth: 52 },
        3: { halign: 'right' as const, cellWidth: 32 },
        4: { halign: 'right' as const, fontStyle: 'bold' as const },
      };

      titulo('POR TIPO DE PEDIDO', M, yRes - 8);
      const pctTipo = filasTipo.map((t) => pct(t.total));
      autoTable(doc, {
        ...estiloTabla,
        startY: yRes,
        margin: { left: M, right: W - M - anchoMitad },
        tableWidth: anchoMitad,
        head: [columnasRes('Tipo')],
        body: filasTipo.map((t, i) => [t.nombre, t.cantidad, '', `${pctTipo[i].toFixed(0)}%`, pesos(t.total)]),
        columnStyles: estiloColsRes,
        didParseCell: (data: any) => {
          if (data.section === 'head' && [1, 3, 4].includes(data.column.index)) data.cell.styles.halign = 'right';
        },
        didDrawCell: (data: any) => barra(data, pctTipo),
      });
      const finTipo = (doc as any).lastAutoTable.finalY;

      const xPago = M + anchoMitad + 18;
      titulo('POR MEDIO DE PAGO', xPago, yRes - 8);
      const pctPago = filasPago.map((p) => pct(p.total));
      autoTable(doc, {
        ...estiloTabla,
        startY: yRes,
        margin: { left: xPago, right: M },
        tableWidth: anchoMitad,
        head: [columnasRes('Medio')],
        body: filasPago.map((p, i) => [p.nombre, p.cantidad, '', `${pctPago[i].toFixed(0)}%`, pesos(p.total)]),
        columnStyles: estiloColsRes,
        didParseCell: (data: any) => {
          if (data.section === 'head' && [1, 3, 4].includes(data.column.index)) data.cell.styles.halign = 'right';
        },
        didDrawCell: (data: any) => barra(data, pctPago),
      });
      const finPago = (doc as any).lastAutoTable.finalY;

      // Encabezado pequeño para las páginas 2 en adelante
      const encabezadoChico = () => {
        doc.setTextColor(...TINTA);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(sede ? `${nombreNegocio} · ${sede}` : nombreNegocio, M, 30);
        doc.setTextColor(...GRIS);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Reporte de ventas · ${periodo}`, W - M, 30, { align: 'right' });
        doc.setDrawColor(...NARANJA);
        doc.setLineWidth(2);
        doc.line(0, 42, W, 42);
      };

      // Detalle de pedidos
      const colorTipo: Record<string, [number, number, number]> = {
        'Mesa': [234, 88, 12],
        'Domicilio': [185, 28, 28],
        'Para llevar': [63, 63, 70],
      };
      const yDet = Math.max(finTipo, finPago) + 32;
      titulo('DETALLE DE PEDIDOS', M, yDet - 8);
      autoTable(doc, {
        ...estiloTabla,
        startY: yDet,
        margin: { left: M, right: M, top: 64, bottom: 50 },
        head: [['#', varios ? 'Fecha / hora' : 'Hora', 'Tipo', 'Mesa / canal', 'Pago', 'Total']],
        body: detalle.map((d) => [d.numero, d.hora, d.tipo, d.mesa, d.pago, pesos(d.total)]),
        foot: [[{ content: `TOTAL (${met.totalPedidos} pedidos)`, colSpan: 5 }, pesos(met.totalVentas)]],
        showFoot: 'lastPage',
        footStyles: { fillColor: [255, 255, 255], textColor: TINTA, fontStyle: 'bold', fontSize: 10, lineColor: TINTA, lineWidth: { top: 1.2 } },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 42 },
          2: { fontStyle: 'bold' },
          5: { halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 2) {
            data.cell.styles.textColor = colorTipo[data.cell.raw as string] || TINTA;
          }
          if (data.section === 'head' && data.column.index === 5) {
            data.cell.styles.halign = 'right';
          }
          if (data.section === 'foot' && data.column.index === 1) {
            data.cell.styles.halign = 'right';
          }
        },
        didDrawPage: (data: any) => {
          if (data.pageNumber > 1) encabezadoChico();
        },
      });

      // Firmas al final (en una página nueva si no caben)
      let yFirma = (doc as any).lastAutoTable.finalY + 60;
      if (yFirma > H - 70) {
        doc.addPage();
        encabezadoChico();
        yFirma = 110;
      }
      const anchoFirma = (W - M * 2 - 40) / 2;
      doc.setDrawColor(...TINTA);
      doc.setLineWidth(0.7);
      doc.setTextColor(...GRIS);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      [['Entregado por', M], ['Revisado por', M + anchoFirma + 40]].forEach(([texto, x]) => {
        doc.line(x as number, yFirma, (x as number) + anchoFirma, yFirma);
        doc.text(texto as string, x as number, yFirma + 12);
      });

      // Pie de página en todas las páginas
      const generado = limpio(new Date().toLocaleString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
      }));
      const totalPaginas = doc.getNumberOfPages();
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        doc.setDrawColor(...LINEA);
        doc.setLineWidth(0.6);
        doc.line(M, H - 34, W - M, H - 34);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...GRIS);
        doc.text('Generado por ', M, H - 20);
        const x1 = M + doc.getTextWidth('Generado por ');
        doc.setTextColor(...NARANJA);
        doc.setFont('helvetica', 'bold');
        doc.text('DishHub', x1, H - 20);
        const x2 = x1 + doc.getTextWidth('DishHub');
        doc.setTextColor(...GRIS);
        doc.setFont('helvetica', 'normal');
        doc.text(` · ${generado}`, x2, H - 20);
        doc.text(`Pagina ${i} de ${totalPaginas}`, W - M, H - 20, { align: 'right' });
      }

      // Nombre del archivo: ventas-sede-1-2026-11-14.pdf
      const iso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const slugSede = (sede || nombreNegocio)
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const rango = iso(inicio) === iso(fin) ? iso(inicio) : `${iso(inicio)}_a_${iso(fin)}`;
      doc.save(`ventas-${slugSede}-${rango}.pdf`);
    } catch (error: any) {
      console.error('Error generando PDF:', error);
      alert('No se pudo generar el PDF: ' + (error?.message || 'error desconocido'));
    } finally {
      setGenerandoPdf(false);
    }
  };

  const obtenerProductosMasVendidos = (): ProductoVendido[] => {
    const productosMap = new Map<string, ProductoVendido>();

    pedidosFiltrados.forEach(pedido => {
      pedido.detalle_pedidos.forEach(detalle => {
        const nombre = detalle.productos.nombre;
        const cantidad = detalle.cantidad;

        if (productosMap.has(nombre)) {
          const existing = productosMap.get(nombre)!;
          productosMap.set(nombre, {
            nombre,
            cantidad: existing.cantidad + cantidad,
            total: existing.total + cantidad
          });
        } else {
          productosMap.set(nombre, {
            nombre,
            cantidad,
            total: cantidad
          });
        }
      });
    });

    return Array.from(productosMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const obtenerIconoMedioPago = (medio: string) => {
    switch (medio) {
      case 'efectivo':
        return '💵';
      case 'nequi':
        return '📱';
      case 'daviplata':
        return '📲';
      case 'bold':
        return '💳';
      default:
        return '💰';
    }
  };

  // 🆕 Ícono/etiqueta de tipo para la columna nueva de la tabla
  const obtenerBadgeTipo = (pedido: Pedido) => {
    const tipo = getTipoPedido(pedido);
    if (tipo === 'domicilio') {
      return (
        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 gap-1">
          <Home className="w-3 h-3" /> Domicilio
        </Badge>
      );
    }
    if (tipo === 'para_llevar') {
      return (
        <Badge className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 gap-1">
          <ShoppingBagIcon className="w-3 h-3" /> Para llevar
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-semibold border-zinc-300">
        Mesa {pedido.mesas.numero}
      </Badge>
    );
  };

  const metricas = calcularMetricas();
  const resumenTipo = calcularResumenPorTipo();
  const topProductos = obtenerProductosMasVendidos();

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
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl shadow-lg shadow-orange-500/30">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Ventas
              </h1>
              <p className="text-zinc-600 text-sm">
                Análisis de ventas y estadísticas
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* 🆕 Imprimir el resumen del período seleccionado */}
            <Button
              onClick={imprimirResumen}
              disabled={imprimiendo || pedidos.length === 0}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-12 px-6 text-base font-semibold"
            >
              {imprimiendo ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Printer className="w-5 h-5 mr-2" />}
              {imprimiendo ? 'Imprimiendo...' : 'Imprimir resumen'}
            </Button>

            {/* 🆕 Descargar el reporte del período seleccionado en PDF */}
            <Button
              onClick={descargarPdf}
              disabled={generandoPdf || pedidos.length === 0}
              variant="outline"
              className="h-12 px-6 text-base font-semibold border-2 border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
            >
              {generandoPdf ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileDown className="w-5 h-5 mr-2" />}
              {generandoPdf ? 'Generando...' : 'Descargar PDF'}
            </Button>
          </div>
        </div>

        {/* Filtros de Fecha */}
        <div className="bg-white rounded-xl border-2 border-zinc-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-zinc-900">Filtrar por Fecha</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setFiltroFecha("hoy")}
              variant={filtroFecha === "hoy" ? "default" : "outline"}
              className={filtroFecha === "hoy" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📅 Hoy
            </Button>
            <Button
              onClick={() => setFiltroFecha("ayer")}
              variant={filtroFecha === "ayer" ? "default" : "outline"}
              className={filtroFecha === "ayer" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📆 Ayer
            </Button>
            <Button
              onClick={() => setFiltroFecha("semana")}
              variant={filtroFecha === "semana" ? "default" : "outline"}
              className={filtroFecha === "semana" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📊 Última semana
            </Button>
            <Button
              onClick={() => setFiltroFecha("mes")}
              variant={filtroFecha === "mes" ? "default" : "outline"}
              className={filtroFecha === "mes" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📈 Este mes
            </Button>
            <Button
              onClick={() => setFiltroFecha("personalizado")}
              variant={filtroFecha === "personalizado" ? "default" : "outline"}
              className={filtroFecha === "personalizado" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              🗓️ Rango personalizado
            </Button>
          </div>

          {/* Selector de fechas personalizado */}
          {filtroFecha === "personalizado" && (
            <div className="flex gap-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Filtros por Medio de Pago */}
        <div className="bg-white rounded-xl border-2 border-zinc-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-zinc-900">Filtrar por Medio de Pago</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setFiltroPago("todos")}
              variant={filtroPago === "todos" ? "default" : "outline"}
              className={filtroPago === "todos" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              💰 Todos
            </Button>
            <Button
              onClick={() => setFiltroPago("efectivo")}
              variant={filtroPago === "efectivo" ? "default" : "outline"}
              className={filtroPago === "efectivo" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              💵 Efectivo
            </Button>
            <Button
              onClick={() => setFiltroPago("nequi")}
              variant={filtroPago === "nequi" ? "default" : "outline"}
              className={filtroPago === "nequi" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📱 Nequi
            </Button>
            <Button
              onClick={() => setFiltroPago("daviplata")}
              variant={filtroPago === "daviplata" ? "default" : "outline"}
              className={filtroPago === "daviplata" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              📲 Daviplata
            </Button>
            <Button
              onClick={() => setFiltroPago("bold")}
              variant={filtroPago === "bold" ? "default" : "outline"}
              className={filtroPago === "bold" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                : "border-zinc-300 hover:border-orange-400 hover:bg-orange-50"
              }
            >
              💳 Bold
            </Button>
          </div>
        </div>

        {/* Indicador de filtros activos */}
        <div className="mb-8 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
          <p className="text-sm text-zinc-700">
            <span className="font-semibold">Mostrando:</span> Ventas de{" "}
            <span className="font-semibold text-orange-600">
              {filtroFecha === "hoy" && "hoy"}
              {filtroFecha === "ayer" && "ayer"}
              {filtroFecha === "semana" && "la última semana"}
              {filtroFecha === "mes" && "este mes"}
              {filtroFecha === "personalizado" && "rango personalizado"}
            </span>
            {filtroPago !== "todos" && (
              <>
                {" "}pagadas con{" "}
                <span className="font-semibold text-orange-600">
                  {obtenerIconoMedioPago(filtroPago)} {filtroPago}
                </span>
              </>
            )}
          </p>
        </div>

        {/* 🆕 Resumen comparativo por tipo — siempre visible, sin importar el filtro de tipo activo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-orange-800">🪑 MESAS</span>
              <span className="text-xs text-orange-600">{resumenTipo.mesa.cantidad} pedidos</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              ${resumenTipo.mesa.total.toLocaleString()}
            </div>
          </div>

          <div className="bg-zinc-50 border-2 border-zinc-300 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-zinc-800">🏠 DOMICILIO</span>
              <span className="text-xs text-zinc-600">{resumenTipo.domicilio.cantidad} pedidos</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">
              ${resumenTipo.domicilio.total.toLocaleString()}
            </div>
          </div>

          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-orange-800">🛍️ PARA LLEVAR</span>
              <span className="text-xs text-orange-600">{resumenTipo.para_llevar.cantidad} pedidos</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              ${resumenTipo.para_llevar.total.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tarjetas de métricas (ya reflejan el filtro de tipo activo) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Ventas */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Total Ventas
                </CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                ${metricas.totalVentas.toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Pedidos vendidos
              </p>
            </CardContent>
          </Card>

          {/* Total Pedidos */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Total Pedidos
                </CardTitle>
                <div className="bg-zinc-900 p-2 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-900">
                {metricas.totalPedidos}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Pedidos completados
              </p>
            </CardContent>
          </Card>

          {/* Ticket Promedio */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Ticket Promedio
                </CardTitle>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                ${Math.round(metricas.ticketPromedio).toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Por pedido
              </p>
            </CardContent>
          </Card>

          {/* Pedidos por Hora */}
          <Card className="border-2 border-zinc-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  Pedidos/Hora
                </CardTitle>
                <div className="bg-zinc-900 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-zinc-900">
                {metricas.pedidosPorHora.toFixed(1)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Promedio
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Productos */}
        {topProductos.length > 0 && (
          <Card className="mb-6 border-2 border-zinc-200">
            <CardHeader className="bg-zinc-50 border-b border-zinc-200">
              <CardTitle className="flex items-center gap-2 text-lg text-zinc-900">
                <span className="text-2xl">🏆</span>
                Top 5 Productos Más Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {topProductos.map((producto, index) => (
                  <div
                    key={producto.nombre}
                    className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200 hover:border-orange-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-white
                        ${index === 0 ? 'bg-orange-500' : 
                          index === 1 ? 'bg-zinc-700' : 
                          index === 2 ? 'bg-orange-400' : 'bg-zinc-500'}
                      `}>
                        {index + 1}
                      </div>
                      <span className="font-semibold text-zinc-900">{producto.nombre}</span>
                    </div>
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                      {producto.cantidad} vendidos
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalle de Pedidos */}
        <Card className="border-2 border-zinc-200">
          <CardHeader>
            <button
              onClick={() => setMostrarDetalle(!mostrarDetalle)}
              className="w-full flex items-center justify-between hover:bg-zinc-50 p-2 rounded-lg transition-colors"
            >
              <CardTitle className="flex items-center gap-2 text-lg text-zinc-900">
                <Calendar className="w-5 h-5 text-orange-500" />
                Detalle de Pedidos ({pedidosFiltrados.length})
              </CardTitle>
              {mostrarDetalle ? (
                <ChevronUp className="w-5 h-5 text-zinc-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-600" />
              )}
            </button>
          </CardHeader>

          {mostrarDetalle && (
            <CardContent className="p-4">
              {pedidosFiltrados.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-zinc-200">
                        <th className="text-left p-3 font-semibold text-zinc-700">Fecha/Hora</th>
                        <th className="text-left p-3 font-semibold text-zinc-700">Tipo</th>
                        <th className="text-left p-3 font-semibold text-zinc-700">Items</th>
                        <th className="text-left p-3 font-semibold text-zinc-700">Medio Pago</th>
                        <th className="text-right p-3 font-semibold text-zinc-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosFiltrados.map((pedido) => (
                        <tr key={pedido.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <td className="p-3 text-sm text-zinc-600">
                            {formatearFecha(pedido.created_at)}
                          </td>
                          <td className="p-3">
                            {obtenerBadgeTipo(pedido)}
                          </td>
                          <td className="p-3 text-sm text-zinc-600">
                            {pedido.detalle_pedidos.reduce((sum, d) => sum + d.cantidad, 0)} items
                          </td>
                          <td className="p-3">
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                              {obtenerIconoMedioPago(pedido.medio_pago)} {pedido.medio_pago}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-orange-600">
                            ${Number(pedido.total).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  No hay pedidos en este período
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Mensaje si no hay ventas */}
        {pedidosFiltrados.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-zinc-200 mt-6">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">
              No hay ventas registradas
            </h3>
            <p className="text-zinc-600">
              No se encontraron pedidos vendidos en el período seleccionado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}