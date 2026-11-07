// Copies the money rules from the web app (firis-family-finance) into this app,
// so both apps always work out budgets, tax and FIRE the same way.
// Usage: npm run sync-shared [path-to-web-repo]   (default ../firis-family-finance)
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const web = process.argv[2] ?? "../firis-family-finance";
if (!existsSync(join(web, "src/lib/budget.ts"))) {
  console.error(`Can't find the web app at ${web}`);
  process.exit(1);
}
export const SHARED = [
  "src/data/sample.ts",
  ...["budget", "format", "fire", "receipt", "cloud", "setup", "plans", "shops", "statement"].map(
    (f) => `src/lib/${f}.ts`,
  ),
  ...["categories", "cloud", "months", "plans", "receipt", "rules", "setup", "shops", "source", "statement", "tax"].map(
    (t) => `src/test/${t}.test.ts`,
  ),
];
for (const f of SHARED) copyFileSync(join(web, f), f);
console.log(`Copied ${SHARED.length} files from ${web}. Now run: npm test`);
