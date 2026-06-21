/**
 * src/app/cotizaciones-pendientes/page.tsx
 */
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import CotizacionesPendientesClient from "./CotizacionesPendientesClient";

export default async function CotizacionesPendientesPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <CotizacionesPendientesClient />;
}