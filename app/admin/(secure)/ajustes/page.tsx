import PasswordForm from "./password-form";
import ConsonantSettings from "./consonant-settings";
import FeedbackSettings from "./feedback-settings";
import { DEFAULT_ACTIVE_CONSONANTS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
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
      <section className="panel" style={{ maxWidth: 760, marginTop: 24 }}>
        <h2>Consonantes activas</h2>
        <p className="help-text">
          Se usarán como respuestas correctas y distractores. Debe haber al menos tres.
        </p>
        <ConsonantSettings
          initialValue={settings?.activeConsonants ?? [...DEFAULT_ACTIVE_CONSONANTS]}
        />
      </section>
      <section className="panel" style={{ maxWidth: 760, marginTop: 24 }}>
        <h2>Tiempo de retroalimentación</h2>
        <p className="help-text">
          La respuesta incorrecta permanece más tiempo para poder escuchar y reconocer la letra.
        </p>
        <FeedbackSettings
          initialCorrectMs={settings?.feedbackDelayMs ?? 900}
          initialIncorrectMs={settings?.incorrectFeedbackDelayMs ?? 2200}
        />
      </section>
    </>
  );
}
