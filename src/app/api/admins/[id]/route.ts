/**
 * src/app/api/admins/[id]/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

interface Params { params: Promise<{ id: string }> }

// ── GET /api/admins/:id ───────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const [rows] = await pool.query(
      "SELECT id_admin, email, created_at FROM Admin WHERE id_admin = ?",
      [id]
    );
    const list = rows as unknown[];
    if (list.length === 0)
      return NextResponse.json({ ok: false, message: "Admin no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, data: list[0] });
  } catch (e) {
    console.error("[GET /api/admins/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── PUT /api/admins/:id ───────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body)
      return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { email, password } = body as { email?: string; password?: string };

    if (!email?.trim() && !password?.trim())
      return NextResponse.json({ ok: false, message: "Debes enviar email o contraseña" }, { status: 400 });

    const [existing] = await pool.query(
      "SELECT id_admin FROM Admin WHERE id_admin = ?", [id]
    );
    if ((existing as unknown[]).length === 0)
      return NextResponse.json({ ok: false, message: "Admin no encontrado" }, { status: 404 });

    if (email?.trim()) {
      const [dup] = await pool.query(
        "SELECT id_admin FROM Admin WHERE email = ? AND id_admin <> ?",
        [email.trim().toLowerCase(), id]
      );
      if ((dup as unknown[]).length > 0)
        return NextResponse.json({ ok: false, message: "Ese correo ya está en uso" }, { status: 409 });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (email?.trim()) {
      fields.push("email = ?");
      values.push(email.trim().toLowerCase());
    }
    if (password?.trim()) {
      if (password.length < 6)
        return NextResponse.json({ ok: false, message: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
      fields.push("password = ?");
      values.push(await bcrypt.hash(password, 12));
    }

    values.push(id);
    await pool.query(`UPDATE Admin SET ${fields.join(", ")} WHERE id_admin = ?`, values);

    const [rows] = await pool.query(
      "SELECT id_admin, email, created_at FROM Admin WHERE id_admin = ?", [id]
    );
    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] });
  } catch (e) {
    console.error("[PUT /api/admins/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── DELETE /api/admins/:id ────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const session = await getSession();
    if (session?.id_admin === Number(id))
      return NextResponse.json({ ok: false, message: "No puedes eliminar tu propia cuenta" }, { status: 400 });

    const [count] = await pool.query("SELECT COUNT(*) AS n FROM Admin");
    const total = (count as { n: number }[])[0].n;
    if (total <= 1)
      return NextResponse.json({ ok: false, message: "No puedes eliminar el único administrador" }, { status: 400 });

    const [result] = await pool.query("DELETE FROM Admin WHERE id_admin = ?", [id]);
    if ((result as { affectedRows: number }).affectedRows === 0)
      return NextResponse.json({ ok: false, message: "Admin no encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true, data: { deleted: true, id_admin: Number(id) } });
  } catch (e) {
    console.error("[DELETE /api/admins/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}