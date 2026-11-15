import Image from "next/image";
import type { Hero } from "@/lib/api";

export function HeroIcon({ hero, size = 32 }: { hero: Pick<Hero, "name" | "small"> | undefined; size?: number }) {
  if (!hero?.small) {
    return <span className="inline-block shrink-0 bg-wine" style={{ width: size, height: size }} aria-hidden="true" />;
  }
  return (
    <Image
      src={hero.small}
      alt={hero.name}
      title={hero.name}
      width={size}
      height={size}
      className="shrink-0 object-cover object-top"
      style={{ width: size, height: size }}
    />
  );
}
