import { makeFormat, type Format } from "@/lib/format";
import { getLocale } from "./server";

export async function getFormat(): Promise<Format> {
  return makeFormat(await getLocale());
}
