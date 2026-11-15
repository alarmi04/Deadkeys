import type { Metadata, Viewport } from "next";
import { Josefin_Sans, Poiret_One } from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CookieConsent, CookieSettingsButton } from "@/components/CookieConsent";
import { JsonLd } from "@/components/JsonLd";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import Link from "@/components/Link";
import { NavLinks } from "@/components/NavLinks";
import { I18nProvider } from "@/i18n/client";
import { OG_LOCALE, isLocale, locales } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { CONTACT_EMAIL, GA_ID, SITE_URL, absoluteUrl } from "@/lib/site";
import "../globals.css";

const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const poiret = Poiret_One({
  variable: "--font-poiret",
  subsets: ["latin"],
  weight: "400",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const c = getMessages(lang).common;
  const title = `${c.siteName} · ${c.tagline}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${c.siteName}` },
    description: c.description,
    applicationName: c.siteName,
    keywords: c.keywords,
    openGraph: { type: "website", siteName: c.siteName, locale: OG_LOCALE[lang], title, description: c.description },
    twitter: { card: "summary_large_image", title, description: c.description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#170809",
  colorScheme: "dark",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const c = getMessages(lang).common;

  const siteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: absoluteUrl(`/${lang}`),
        name: c.siteName,
        alternateName: `${c.siteName} · ${c.tagline}`,
        description: c.description,
        inLanguage: lang,
        publisher: { "@id": absoluteUrl("/#organization") },
      },
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: c.siteName,
        url: absoluteUrl("/"),
        logo: absoluteUrl("/icon.svg"),
      },
    ],
  };

  return (
    <html lang={lang} className={`${josefin.variable} ${poiret.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <I18nProvider lang={lang}>
          <JsonLd data={siteJsonLd} />
          <header className="border-b border-brass-dim">
            <nav
              aria-label={c.nav.main}
              className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-4 sm:px-8"
            >
              <Link
                href="/"
                className="mr-auto flex items-center gap-3 font-display text-[1.65rem] tracking-[0.14em] text-brass no-underline"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="" width={40} height={40} className="size-10" />
                DEADKEYS
              </Link>
              <Suspense fallback={null}>
                <NavLinks />
              </Suspense>
              <Suspense fallback={null}>
                <LanguageSwitcher />
              </Suspense>
            </nav>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="mt-24 border-t border-brass-dim">
            <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 py-8 text-sm text-ivory-dim sm:flex-row sm:justify-between sm:px-8">
              <p>
                {c.footer.fanProject}{" "}
                <a href="https://deadlock-api.com/" className="text-brass underline">
                  deadlock-api.com
                </a>
                .
              </p>
              <p>
                {c.footer.trademarks}{" "}
                <Link href="/acerca" className="text-brass underline">
                  {c.footer.about}
                </Link>{" "}
                ·{" "}
                <Link href="/privacidad" className="text-brass underline">
                  {c.footer.privacy}
                </Link>{" "}
                ·{" "}
                {GA_ID && (
                  <>
                    <CookieSettingsButton className="text-brass underline" /> ·{" "}
                  </>
                )}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-brass underline">
                  {c.footer.contact}
                </a>
              </p>
            </div>
          </footer>
          <CookieConsent />
        </I18nProvider>
      </body>
    </html>
  );
}
