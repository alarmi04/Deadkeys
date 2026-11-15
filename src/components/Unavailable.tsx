import { getT } from "@/i18n/server";

export async function Unavailable({ what }: { what: string }) {
  const t = await getT();
  return (
    <p className="border border-dashed border-brass-dim px-5 py-6 text-ivory-dim">{t.common.unavailable(what)}</p>
  );
}
