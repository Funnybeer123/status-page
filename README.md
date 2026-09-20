# Family Lineage

A private family-history website: multi-family trees, dated photos and videos, letter scans with OCR, and an Ask box that answers from that family’s own archive.

This is a standalone Next.js app. It is not the status-page product.

## Start

```bash
docker compose up --build
```

Then open [http://localhost:3000](http://localhost:3000).

On first boot the app migrates Postgres, seeds the Hart family, and starts the site. Ask works without an OpenAI key.

## Demo login

- Email: `demo@familylineage.app`
- Password: `harvest-dance`

Use **Try the Hart family** on the home page, or sign in with those credentials. Then open **Ask** and enter:

> How did grandma meet grandpa?

The answer cites Eleanor’s 18 October 1947 letter to Ruth.

## What you can do

- Sign up, create a family, invite relatives (owner / contributor / viewer), and switch families.
- Add people and parent/partner links; browse a three-generation tree.
- Record maiden names, nicknames, the places people lived, and a life-event timeline.
- Write stories and oral notes; cite letters and photographs on facts.
- Ask how two people are related; search the whole archive; see upcoming family dates.
- Living relatives are redacted for viewers (birth dates, notes, current places).
- Upload photos and videos, stamp a date (EXIF when present), and tag people.
- Upload a letter scan, run Tesseract OCR, and keep an editable dated transcript.
- Ask questions answered from letters, notes, and stories, with source cards.

## Optional live model

Set `OPENAI_API_KEY` in the environment (and optionally `OPENAI_BASE_URL` / `OPENAI_MODEL`). Without a key, Ask uses the seeded archive and keyword retrieval.

## Tests

With the site up (`docker compose up --build`):

```bash
npm test
npm run test:ui
```

`npm test` signs up a new member, creates a family, adds people and relationships, uploads a dated photo and video, OCRs a letter scan, and asks how grandma met grandpa. A second suite records maiden names, places, events, stories, citations, relatedness, search, dates, and living-person privacy the same way. It does not treat the Prisma Hart seed as proof. `npm run test:ui` walks those families in the browser and writes screenshots to `/opt/cursor/artifacts/family-liniage/media/`.

## Local development (without rebuilding the image)

```bash
docker compose up db -d
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```
