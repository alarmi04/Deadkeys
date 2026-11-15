import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { pageMeta } from "@/lib/seo";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { TierTabs } from "@/components/TierActions";
import { TierList } from "@/components/TierList";
import { Unavailable } from "@/components/Unavailable";
import { getHeroes, safe } from "@/lib/api";
import { decodeRows } from "@/lib/tierlist";

export async function generateMetadata({ params }: PageProps<"/[lang]/herramientas/tierlist/mia">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).tierlist;
  return pageMeta({ lang, path: "/herramientas/tierlist/mia", title: t.mineMetaTitle, description: t.mineMetaDesc, noindex: true });
}

export default async function MyTierListPage({ searchParams }: PageProps<"/[lang]/herramientas/tierlist/mia">) {
  const t = (await getT()).tierlist;
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <PageHeader title={t.mine} intro={t.mineIntro} />
      <TierTabs />
      <Suspense fallback={<LoadingState label={t.loading} className="mt-8" />}>
        <Editor searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Editor({ searchParams }: { searchParams: PageProps<"/[lang]/herramientas/tierlist/mia">["searchParams"] }) {
  const t = (await getT()).tierlist;
  const [sp, heroes] = await Promise.all([searchParams, safe(getHeroes())]);
  if (!heroes) {
    return (
      <div className="mt-8">
        <Unavailable what={t.heroesWhat} />
      </div>
    );
  }
  const playable = heroes.filter((h) => h.playable);
  // Plantilla que llega desde «Por rango» (?base=…). La clave hace que el editor se reinicie con ella aunque ya
  // estuviera abierto en segundo plano; sin plantilla, el editor carga lo que el usuario tenía guardado.
  const base = typeof sp.base === "string" ? sp.base : "";
  const seed = base ? decodeRows(base, new Set(playable.map((h) => h.id))) : null;
  return (
    <TierList
      key={seed ? base : "propia"}
      heroes={playable.map((h) => ({ id: h.id, name: h.name, image: h.small }))}
      seed={seed}
    />
  );
}
