import { NextResponse } from "next/server";
import { assertSameOrigin, clearAdminCookie } from "@/lib/security";
export async function POST() {
  try {
    await assertSameOrigin();
    await clearAdminCookie();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
}
