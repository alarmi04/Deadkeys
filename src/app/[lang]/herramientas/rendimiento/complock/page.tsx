import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { pageMeta } from "@/lib/seo";
import { CopyBlock } from "@/components/CopyBlock";
import { PageHeader } from "@/components/PageHeader";

export async function generateMetadata({ params }: PageProps<"/[lang]/herramientas/rendimiento/complock">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).pages.perf;
  return pageMeta({ lang, path: "/herramientas/rendimiento/complock", title: t.metaTitle, description: t.metaDesc });
}

const LAUNCH_OPTIONS =
  "-console -high -nojoy +fps_max 0 -no_prewarm_map -nosteamcontroller -nohltv -particles -softparticlesdefaultoff -particle_disable_diffuse";

const FLAGS = [
  "-console",
  "-high",
  "-nojoy",
  "+fps_max 0",
  "-no_prewarm_map",
  "-nosteamcontroller",
  "-nohltv",
  "-particles",
  "-softparticlesdefaultoff",
  "-particle_disable_diffuse",
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-brass-dim/50 py-6">
      <span className="font-display text-3xl leading-none text-brass">{n}</span>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-ivory">{title}</h3>
        <div className="space-y-3 text-ivory-dim">{children}</div>
      </div>
    </li>
  );
}

export default async function PerformancePage() {
  const t = (await getT()).pages.perf;
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <PageHeader title={t.title} intro={t.intro} />

      <section className="mt-10 max-w-[78ch]" aria-labelledby="complock">
        <h2 id="complock" className="section-title">
          Complock
        </h2>
        <p className="mt-3 text-ivory-dim">
          {t.about}
        </p>

        <ol className="mt-4">
          <Step n={1} title={t.step1}>
            <p>
              {t.step1a}{" "}
              <a href="https://deadlockconfig.com/" target="_blank" rel="noreferrer" className="text-brass underline">
                deadlockconfig.com
              </a>
              {t.step1b} <b className="text-ivory">game</b> → <b className="text-ivory">citadel</b> {t.step1c}{" "}
              <b className="text-ivory">addons</b>
              {t.step1d}
            </p>
            <CopyBlock label={t.path} text="Deadlock\game\citadel\addons" />
            <p className="text-sm">{t.openFolder}</p>
          </Step>

          <Step n={2} title={t.step2}>
            <p>{t.step2a}</p>
            <CopyBlock label={t.launchOptions} text={LAUNCH_OPTIONS} />
          </Step>
        </ol>

        <h3 className="mt-8 text-lg font-semibold text-ivory">{t.whatEach}</h3>
        <dl className="mt-3 grid gap-x-8 sm:grid-cols-[max-content_1fr]">
          {FLAGS.map((flag) => (
            <div key={flag} className="contents">
              <dt className="border-b border-brass-dim/50 pt-2 font-mono text-sm text-brass sm:py-2">{flag}</dt>
              <dd className="border-b border-brass-dim/50 pb-2 text-ivory-dim sm:py-2">{t.params[flag]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
