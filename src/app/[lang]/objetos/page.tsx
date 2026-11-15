import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import { Barlow_Condensed } from "next/font/google";
import Image from "next/image";
import Link from "@/components/Link";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Unavailable } from "@/components/Unavailable";
import { type Item, getItems, safe } from "@/lib/api";
import "./shop.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/objetos">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).items;
  return pageMeta({ lang, path: "/objetos", title: t.metaTitle, description: t.metaDesc });
}

const barlow = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const ORDER = ["weapon", "spirit", "vitality"] as const;
type TypeKey = (typeof ORDER)[number];
const isType = (k: string | null | undefined): k is TypeKey => !!k && (ORDER as readonly string[]).includes(k);
type L = Messages["items"]["list"];

const ROMAN = ["", "I", "II", "III", "IV", "V"];
/** Los legendarios llegan con un coste de relleno (9999): no se compran con almas. */
const LEGENDARY = 5;

export default async function ItemsPage({ searchParams }: PageProps<"/[lang]/objetos">) {
  const t = (await getT()).items.list;
  return (
    <main className={`${barlow.variable} mx-auto max-w-[1320px] px-4 pb-12 sm:px-8`}>
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingState label={t.loading} className="shop-panel mt-8 h-[36rem]" />}>
        <ItemsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ItemsView({ searchParams }: { searchParams: PageProps<"/[lang]/objetos">["searchParams"] }) {
  const m = await getT();
  const t = m.items.list;
  const sp = await searchParams;
  const tipo = typeof sp.tipo === "string" && isType(sp.tipo) ? sp.tipo : null;
  const items = await safe(getItems(m.lang));
  if (!items) {
    return (
      <div className="mt-8">
        <Unavailable what={t.what} />
      </div>
    );
  }

  const shop = items
    .filter((i) => i.type === "upgrade" && i.inShop && i.slot && isType(i.slot) && i.tier)
    .sort((a, b) => a.name.localeCompare(b.name, m.lang));
  const byType = Object.fromEntries(ORDER.map((t) => [t, shop.filter((i) => i.slot === t)])) as Record<TypeKey, Item[]>;
  const tiers = [...new Set(shop.map((i) => i.tier!))].sort((a, b) => a - b);

  return (
    <div className="shop mt-8">
      <ShopTabs active={tipo} t={t} />
      <div className="shop-panel">
        {tipo ? <TypeShop type={tipo} items={byType[tipo]} t={t} /> : <AllShop byType={byType} tiers={tiers} t={t} />}
      </div>
    </div>
  );
}

/* ---------- Pestañas laterales ---------- */

function ShopTabs({ active, t: tt }: { active: TypeKey | null; t: L }) {
  const tabs: { key: TypeKey | "all"; href: string; label: string }[] = [
    { key: "all", href: "/objetos", label: tt.all },
    ...ORDER.map((k) => ({ key: k, href: `/objetos?tipo=${k}`, label: tt.types[k].label })),
  ];
  return (
    <nav aria-label={tt.tabsAria} className="shop-tabs">
      {tabs.map((t) => {
        const on = (active ?? "all") === t.key;
        return (
          <Link key={t.key} href={t.href} data-type={t.key} aria-current={on ? "page" : undefined} className="shop-tab">
            <TypeIcon type={t.key} className="size-7" />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ---------- Vista «Todos»: tres columnas por tipo, filas por coste ---------- */

async function AllShop({ byType, tiers, t }: { byType: Record<TypeKey, Item[]>; tiers: number[]; t: L }) {
  const { num } = await getFormat();
  return (
    <div className="shop-all">
      <div className="shop-heads" aria-hidden="true">
        {ORDER.map((ty) => (
          <div key={ty} className="shop-banner" data-type={ty}>
            <TypeIcon type={ty} className="size-9 shrink-0" />
            <span className="shop-banner-label">{t.types[ty].label}</span>
            <span className="shop-banner-tag">{t.types[ty].tagline}</span>
          </div>
        ))}
      </div>
      {tiers.map((tier) => (
        <section key={tier} className="shop-row" aria-label={tierName(tier, byType, t, num)}>
          <h3 className="shop-cost">{tierCostLabel(tier, Object.values(byType).flat(), t, num)}</h3>
          <div className="shop-cells">
            {ORDER.map((ty) => {
              const list = byType[ty].filter((i) => i.tier === tier);
              return (
                <div key={ty} className="shop-cell" data-type={ty}>
                  <span className="shop-cell-label">{t.types[ty].label}</span>
                  {list.length > 0 ? (
                    <ul className="shop-cards">
                      {list.map((item) => (
                        <ShopCard key={item.id} item={item} type={ty} />
                      ))}
                    </ul>
                  ) : (
                    <span className="sr-only">{t.none}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------- Vista de un tipo: cajas por nivel ---------- */

async function TypeShop({ type, items, t }: { type: TypeKey; items: Item[]; t: L }) {
  const { num } = await getFormat();
  const tiers = [...new Set(items.map((i) => i.tier!))].sort((a, b) => a - b);
  return (
    <div className="shop-type" data-type={type}>
      <header className="shop-type-title">
        <TypeIcon type={type} className="size-12 shrink-0 sm:size-14" />
        <div>
          <h2>{t.types[type].label}</h2>
          <p>{t.count(t.types[type].subtitle, items.length)}</p>
        </div>
      </header>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {tiers.map((tier) => {
          const list = items.filter((i) => i.tier === tier);
          const expert = tier >= 4;
          return (
            <section key={tier} className="shop-tier" data-dark={expert || undefined}>
              <header className="shop-tier-head">
                <span className="shop-tier-cost">{tierCostLabel(tier, list, t, num)}</span>
                <span className="shop-tier-name">{t.level} {ROMAN[tier] ?? tier}</span>
                {expert && <em className="shop-tier-note">{t.expertsOnly}</em>}
              </header>
              <ul className="shop-cards">
                {list.map((item) => (
                  <ShopCard key={item.id} item={item} type={type} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Piezas ---------- */

function ShopCard({ item, type }: { item: Item; type: TypeKey }) {
  return (
    <li data-type={type} title={item.quip ? `${item.name} — ${item.quip}` : item.name}>
      <Link href={`/objetos/${item.id}`} className="shop-card" data-type={type}>
        <span className="shop-card-img">
          {item.image && <Image src={item.image} alt="" width={96} height={96} />}
        </span>
        <span className="shop-card-name">{item.name}</span>
      </Link>
    </li>
  );
}

function tierCostLabel(tier: number, items: Item[], t: L, num: (v: number) => string): string {
  if (tier === LEGENDARY) return t.legendary;
  const cost = items.find((i) => i.tier === tier && i.cost)?.cost;
  return cost ? num(cost) : `${t.level} ${ROMAN[tier] ?? tier}`;
}

function tierName(tier: number, byType: Record<TypeKey, Item[]>, t: L, num: (v: number) => string): string {
  if (tier === LEGENDARY) return t.legendary;
  return t.tierName(ROMAN[tier] ?? String(tier), tierCostLabel(tier, Object.values(byType).flat(), t, num));
}

function TypeIcon({ type, className }: { type: TypeKey | "all"; className?: string }) {
  const common = { viewBox: "0 0 32 32", className, "aria-hidden": true, fill: "none", stroke: "currentColor" } as const;
  switch (type) {
    case "weapon":
      return (
        <svg {...common} strokeWidth="3">
          <circle cx="16" cy="16" r="10" />
          <circle cx="16" cy="16" r="3.5" fill="currentColor" stroke="none" />
          <path d="M16 1v7M16 24v7M1 16h7M24 16h7" />
        </svg>
      );
    case "spirit":
      return (
        <svg {...common} strokeWidth="2.4">
          <circle cx="16" cy="16" r="13" />
          <path d="M16 4.5l6.8 20.8L5.1 12.4h21.8L9.2 25.3z" strokeLinejoin="round" />
        </svg>
      );
    case "vitality":
      return (
        <svg {...common} stroke="none" fill="currentColor">
          <path d="M11.5 3h9v8.5H29v9h-8.5V29h-9v-8.5H3v-9h8.5z" />
        </svg>
      );
    default:
      return (
        <svg {...common} stroke="none" fill="currentColor">
          {[0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={4 + c * 9} y={4 + r * 9} width="6" height="6" rx="1" />),
          )}
        </svg>
      );
  }
}
