import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { pageMeta } from "@/lib/seo";
import Link from "@/components/Link";
import { Icon } from "@/components/Icons";
import { PageHeader } from "@/components/PageHeader";
import { tools } from "@/lib/tools";

export async function generateMetadata({ params }: PageProps<"/[lang]/herramientas">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).pages.tools;
  return pageMeta({ lang, path: "/herramientas", title: t.metaTitle, description: t.metaDesc });
}

export default async function ToolsPage() {
  const m = await getT();
  const t = m.pages.tools;
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <PageHeader title={t.title} intro={t.intro} />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools(m).map((tool) => (
          <li key={tool.href}>
            <Link
              href={tool.href}
              className="group flex h-full flex-col gap-4 border border-brass-dim bg-ox-deep p-6 no-underline transition-colors hover:border-brass"
            >
              <span className="grid size-14 place-items-center border border-brass-dim text-brass transition-colors group-hover:border-brass group-hover:bg-brass group-hover:text-ox-deep">
                <Icon name={tool.icon} size={28} />
              </span>
              <span className="font-display text-[1.7rem] leading-tight tracking-[0.1em] text-brass transition-colors group-hover:text-ivory">
                {tool.label.toUpperCase()}
              </span>
              <span className="text-sm text-ivory-dim">{tool.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
