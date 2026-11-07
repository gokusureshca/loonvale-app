# Loonvale phone app

The Loonvale budget app for iPhone and Android, built with Expo (React Native).
It uses the **same Supabase database** as the web app at firis.lovable.app
(repo `gokusureshca/firis-family-finance`), so phone and web always show the same household.

## What's in it
Same Loonvale look as the web app on a phone: lake teal, Fraunces headings, Plus Jakarta Sans,
and the tab bar Home · Budget · + · Spending · FIRE.
- **Overview:** FIRE goal, left to spend, portfolio, budget by category, plans, recent spending.
- **Budget:** each month's budget by group, and budget vs spend. Past months locked.
- **Spending:** month chart with the budget line, money in vs spent, by category, merchant, person
  or label; receipts open to show their lines.
- **Add / edit expense:** big amount, shop chips, category guessed from the shop, type, more details.
  **Scan** a receipt (camera or library) and review each line: name, qty, price, HST 13% / GST 5% / no tax.
- **FIRE:** the goal result and your answers.
- **Sign in** with a 6-digit email code, same email as the web app. Signed out shows a sample family.

Still on the web only: setup, changing budgets and categories, adding money in, bank statement check,
plans, answering the FIRE questions.

## Shared money rules
`src/data/sample.ts` and `src/lib/{budget,format,fire,receipt,cloud,setup,plans,shops,statement}.ts`
are copied unchanged from the web app, with their tests. After changing them on the web, run
`npm run sync-shared` then `npm test`. Don't edit them here.

## Run it
```bash
npm install
npx expo start      # scan the QR code with Expo Go on your phone
npm test            # money rules
npm run typecheck
```

## Publish
Builds run in the cloud with EAS, so no Mac is needed:
`npx eas-cli build --platform ios` then `npx eas-cli submit --platform ios` (TestFlight).
Needs an Expo account and the Apple Developer Program.
