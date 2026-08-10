import Link from "next/link";
import LoginForm from "./login-form";
export const metadata = { title: "Acceso adulto" };
export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <Link className="brand" href="/">
          <span className="brand-mark">よ</span> Yomu
        </Link>
        <p className="eyebrow" style={{ marginTop: 30 }}>
          Zona de adultos
        </p>
        <h1>Bienvenido de nuevo</h1>
        <p className="help-text">Ingresa para preparar palabras y revisar el progreso.</p>
        <LoginForm />
      </section>
    </main>
  );
}
