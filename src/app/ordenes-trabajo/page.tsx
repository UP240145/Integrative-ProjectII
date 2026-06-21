/**
 * src/app/ordenes-trabajo/page.tsx
 */
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import OrdenesTrabajoClient from "./OrdenesTrabajoClient";

export default async function OrdenesTrabajoPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <OrdenesTrabajoClient />;
}