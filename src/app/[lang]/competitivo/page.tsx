import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/competitivo">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).pages.competitive;
  return pageMeta({ lang, path: "/competitivo", title: t.metaTitle, description: t.metaDesc });
}

function Sunburst() {
  const rays = Array.from({ length: 25 }, (_, i) => {
    const a = Math.PI + (Math.PI * i) / 24;
    return { x: 300 + Math.cos(a) * 640, y: 600 + Math.sin(a) * 640 };
  });
  return (
    <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1">
        {rays.map((r, i) => (
          <line key={i} x1="300" y1="600" x2={r.x} y2={r.y} />
        ))}
        {[90, 160, 240, 330, 430].map((r) => (
          <path key={r} d={`M ${300 - r} 600 A ${r} ${r} 0 0 1 ${300 + r} 600`} />
        ))}
      </g>
    </svg>
  );
}

function Lattice() {
  return (
    <svg className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <pattern id="lattice" width="72" height="72" patternUnits="userSpaceOnUse">
          <path d="M36 0 L72 36 L36 72 L0 36 Z M36 14 L58 36 L36 58 L14 36 Z" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lattice)" />
    </svg>
  );
}

export default async function CompetitivePage() {
  const t = (await getT()).pages.competitive;
  const PANELS = [
    { href: "https://liquipedia.net/deadlock/Portal:Tournaments", ...t.tournaments, art: <Sunburst /> },
    { href: "https://liquipedia.net/deadlock", ...t.wiki, art: <Lattice /> },
  ];
  return (
    <main className="flex min-h-[calc(100svh-4.6rem)] flex-col">
      <h1 className="sr-only">{t.h1}</h1>
      <ul className="grid flex-1 md:grid-cols-2">
        {PANELS.map((p, i) => (
          <li key={p.href} className={`group relative isolate min-h-[50svh] ${i === 0 ? "md:border-r md:border-brass-dim" : ""}`}>
            <div
              className="absolute inset-0 -z-10 bg-ox-deep text-brass opacity-[0.14] transition-opacity duration-500 ease-out group-hover:opacity-[0.28] group-has-[:focus-visible]:opacity-[0.28]"
              style={{
                maskImage: "radial-gradient(ellipse at 50% 60%, #000 25%, transparent 80%)",
                WebkitMaskImage: "radial-gradient(ellipse at 50% 60%, #000 25%, transparent 80%)",
              }}
            >
              {p.art}
            </div>
            <div className="absolute inset-5 sm:inset-8">
            <a
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="deco-frame flex h-full flex-col items-center justify-center gap-4 p-8 text-center no-underline"
            >
              <span className="font-display text-[clamp(2rem,1.2rem+2.6vw,3.4rem)] leading-tight tracking-[0.08em] text-brass">
                {p.label}
              </span>
              <span className="max-w-[34ch] text-ivory-dim">{p.text}</span>
              <span className="mt-2 border-b border-brass pb-1 text-sm font-semibold uppercase tracking-[0.14em] text-ivory transition-[letter-spacing] duration-300 ease-out group-hover:tracking-[0.22em]">
                {t.view}<span className="sr-only">{t.newTab}</span>
              </span>
            </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="border-t border-brass-dim px-4 py-4 text-center text-sm text-ivory-dim sm:px-8">
        {t.noteBefore}{" "}
        <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" className="text-brass underline">
          CC BY-SA 3.0
        </a>
        .
      </p>
    </main>
  );
}
