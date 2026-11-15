import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { pageMeta } from "@/lib/seo";
import { Suspense } from "react";
import { InteractiveMap } from "@/components/InteractiveMap";
import { PageHeader } from "@/components/PageHeader";
import { Unavailable } from "@/components/Unavailable";
import { safe } from "@/lib/api";
import { getMapDetail } from "@/lib/map";

export async function generateMetadata({ params }: PageProps<"/[lang]/herramientas/mapa">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).map;
  return pageMeta({ lang, path: "/herramientas/mapa", title: t.metaTitle, description: t.metaDesc });
}

export default async function MapPage() {
  const t = (await getT()).map;
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<MapSkeleton />}>
        <MapLoader />
      </Suspense>
      <p className="mt-6 max-w-[78ch] text-sm text-ivory-dim">
        {t.credit}{" "}
        <a href="https://deadlock-api.com/" className="text-brass underline">
          deadlock-api.com
        </a>
        {t.creditAfter}
      </p>
    </main>
  );
}

async function MapLoader() {
  const t = (await getT()).map;
  const data = await safe(getMapDetail());
  if (!data) {
    return (
      <div className="mt-8">
        <Unavailable what={t.what} />
      </div>
    );
  }
  return <InteractiveMap data={data} />;
}

async function MapSkeleton() {
  const t = (await getT()).map;
  return (
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]" aria-busy="true" aria-label={t.loadingAria}>
      <LoadingState label={t.loading} className="lg:col-span-2" />
      <div className="map-frame">
        <div className="map-viewport" />
      </div>
      <div className="panel h-[32rem]" />
    </div>
  );
}
