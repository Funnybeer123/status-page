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
- Record maiden names, nicknames, the places people lived, and a full family history (vitals, moves, marriages, letters, photographs, films, stories, and oral notes) with person and generation filters, gap callouts, and a form to add a missing event from the timeline.
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

`npm test` signs up a new member, creates a family, adds people and relationships, uploads a dated photo and video, OCRs a letter scan, and asks how grandma met grandpa. A second suite records maiden names, places, events, stories, citations, relatedness, search, dates, and living-person privacy the same way. The history suite enters three generations, a move, letter, oral note, photo, film, and story, then checks date order, person/generation filters, and gaps. It does not treat the Prisma Hart seed as proof. `npm run test:ui` walks those families in the browser. History screenshots go to `/cursor/stores/bc-96119aab-60f3-43ba-ac99-2f6808b8773e/artifacts/family-liniage/media/`.

## CI / CD

Workflows live on `family-lineage` under `.github/workflows/`.

**CI** (`ci.yml`) runs on every push to `family-lineage`:

1. `npm run typecheck` and `npm run test:unit`
2. Integration `npm test` against Postgres 16 + pgvector (Tesseract and ffmpeg installed on the runner)
3. `docker build` of the application image

**Publish** (`publish.yml`) builds and pushes:

- `ghcr.io/<github-owner>/family-lineage:latest`
- `ghcr.io/<github-owner>/family-lineage:<git-sha>`

It uses `GITHUB_TOKEN` with `packages: write`. The `ghcr` environment can add extra reviewers if you want a human gate on publishes.

**Deploy** (`deploy.yml`) is real SSH deploy, gated on the GitHub **production** environment. It does not invent credentials. If the secrets below are missing, the job exits without deploying.

Set these on the `production` environment (Settings → Environments → production → Environment secrets):

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | SSH hostname or IP of the server that should run the image |
| `DEPLOY_USER` | SSH user on that host |
| `DEPLOY_SSH_KEY` | Private key for that user (PEM). Grant the matching public key on the host. |
| `DEPLOY_PATH` | Optional. Directory on the host that contains `docker-compose.yml` or `.env`. Defaults to `/opt/family-lineage`. |
| `DEPLOY_PORT` | Optional. SSH port. Defaults to `22`. |

On the host, keep real runtime secrets in `.env` (never commit them): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, and optional `OPENAI_API_KEY`. Point compose at `ghcr.io/<owner>/family-lineage` or set `FAMILY_LINEAGE_IMAGE`.

Trigger deploy with **Actions → Deploy → Run workflow**, or let it follow a successful **Publish image** run.

## Local development (without rebuilding the image)

```bash
docker compose up db -d
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```
