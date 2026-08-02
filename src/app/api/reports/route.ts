/**
 * src/app/api/reports/route.ts
 *
 * GET /api/reports?month=2024-06
 *
 * Devuelve los 3 reportes del mes:
 *   - inventory:  materiales usados en cotizaciones del mes
 *   - sales:      órdenes de trabajo completadas (ganancias)
 *   - appointments: citas de medición e instalación realizadas
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// El margen de ganancia aplicado al precio sugerido
const PROFIT_MARGIN = 0.10;

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ ok: false, message: "month requerido (YYYY-MM)" }, { status: 400 });
    }

    const monthPattern = `${month}%`;

    // ── 1. REPORTE DE INVENTARIO ──────────────────────────────────────────────
    // Materiales usados en cotizaciones creadas en el mes
    const [materialRows] = await pool.query(
      `SELECT
         i.name                          AS material_name,
         SUM(qm.calculated_quantity)     AS total_m2_used,
         COUNT(DISTINCT qm.id_quote)     AS quote_count,
         i.price                         AS price_per_plate,
         i.stock_quantity                AS current_stock,
         i.min_stock_alert
       FROM quote_materials qm
       JOIN Inventory i ON i.id_wood = qm.id_wood
       JOIN Quote q ON q.id_quote = qm.id_quote
       WHERE q.created_at LIKE ?
       GROUP BY i.id_wood, i.name, i.price, i.stock_quantity, i.min_stock_alert
       ORDER BY total_m2_used DESC`,
      [monthPattern]
    );

    // ── 2. REPORTE DE VENTAS ──────────────────────────────────────────────────
    // Órdenes completadas en el mes (updated_at = cuando se marcaron como completadas)
    const [salesRows] = await pool.query(
      `SELECT
         wo.id_work_order,
         c.full_name,
         q.furniture_type,
         q.material,
         q.width, q.height, q.depth,
         q.final_price,
         q.calculated_cost,
         wo.updated_at
       FROM work_orders wo
       JOIN Quote   q ON q.id_quote   = wo.id_quote
       JOIN Client  c ON c.id_client  = q.id_client
       WHERE wo.status = 'completada'
         AND wo.updated_at LIKE ?
       ORDER BY wo.updated_at DESC`,
      [monthPattern]
    );

    // Calcular ganancias por orden
    // - calculated_cost = precio sugerido guardado al momento de cotizar (incluye margen 10%)
    // - cost_base       = calculated_cost / 1.10  → costo real sin margen
    // - profit          = final_price - cost_base → lo que realmente se ganó
    const sales = (salesRows as Record<string, unknown>[]).map((row) => {
      const finalPrice       = parseFloat(String(row.final_price));
      const calculatedCost   = parseFloat(String(row.calculated_cost ?? 0));
      // Si calculated_cost es 0 (cotizaciones antiguas), usamos final_price como base
      const suggestedPriceVal = calculatedCost > 0 ? calculatedCost : finalPrice;
      const costBase         = Math.round(suggestedPriceVal / (1 + PROFIT_MARGIN));
      const profit           = Math.round(finalPrice - costBase);

      return {
        id_work_order:   row.id_work_order,
        full_name:       row.full_name,
        furniture_type:  row.furniture_type,
        material:        row.material,
        final_price:     finalPrice,
        suggested_price: suggestedPriceVal,
        cost_base:       costBase,
        profit:          profit,
        updated_at:      row.updated_at,
      };
    });

    const salesSummary = {
      total_orders:    sales.length,
      total_revenue:   sales.reduce((s, r) => s + r.final_price,    0),
      total_profit:    sales.reduce((s, r) => s + r.profit,         0),
      total_cost_base: sales.reduce((s, r) => s + r.cost_base,      0),
      orders:          sales,
    };

    // ── 3. REPORTE DE CITAS ───────────────────────────────────────────────────
    const [apptRows] = await pool.query(
      `SELECT
         appointment_type,
         COUNT(*) AS count,
         DATE_FORMAT(appointment_date, '%Y-%m-%d') AS appt_date
       FROM appointments
       WHERE appointment_date LIKE ?
         AND appointment_type IN ('medir', 'instalar')
       GROUP BY appointment_type, appt_date
       ORDER BY appt_date ASC`,
      [monthPattern]
    );

    const appts = apptRows as { appointment_type: string; count: number; appt_date: string }[];

    const apptSummary = {
      medir:    { count: 0, dates: [] as string[] },
      instalar: { count: 0, dates: [] as string[] },
    };
    for (const a of appts) {
      const type = a.appointment_type as "medir" | "instalar";
      if (apptSummary[type]) {
        apptSummary[type].count += Number(a.count);
        for (let i = 0; i < Number(a.count); i++) {
          apptSummary[type].dates.push(a.appt_date);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        month,
        inventory: materialRows,
        sales:     salesSummary,
        appointments: apptSummary,
      },
    });
  } catch (e) {
    console.error("[GET /api/reports]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}