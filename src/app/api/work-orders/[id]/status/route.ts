/**
 * src/app/api/work-orders/[id]/status/route.ts
 *
 * PATCH /api/work-orders/:id/status
 *
 * Body: { status: "pendiente" | "en_proceso" | "completada" | "cancelada" }
 */
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/apiResponse";

const VALID_STATUSES = ["pendiente", "en_proceso", "completada", "cancelada"] as const;
type WorkOrderStatus = (typeof VALID_STATUSES)[number];

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json().catch(() => null);
  if (!body) return err("Body inválido");

  const { status } = body as { status: WorkOrderStatus };

  if (!status || !VALID_STATUSES.includes(status)) {
    return err(`status debe ser uno de: ${VALID_STATUSES.join(", ")}`);
  }

  const [result] = await pool.query(
    "UPDATE work_orders SET status = ? WHERE id_work_order = ?",
    [status, params.id]
  );

  if ((result as { affectedRows: number }).affectedRows === 0) {
    return err("Orden de trabajo no encontrada", 404);
  }

  return ok({ id_work_order: Number(params.id), status });
}
