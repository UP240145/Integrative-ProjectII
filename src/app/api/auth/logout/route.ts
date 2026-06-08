/**
 * src/app/api/auth/logout/route.ts
 *
 * POST /api/auth/logout
 */
import { destroySession } from "@/lib/session";
import { ok } from "@/lib/apiResponse";

export async function POST() {
  await destroySession();
  return ok({ message: "Sesión cerrada" });
}
