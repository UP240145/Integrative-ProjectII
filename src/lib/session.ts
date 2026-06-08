/**
 * src/lib/session.ts
 *
 * Manejo de sesión con cookies firmadas (jose JWT).
 * No requiere dependencias extra — usa la Web Crypto API
 * que Next.js ya incluye en el Edge/Node runtime.
 */
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "cm_session";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "cambia_este_secreto_en_produccion_32chars"
);

export interface SessionPayload {
  id_admin: number;
  email: string;
}

/** Crea la cookie de sesión firmada. */
export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(SECRET);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 horas
    path: "/",
  });
}

/** Lee y verifica la cookie. Retorna el payload o null. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Elimina la cookie de sesión. */
export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
