/**
 * src/app/inventario/page.tsx
 */
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import InventarioClient from "./InventarioClient";

export default async function InventarioPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <InventarioClient />;
}