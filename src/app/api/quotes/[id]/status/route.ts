/**
 * src/app/api/quotes/[id]/status/route.ts
 *
 * PATCH /api/quotes/:id/status  → cambiar solo el estado de la cotización
 *
 * Body: { status: "pendiente" | "aceptada" | "rechazada" }
 */
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/apiResponse";

const VALID_STATUSES = ["pendiente", "aceptada", "rechazada"] as const;
type QuoteStatus = (typeof VALID_STATUSES)[number];

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json().catch(() => null);
  if (!body) return err("Body inválido");

  const { status } = body as { status: QuoteStatus };

  if (!status || !VALID_STATUSES.includes(status)) {
    return err(`status debe ser uno de: ${VALID_STATUSES.join(", ")}`);
  }

  const [existing] = await pool.query(
    "SELECT id_quote FROM quote WHERE id_quote = ?",
    [params.id]
  );
  if ((existing as unknown[]).length === 0) return err("Cotización no encontrada", 404);

  await pool.query("UPDATE quote SET status = ? WHERE id_quote = ?", [
    status,
    params.id,
  ]);

  return ok({ id_quote: Number(params.id), status });
}
