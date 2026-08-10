import { beforeAll, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/security";
describe("sesiones administrativas", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = "una-frase-de-prueba-con-mas-de-treinta-y-dos-caracteres";
  });
  it("firma y verifica una sesión", () => {
    const token = createSessionToken("admin-1");
    expect(verifySessionToken(token)).toBe("admin-1");
  });
  it("rechaza manipulaciones", () => {
    const token = createSessionToken("admin-1");
    expect(verifySessionToken(`${token}x`)).toBeNull();
  });
});
