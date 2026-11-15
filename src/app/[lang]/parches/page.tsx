import { ScrollIcon } from "@/components/Icons";
import type { Metadata } from "next";
import { isLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getMessages, getT } from "@/i18n/server";
import { makeFormat } from "@/lib/format";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import { Unavailable } from "@/components/Unavailable";
import { getPatches, safe, type Patch } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[lang]/parches">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).patches;
  return pageMeta({ lang, path: "/parches", title: t.metaTitle, description: t.metaDesc });
}

type T = Messages["patches"];

/** Los textos de Valve están en inglés: se marca su idioma solo cuando la página no lo está. */
const sourceLang = (lang: Locale) => (lang === "en" ? undefined : "en");

/** Enlace de salida: va siempre a la publicación original (Steam o foro oficial). */
const linkLabel = (p: Patch, t: T) => (p.source === "steam" ? t.readSteam : t.readForum);

function External() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7.5 8.5" />
    </svg>
  );
}

function Featured({ p, t, lang, date }: { p: Patch; t: T; lang: Locale; date: (d: string) => string }) {
  return (
    <article className="deco-frame mt-8 grid bg-ox-deep/60 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <div className="flex flex-col gap-4 p-8 sm:p-12 md:order-1">
        <p className="text-sm uppercase tracking-[0.14em] text-ivory-dim">
          <time dateTime={p.date}>{date(p.date)}</time> · {t.kind[p.kind]} · {t.latest}
        </p>
        <h2 lang={sourceLang(lang)} className="max-w-[22ch] font-display text-[clamp(1.8rem,1.2rem+2vw,2.8rem)] leading-[1.08] tracking-[0.08em] text-balance text-ivory">
          {p.title}
        </h2>
        {p.excerpt && <p lang={sourceLang(lang)} className="max-w-[58ch] text-ivory-dim">{p.excerpt}</p>}
        <a
          href={p.link}
          target="_blank"
          rel="noopener noreferrer"
          className="tier-btn tier-btn-primary mt-2 inline-flex w-fit items-center gap-2 no-underline"
        >
          {linkLabel(p, t)}
          <External />
          <span className="sr-only">{t.newTab}</span>
        </a>
      </div>
      {p.image && (
        <div className="relative min-h-56 border-t border-brass-dim md:order-2 md:min-h-full md:border-t-0 md:border-l">
          <Image
            src={p.image}
            alt=""
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
            priority
          />
        </div>
      )}
    </article>
  );
}

function Row({ p, t, lang, date }: { p: Patch; t: T; lang: Locale; date: (d: string) => string }) {
  return (
    <li className="border-b border-brass-dim/40">
      <a
        href={p.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid gap-x-6 gap-y-1 py-5 no-underline sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
      >
        <time dateTime={p.date} className="pt-1 text-sm uppercase tracking-[0.1em] text-brass">
          {date(p.date)}
        </time>
        <div className="min-w-0">
          <h3 className="text-lg leading-snug text-ivory group-hover:text-brass">
            <span lang={sourceLang(lang)}>{p.title}</span>
            <span className="ml-3 align-middle text-xs uppercase tracking-[0.12em] text-ivory-dim">{t.kind[p.kind]}</span>
          </h3>
          {p.excerpt && <p lang={sourceLang(lang)} className="mt-1 line-clamp-2 max-w-[70ch] text-[0.95rem] text-ivory-dim">{p.excerpt}</p>}
        </div>
        <span className="inline-flex items-center gap-1.5 pt-1 text-sm text-brass group-hover:text-ivory sm:justify-self-end">
          {linkLabel(p, t)}
          <External />
          <span className="sr-only">{t.newTab}</span>
        </span>
      </a>
    </li>
  );
}

export default async function PatchesPage() {
  const m = await getT();
  const t = m.patches;
  const { date } = makeFormat(m.lang);
  const monthFmt = new Intl.DateTimeFormat(m.lang === "es" ? "es-ES" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: m.lang === "es" ? "Europe/Madrid" : "UTC",
  });
  const patches = await safe(getPatches(30));
  const [latest, ...rest] = patches ?? [];

  const months: { label: string; items: Patch[] }[] = [];
  for (const p of rest) {
    const label = monthFmt.format(new Date(p.date));
    const last = months.at(-1);
    if (last?.label === label) last.items.push(p);
    else months.push({ label, items: [p] });
  }

  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-12 sm:px-8">
      <PageHeader title={t.title} intro={t.intro} />
      {latest ? (
        <>
          <Featured p={latest} t={t} lang={m.lang} date={date} />
          {months.map((mo) => (
            <section key={mo.label} className="mt-12">
              <h2 className="section-title capitalize"><ScrollIcon />{mo.label}</h2>
              <ul className="mt-2">
                {mo.items.map((p) => (
                  <Row key={p.link} p={p} t={t} lang={m.lang} date={date} />
                ))}
              </ul>
            </section>
          ))}
        </>
      ) : (
        <div className="mt-8">
          <Unavailable what={t.what} />
        </div>
      )}
    </main>
  );
}
