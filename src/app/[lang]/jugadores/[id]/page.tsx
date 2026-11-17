import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { pageMeta } from "@/lib/seo";
import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlayerProfile, type ProfileMode, loadProfile } from "@/components/PlayerProfile";

export async function generateMetadata({ params }: PageProps<"/[lang]/jugadores/[id]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).players.profile;
  return pageMeta({ lang, path: "/jugadores", title: t.metaTitle, description: t.metaDesc, noindex: true });
}

export default function PlayerPage({ params, searchParams }: PageProps<"/[lang]/jugadores/[id]">) {
  return (
    <main className="mx-auto max-w-[1320px] px-4 sm:px-8">
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Profile({
  params,
  searchParams,
}: {
  params: PageProps<"/[lang]/jugadores/[id]">["params"];
  searchParams: PageProps<"/[lang]/jugadores/[id]">["searchParams"];
}) {
  const t = (await getT()).players.profile;
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const accountId = Number(id);
  if (!Number.isInteger(accountId) || accountId <= 0 || accountId > 2 ** 31) notFound();

  const data = await loadProfile(accountId);
  if (!data) notFound();

  const mode: ProfileMode = sp.modo === "ranked" || sp.modo === "normal" ? sp.modo : "todas";
  const page = Number(typeof sp.pagina === "string" ? sp.pagina : 1);
  const base = `/jugadores/${accountId}`;

  return (
    <PlayerProfile
      data={data}
      mode={mode}
      page={page}
      modeHref={(m) => (m === "todas" ? base : `${base}?modo=${m}`)}
      pageHref={(p) => `${base}?${mode === "todas" ? "" : `modo=${mode}&`}pagina=${p}`}
      links={
        <>
          {" · "}
          <Link href={`/tracker?a=${accountId}`} className="text-brass underline">
            {t.rankingCompare}
          </Link>
        </>
      }
    />
  );
}

async function ProfileSkeleton() {
  const t = (await getT()).players.profile;
  return (
    <div aria-busy="true" aria-label={t.loadingAria}>
      <LoadingState label={t.loading} className="mt-8" />
      <div className="deco-frame mt-8 flex items-center gap-8 px-12 py-10">
        <span className="size-28 bg-wine/60" />
        <span className="h-10 w-80 bg-wine/40" />
      </div>
    </div>
  );
}
