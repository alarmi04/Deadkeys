import { HeroCard } from "@/components/HeroCard";
import type { Hero, HeroStat } from "@/lib/api";

export { HeroCard };

export function RisingHeroes({ stats, byId }: { stats: HeroStat[]; byId: Map<number, Hero> }) {
  return (
    <ol className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <HeroCard key={s.heroId} stat={s} hero={byId.get(s.heroId)} />
      ))}
    </ol>
  );
}
