import { read } from "./common";
export async function referenceSource() {
  const source = await read("benchmark/fixtures/reference.ts");
  const pattern = /import type \{[^}]+\} from ["']\.\.\/contract["'];?/;
  if (!pattern.test(source))
    throw new Error("Reference contract import not found");
  return source.replace(pattern, await read("benchmark/contract.ts"));
}
