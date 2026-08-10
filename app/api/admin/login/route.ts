import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin, setAdminCookie } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

const attempts = new Map<string, { count: number; reset: number }>();
export async function POST(request: Request) {
  try {
    await assertSameOrigin();
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const key = forwarded || "local";
    const now = Date.now();
    const rate = attempts.get(key);
    if (rate && rate.reset > now && rate.count >= 8)
      return NextResponse.json(
        { error: "Espera antes de intentar de nuevo." },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    if (!rate || rate.reset <= now) attempts.set(key, { count: 1, reset: now + 15 * 60_000 });
    else rate.count++;
    const input = loginSchema.parse(await request.json());
    const user = await prisma.adminUser.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !(await compare(input.password, user.passwordHash)))
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    attempts.delete(key);
    await setAdminCookie(user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
}
