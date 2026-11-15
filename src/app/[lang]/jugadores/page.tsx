import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import Link from "@/components/Link";
import { Suspense } from "react";
import { SearchForm } from "@/components/SearchForm";
import { searchPlayers } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[lang]/jugadores">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).players.search;
  return pageMeta({ lang, path: "/jugadores", title: t.metaTitle, description: t.metaDesc, noindex: true });
}

export default async function SearchPage({ searchParams }: PageProps<"/[lang]/jugadores">) {
  const t = (await getT()).players.search;
  return (
    <main className="mx-auto max-w-[1320px] px-4 sm:px-8">
      <h1 className="mt-10 font-display text-[clamp(2rem,1.4rem+2vw,2.8rem)] tracking-[0.12em] text-brass">
        {t.title.toUpperCase()}
      </h1>
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/[lang]/jugadores">["searchParams"] }) {
  const t = (await getT()).players.search;
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();

  let body: React.ReactNode;
  if (q.length < 2) {
    body = <p className="mt-8 text-ivory-dim">{t.minChars}</p>;
  } else {
    let players: Awaited<ReturnType<typeof searchPlayers>> | null = null;
    try {
      players = await searchPlayers(q);
    } catch {
      players = null;
    }
    if (players === null) {
      body = (
        <p className="mt-8 border border-dashed border-brass-dim px-5 py-6 text-ivory-dim">
          {t.apiDown}
        </p>
      );
    } else if (players.length === 0) {
      body = (
        <p className="mt-8 text-ivory-dim">
          {t.none(q)}
        </p>
      );
    } else {
      body = (
        <>
          <p className="mt-8 text-sm text-ivory-dim">
            {t.results(players.length, q)}
          </p>
          <ul className="mt-4 grid gap-x-10 md:grid-cols-2">
            {players.map((p) => (
              <li key={p.accountId} className="border-b border-brass-dim/40">
                <Link
                  href={`/jugadores/${p.accountId}`}
                  className="group flex items-center gap-4 py-3 no-underline transition-colors hover:bg-wine/50"
                >
                  <Image src={p.avatar} alt="" width={48} height={48} className="border border-brass-dim" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-semibold text-ivory group-hover:text-brass">{p.name}</span>
                    <span className="block text-sm text-ivory-dim">
                      ID {p.accountId}
                      {p.country && ` · ${p.country}`}
                      {p.matchesLast30d != null && ` · ${t.matches30(p.matchesLast30d)}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      );
    }
  }

  return (
    <>
      <div className="mt-6 max-w-[720px]">
        <SearchForm defaultValue={q} size="md" />
      </div>
      {body}
    </>
  );
}

async function ResultsSkeleton() {
  const t = (await getT()).players.search;
  return (
    <div aria-busy="true" aria-label={t.searchingAria}>
      <LoadingState label={t.searching} className="mt-8" />
      <div className="mt-6 h-13 max-w-[720px] border border-brass-dim bg-ox-deep" />
      <ul className="mt-12 grid gap-x-10 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex items-center gap-4 border-b border-brass-dim/40 py-3">
            <span className="size-12 bg-wine/60" />
            <span className="h-4 flex-1 bg-wine/40" />
          </li>
        ))}
      </ul>
    </div>
  );
}
