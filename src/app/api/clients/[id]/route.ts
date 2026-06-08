/**
 * src/app/api/clients/[id]/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const [rows] = await pool.query(
      `SELECT id_client, full_name, email, phone, address, created_at FROM Client WHERE id_client = ?`,
      [id]
    );
    const list = rows as unknown[];
    if (list.length === 0)
      return NextResponse.json({ ok: false, message: "Cliente no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, data: list[0] });
  } catch (e) {
    console.error("[GET /api/clients/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { full_name, email, phone, address } = body as Record<string, string>;
    if (!full_name?.trim())
      return NextResponse.json({ ok: false, message: "El nombre completo es obligatorio" }, { status: 400 });

    const [result] = await pool.query(
      `UPDATE Client SET full_name = ?, email = ?, phone = ?, address = ? WHERE id_client = ?`,
      [full_name.trim(), email || null, phone || null, address || null, id]
    );
    if ((result as { affectedRows: number }).affectedRows === 0)
      return NextResponse.json({ ok: false, message: "Cliente no encontrado" }, { status: 404 });

    const [rows] = await pool.query(
      `SELECT id_client, full_name, email, phone, address, created_at FROM Client WHERE id_client = ?`,
      [id]
    );
    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] });
  } catch (e) {
    console.error("[PUT /api/clients/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const [result] = await pool.query(
      "DELETE FROM Client WHERE id_client = ?",
      [id]
    );
    if ((result as { affectedRows: number }).affectedRows === 0)
      return NextResponse.json({ ok: false, message: "Cliente no encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true, data: { deleted: true, id_client: Number(id) } });
  } catch (e) {
    console.error("[DELETE /api/clients/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}