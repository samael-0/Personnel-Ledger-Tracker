# Ledgerly - Modern Personal Finance PWA

Ledgerly is a mobile-first, installable Progressive Web App (PWA) personal finance ledger engineered on Nordic Modern design principles: calm neutral surfaces, high-contrast typography, dual light and dark modes, a single deep emerald accent, 8px subtle corner geometry, and thumb-friendly one-handed ergonomics.

All monetary values are calculated and stored in **integer minor units** (e.g., cents) to eliminate floating-point rounding errors.

---

## Architecture & Tech Stack

- **Framework**: Next.js (App Router, strict TypeScript)
- **Styling**: Tailwind CSS with custom Nordic tokens (`--color-*`), dual-mode theme system
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM & Drizzle Kit
- **Authentication**: Better Auth (session-based, email & password, prepared for social providers)
- **Validation**: Zod (runtime validation across all routes and actions)
- **AI Receipt Vision**: Google Gemini API (`@google/genai`, server-side only with graceful manual fallback)
- **QR Code Engine**: `jsqr` (client-side decoding with high-contrast screen presentation)
- **PWA Service Worker**: Serwist (`@serwist/next`), offline fallback document, and strict non-caching of authenticated API routes

---

## Environment Variables Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### Required Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string (`postgresql://...`) |
| `BETTER_AUTH_SECRET` | Secret key for session encryption (at least 32 characters) |
| `BETTER_AUTH_URL` | Base URL of the app (`http://localhost:3000` in development, production domain on Vercel) |
| `GEMINI_API_KEY` | Google Gemini API key for optical receipt parsing |
| `SKIP_ENV_VALIDATION` | Set to `1` during isolated builds to bypass runtime credential checks |

### Adding Real Credentials

1. **Neon PostgreSQL Database**:
   - Go to [neon.tech](https://neon.tech), create a free project.
   - Under **Connection Details**, select **Connection pooling** and copy the string.
   - Paste into `DATABASE_URL` in `.env.local`.

2. **Better Auth Secret**:
   - Generate a secure 32+ character random string (e.g. `openssl rand -base64 32`) and paste into `BETTER_AUTH_SECRET`.

3. **Google Gemini API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/) and create an API key.
   - Paste into `GEMINI_API_KEY`.
   - *Note*: If this key is omitted or a placeholder, Ledgerly's receipt scanner automatically falls back to manual entry with a clear status notice.

---

## Database Migrations

Migration files have already been generated in the `drizzle/` directory.

To apply migrations to your live database, run:

```bash
npm run db:migrate
```

To generate fresh migrations after modifying `db/schema.ts`:

```bash
npm run db:generate
```

---

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment to Vercel + Neon Free Tier

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy Ledgerly"
   git push origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com), select **Add New Project**, and import your repository.
   - In **Environment Variables**, add:
     - `DATABASE_URL` (your Neon connection string)
     - `BETTER_AUTH_SECRET` (your generated 32-character secret)
     - `BETTER_AUTH_URL` (`https://<your-vercel-domain>.vercel.app`)
     - `GEMINI_API_KEY` (your Gemini key)
   - Click **Deploy**.

3. **Run Migrations on Neon**:
   - From your local terminal with real `DATABASE_URL` set, run `npm run db:migrate`, or execute the SQL file `drizzle/0000_medical_korg.sql` inside the Neon SQL Editor.

---

## Social Authentication (Google OAuth Redirect Setup)

Better Auth is structured to enable Google OAuth with zero architectural changes:

1. In the Google Cloud Console, create an OAuth 2.0 Client ID for a Web Application.
2. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/callback/google` (for local development)
   - `https://<your-app>.vercel.app/api/auth/callback/google` (for production)
3. Set environment variables:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```
4. In `lib/auth.ts`, uncomment the `socialProviders` section:
   ```ts
   socialProviders: {
     google: {
       clientId: process.env.GOOGLE_CLIENT_ID || "",
       clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
     },
   },
   ```

---

## How to Install as a PWA on a Phone via Chrome

1. Open Chrome on your Android or iOS device.
2. Navigate to your deployed production URL (e.g. `https://your-ledgerly.vercel.app`).
3. Tap the Chrome three-dot menu (**⋮**) in the top right (or the Share button on iOS Safari).
4. Tap **Add to Home screen** or **Install app**.
5. Confirm by tapping **Install**.
6. Ledgerly will install to your home screen with its custom maskable icon and launch in full-screen standalone mode.

---

## Verification & QA Matrix

- **360px Mobile**: Tested keypad input, bottom navigation tab bar, receipt camera capture trigger, full-screen QR presentation.
- **720px Tablet**: Balanced dual-column layouts, responsive review screen.
- **1050px Desktop**: Left rail navigation bar, expanded ledger, side-by-side receipt image inspection.
- **Accessibility**: Visible 2px emerald focus rings on all interactive elements, WCAG AA compliant contrast ratios across both light and dark themes, zero text-only em/en-dashes, and reduced-motion stylesheet override.
