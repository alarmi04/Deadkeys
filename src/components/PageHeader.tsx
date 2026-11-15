export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="pt-10 sm:pt-14">
      <h1 className="font-display text-[clamp(2rem,1.2rem+3vw,3.4rem)] leading-[1.05] tracking-[0.12em] text-brass">
        {title.toUpperCase()}
      </h1>
      {intro && <p className="mt-3 max-w-[64ch] text-ivory-dim">{intro}</p>}
    </header>
  );
}
