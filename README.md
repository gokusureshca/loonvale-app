# Loonvale phone app

The Loonvale budget app for iPhone and Android, built with Expo (React Native).
It uses the **same Supabase database** as the web app at firis.lovable.app
(repo `gokusureshca/firis-family-finance`), so phone and web always show the same household.

## What's in it (v0.1)
- **Home:** left to spend this month, FIRE goal, budget by category, recent spending.
- **Spending:** month by month with a 6-month chart, by date, by category or by merchant.
- **Add / change expense:** amount, shop, category guess, who paid, date.
  Scan a receipt (camera or photo); each line's tax can be switched No tax / HST 13% / GST 5%.
- **Sign in** with a 6-digit email code, same email as the web app.
- Not signed in: a sample family to look around.

Not yet on the phone: setup, budget editing, money in, bank statement check, plans, FIRE questions.
Those still work on the web.

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
