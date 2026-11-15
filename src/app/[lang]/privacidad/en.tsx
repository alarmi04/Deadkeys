import Link from "@/components/Link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

const A = "text-brass underline";

export function PrivacyEn() {
  const mail = (
    <a href={`mailto:${CONTACT_EMAIL}`} className={A}>
      {CONTACT_EMAIL}
    </a>
  );

  return (
    <LegalPage
      title="Privacy"
      intro="What data is shown, where it comes from, what your browser stores and how to ask for something to be removed."
    >
      <LegalSection title="Controller and contact">
        <p>
          DeadKeys is a personal, non-profit project. To exercise your rights or resolve any question about personal
          data, write to {mail}.
        </p>
      </LegalSection>

      <LegalSection title="Player data that is shown">
        <p>
          When you search for a player or open a profile, DeadKeys shows information that is already public: Steam name
          and avatar, account ID, rank, most played heroes and match history. DeadKeys{" "}
          <strong>does not store</strong> this data in its own database: it requests it on the spot from the Deadlock
          API and may keep it in a temporary server cache to avoid repeating requests.
        </p>
        <p>
          The data comes from Steam and the Deadlock API. If you want to change it at the source, edit your Steam
          profile or your account privacy settings.
        </p>
      </LegalSection>

      <LegalSection title="Data removal and rights">
        <p>
          If you are a player and do not want your profile to appear on DeadKeys, write to {mail} stating your Steam
          name or account ID. You may request access, rectification, erasure or objection to the processing of your
          data. We will reply within one month at most and, where appropriate, your profile will stop being shown.
        </p>
        <p>
          The legal basis is the legitimate interest in providing public statistics for a video game (art. 6.1.f GDPR).
          If you believe the processing is not correct, you may lodge a complaint with the supervisory authority of your
          country (in Spain, the{" "}
          <a href="https://www.aepd.es/" className={A} target="_blank" rel="noopener noreferrer">
            AEPD
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="Cookies and analytics">
        <p>
          DeadKeys <strong>does not use cookies, advertising, or analytics or tracking tools</strong>, so it does not
          show a cookie notice.
        </p>
        <p>
          The only information stored in your browser (local storage) is the tier list you build in the tier list tool,
          so it isn&apos;t lost on reload, and the last players you looked up in the tracker (name, ID and avatar), so you can
          go back to them with one click. It stays on your device, is not sent to any server and you can delete it from
          your browser settings.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          To display the page, images are loaded from third-party servers, which receive your IP address and the usual
          technical data of a web request:
        </p>
        <ul>
          <li>Game images (heroes, items, ranks): Deadlock API.</li>
          <li>Steam avatars and patch news: Valve servers (steamstatic.com).</li>
        </ul>
        <p>
          Fonts are included in the site itself and are not downloaded from Google. The hosting provider may keep
          technical access logs (IP, date, page) for security and operational purposes.
        </p>
      </LegalSection>

      <LegalSection title="More information">
        <p>
          See{" "}
          <Link href="/acerca" className={A}>
            About
          </Link>{" "}
          to learn where the data comes from and that there is no relationship with Valve.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
