import { describe, expect, it, vi } from "vitest";
import { createClientUuid } from "@/lib/client-uuid";

describe("UUID compatible con navegadores", () => {
  it("usa randomUUID cuando está disponible", () => {
    const randomUUID = vi.fn(() => "123e4567-e89b-42d3-a456-426614174000");
    expect(
      createClientUuid({
        randomUUID,
        getRandomValues: (value) => value
      })
    ).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("genera un UUID v4 con getRandomValues en Safari antiguo", () => {
    const uuid = createClientUuid({
      getRandomValues: (value) => {
        if (value instanceof Uint8Array) value.fill(0);
        return value;
      }
    });
    expect(uuid).toBe("00000000-0000-4000-8000-000000000000");
  });
});
