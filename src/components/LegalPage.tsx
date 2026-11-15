import type { ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getT } from "@/i18n/server";
import { LAST_UPDATED } from "@/lib/site";

export async function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const t = await getT();
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <PageHeader title={title} intro={intro} />
      <div className="mt-8 max-w-[68ch] space-y-10">
        {children}
        <p className="border-t border-brass-dim pt-4 text-sm text-ivory-dim">{t.common.legalUpdated(LAST_UPDATED[t.lang])}</p>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 text-ivory-dim [&_strong]:font-semibold [&_strong]:text-ivory [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <h2 className="font-display text-2xl tracking-[0.08em] text-ivory">{title}</h2>
      {children}
    </section>
  );
}
