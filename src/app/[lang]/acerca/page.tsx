import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { pageMeta } from "@/lib/seo";
import { AboutEn } from "./en";
import Link from "@/components/Link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/acerca">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).pages.about;
  return pageMeta({ lang, path: "/acerca", title: t.metaTitle, description: t.metaDesc });
}

const A = "text-brass underline";

export default async function AboutPage() {
  const { lang } = await getT();
  if (lang === "en") return <AboutEn />;
  return (
    <LegalPage
      title="Acerca de DeadKeys"
      intro="Un proyecto de fans, gratuito y sin ánimo de lucro, que convierte datos públicos de Deadlock en páginas legibles."
    >
      <LegalSection title="Quién está detrás">
        <p>
          DeadKeys es un proyecto personal, no comercial y sin publicidad ni cuentas de usuario. Para cualquier consulta,
          corrección o petición de retirada de contenido escribe a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={A}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Sin afiliación con Valve">
        <p>
          DeadKeys es un proyecto independiente de aficionados. <strong>No está afiliado, patrocinado, respaldado ni
          aprobado por Valve Corporation</strong> y no debe entenderse como un producto oficial de Deadlock.
        </p>
        <p>
          Deadlock, Steam y sus logotipos son marcas comerciales o registradas de Valve Corporation en Estados Unidos y
          otros países. Los nombres, ilustraciones, iconos y demás material del juego (héroes, objetos, rangos, mapas)
          pertenecen a Valve y se muestran solo para identificar y describir el juego. Si Valve o cualquier otro titular
          quiere que se retire algún elemento, se retirará en cuanto se solicite.
        </p>
      </LegalSection>

      <LegalSection title="Origen de los datos">
        <ul>
          <li>
            <strong>Estadísticas, partidas, clasificaciones y parches:</strong>{" "}
            <a href="https://deadlock-api.com/" className={A} target="_blank" rel="noopener noreferrer">
              Deadlock API
            </a>
            , una API abierta y gratuita mantenida por la comunidad. No está afiliada a Valve, y DeadKeys no tiene relación
            con sus responsables más allá del uso de su API pública.
          </li>
          <li>
            <strong>Perfiles de Steam (nombre y avatar):</strong> datos públicos de Steam servidos a través de la Deadlock
            API.
          </li>
        </ul>
        <p>
          Estos datos pueden estar incompletos, desactualizados o contener errores. DeadKeys se ofrece «tal cual», sin
          garantías de disponibilidad ni exactitud.
        </p>
      </LegalSection>

      <LegalSection title="Escena competitiva">
        <p>
          DeadKeys no muestra datos de torneos ni de equipos profesionales: la sección Competitiva solo enlaza a{" "}
          <a href="https://liquipedia.net/deadlock" className={A} target="_blank" rel="noopener noreferrer">
            Liquipedia
          </a>
          , un proyecto independiente cuyo contenido se publica bajo licencia{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            className={A}
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-SA 3.0
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Marcas y contenido de terceros">
        <p>
          El nombre y el logotipo de DeadKeys son propios. Cualquier otro nombre, marca o imagen que aparezca en el sitio
          pertenece a sus respectivos propietarios, que no tienen relación con este proyecto.
        </p>
      </LegalSection>

      <LegalSection title="Datos personales">
        <p>
          Consulta la{" "}
          <Link href="/privacidad" className={A}>
            política de privacidad
          </Link>{" "}
          para saber qué datos de jugadores se muestran y cómo solicitar su retirada.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
