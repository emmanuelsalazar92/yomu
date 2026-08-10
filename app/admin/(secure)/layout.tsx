import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdminId } from "@/lib/security";
import LogoutButton from "./logout-button";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await currentAdminId())) redirect("/admin/login");
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <Link className="brand" href="/admin">
          <span className="brand-mark">よ</span> Yomu
        </Link>
        <nav className="admin-links" aria-label="Administración">
          <Link href="/admin">Resumen</Link>
          <Link href="/admin/palabras">Palabras</Link>
          <Link href="/admin/perfiles">Perfiles</Link>
          <Link href="/admin/categorias">Categorías</Link>
          <Link href="/admin/progreso">Progreso</Link>
          <Link href="/admin/ajustes">Ajustes</Link>
          <LogoutButton />
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
