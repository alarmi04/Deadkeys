import Link from "@/components/Link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

const A = "text-brass underline";

export function AboutEn() {
  return (
    <LegalPage
      title="About DeadKeys"
      intro="A free, non-profit fan project that turns public Deadlock data into readable pages."
    >
      <LegalSection title="Who is behind it">
        <p>
          DeadKeys is a personal, non-commercial project with no advertising or user accounts. For any question,
          correction or content removal request, write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={A}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Not affiliated with Valve">
        <p>
          DeadKeys is an independent fan project. <strong>It is not affiliated with, sponsored, endorsed or approved by
          Valve Corporation</strong> and should not be understood as an official Deadlock product.
        </p>
        <p>
          Deadlock, Steam and their logos are trademarks or registered trademarks of Valve Corporation in the United
          States and other countries. The names, artwork, icons and other game material (heroes, items, ranks, maps)
          belong to Valve and are shown only to identify and describe the game. If Valve or any other rights holder
          wants an element removed, it will be removed as soon as it is requested.
        </p>
      </LegalSection>

      <LegalSection title="Where the data comes from">
        <ul>
          <li>
            <strong>Stats, matches, leaderboards and patches:</strong>{" "}
            <a href="https://deadlock-api.com/" className={A} target="_blank" rel="noopener noreferrer">
              Deadlock API
            </a>
            , a free, open API maintained by the community. It is not affiliated with Valve, and DeadKeys has no
            relationship with its maintainers beyond using its public API.
          </li>
          <li>
            <strong>Steam profiles (name and avatar):</strong> public Steam data served through the Deadlock API.
          </li>
        </ul>
        <p>
          This data may be incomplete, outdated or contain errors. DeadKeys is provided “as is”, with no guarantee of
          availability or accuracy.
        </p>
      </LegalSection>

      <LegalSection title="Competitive scene">
        <p>
          DeadKeys does not show tournament or pro team data: the Competitive section only links to{" "}
          <a href="https://liquipedia.net/deadlock" className={A} target="_blank" rel="noopener noreferrer">
            Liquipedia
          </a>
          , an independent project whose content is published under the{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            className={A}
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-SA 3.0
          </a>{" "}
          license.
        </p>
      </LegalSection>

      <LegalSection title="Trademarks and third-party content">
        <p>
          The DeadKeys name and logo are our own. Any other name, brand or image that appears on the site belongs to
          its respective owners, who have no relationship with this project.
        </p>
      </LegalSection>

      <LegalSection title="Personal data">
        <p>
          See the{" "}
          <Link href="/privacidad" className={A}>
            privacy policy
          </Link>{" "}
          to find out which player data is shown and how to request its removal.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
