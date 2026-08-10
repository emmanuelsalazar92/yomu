"use client";
import { useRouter } from "next/navigation";
export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      style={{
        minHeight: 48,
        border: 0,
        borderRadius: 13,
        background: "transparent",
        color: "#dfe8e5",
        textAlign: "left",
        padding: "0 14px",
        fontWeight: 700
      }}
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
