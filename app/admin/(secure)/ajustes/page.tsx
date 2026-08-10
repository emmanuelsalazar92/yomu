import PasswordForm from "./password-form";
export default function SettingsPage() {
  return (
    <>
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Seguridad</p>
          <h1>Ajustes</h1>
        </div>
      </div>
      <section className="panel" style={{ maxWidth: 560 }}>
        <h2>Cambiar contraseña</h2>
        <PasswordForm />
      </section>
    </>
  );
}
