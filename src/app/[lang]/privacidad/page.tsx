import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { pageMeta } from "@/lib/seo";
import { PrivacyEn } from "./en";
import Link from "@/components/Link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacidad">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).pages.privacy;
  return pageMeta({ lang, path: "/privacidad", title: t.metaTitle, description: t.metaDesc });
}

const A = "text-brass underline";

export default async function PrivacyPage() {
  const { lang } = await getT();
  if (lang === "en") return <PrivacyEn />;
  const mail = (
    <a href={`mailto:${CONTACT_EMAIL}`} className={A}>
      {CONTACT_EMAIL}
    </a>
  );

  return (
    <LegalPage
      title="Privacidad"
      intro="Qué datos se muestran, de dónde salen, qué guarda tu navegador y cómo pedir que se retire algo."
    >
      <LegalSection title="Responsable y contacto">
        <p>
          DeadKeys es un proyecto personal sin ánimo de lucro. Para ejercer tus derechos o resolver cualquier duda sobre
          datos personales escribe a {mail}.
        </p>
      </LegalSection>

      <LegalSection title="Datos de jugadores que se muestran">
        <p>
          Al buscar un jugador o abrir un perfil, DeadKeys muestra información que ya es pública: nombre y avatar de
          Steam, identificador de cuenta, rango, héroes más jugados e historial de partidas. DeadKeys{" "}
          <strong>no almacena</strong> estos datos en una base de datos propia: los pide en el momento a la Deadlock API
          y puede conservarlos en una caché temporal del servidor para no repetir peticiones.
        </p>
        <p>
          Los datos proceden de Steam y de la Deadlock API. Si quieres cambiarlos en origen, modifica tu perfil de Steam
          o la privacidad de tu cuenta.
        </p>
      </LegalSection>

      <LegalSection title="Retirada de datos y derechos">
        <p>
          Si eres un jugador y no quieres que tu perfil aparezca en DeadKeys, escribe a {mail} indicando tu nombre de
          Steam o tu identificador de cuenta. Puedes pedir el acceso, la rectificación, la supresión o la oposición al
          tratamiento de tus datos. Se responderá en un plazo máximo de un mes y, si procede, tu perfil dejará de
          mostrarse.
        </p>
        <p>
          La base jurídica es el interés legítimo en ofrecer estadísticas públicas de un videojuego (art. 6.1.f del
          RGPD). Si consideras que el tratamiento no es correcto, puedes reclamar ante la autoridad de control de tu país
          (en España, la{" "}
          <a href="https://www.aepd.es/" className={A} target="_blank" rel="noopener noreferrer">
            AEPD
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="Cookies y analítica">
        <p>
          DeadKeys <strong>no usa cookies, ni publicidad, ni herramientas de analítica o seguimiento</strong>, por lo que
          no muestra un aviso de cookies.
        </p>
        <p>
          La única información que se guarda en tu navegador (almacenamiento local) es la tier list que montas en la
          herramienta de tier lists, para que no se pierda al recargar, y los últimos jugadores que consultas en el
          tracker (nombre, ID y avatar), para que puedas volver a ellos con un clic. Se queda en tu dispositivo, no se
          envía a ningún servidor y puedes borrarla desde los ajustes del navegador.
        </p>
      </LegalSection>

      <LegalSection title="Servicios de terceros">
        <p>
          Para mostrar la página se cargan imágenes desde servidores de terceros, que reciben tu dirección IP y los datos
          técnicos habituales de una petición web:
        </p>
        <ul>
          <li>Imágenes del juego (héroes, objetos, rangos): Deadlock API.</li>
          <li>Avatares de Steam y noticias de parches: servidores de Valve (steamstatic.com).</li>
        </ul>
        <p>
          Las tipografías están incluidas en el propio sitio y no se descargan de Google. El alojamiento puede conservar
          registros técnicos de acceso (IP, fecha, página) con fines de seguridad y funcionamiento.
        </p>
      </LegalSection>

      <LegalSection title="Más información">
        <p>
          Consulta{" "}
          <Link href="/acerca" className={A}>
            Acerca de
          </Link>{" "}
          para conocer el origen de los datos y la ausencia de relación con Valve.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
