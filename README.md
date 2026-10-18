# VATClear - Modern Fintech SaaS for Nigerian SMEs

A professional, premium fintech SaaS application designed to help Nigerian businesses manage their VAT and financial clarity in real-time.

## Features

- **Landing Page**: Hero section with value proposition, feature cards, and CTAs
- **Login Page**: Secure, centered authentication interface
- **Dashboard**: Comprehensive financial overview with:
  - Real-time VAT tracking (received, paid, payable)
  - Revenue and expense monitoring
  - Profit calculation
  - Smart tax insights
  - Recent activity feed
  - Responsive sidebar navigation

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- React Router
- Lucide Icons
- Vite
- Firebase Authentication (email/password, password reset)
- Cloud Firestore

## Getting Started

### Install Dependencies

```bash
npm install
```

### Configure Firebase

1. Create a project in the [Firebase console](https://console.firebase.google.com/).
2. **Authentication > Sign-in method**: enable **Email/Password** and **Google**.
3. **Authentication > Settings > Authorized domains**: add your production domain (e.g. your Vercel domain).
4. **Firestore Database**: create a database, then deploy the security rules in `firestore.rules`
   (paste them into **Firestore > Rules**, or run `npx firebase-tools deploy --only firestore:rules --project <project-id>`).
5. **Project settings > General > Your apps**: add a Web app and copy its config into `.env.local`
   (see `.env.example`). Set the same variables in Vercel's project settings.
6. **Google sign-in on Safari/iOS**: Safari blocks the cross-site storage Google sign-in relies on when
   it runs on `<project-id>.firebaseapp.com`. `vercel.json` proxies `/__/auth/*` to that domain so it can
   run on yours instead. To use it:
   - Set `VITE_FIREBASE_AUTH_DOMAIN` (in Vercel) to your production domain, e.g. `thetaxapp.vercel.app`,
     and update the project ID in the `vercel.json` proxy route if you use a different Firebase project.
   - In [Google Cloud console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials),
     open the **Web client (auto created by Google Service)** OAuth client and add
     `https://<your-domain>/__/auth/handler` to **Authorized redirect URIs**.
7. Optional, for branded reset emails: **Authentication > Templates > Password reset > Customize action URL**,
   set it to `https://<your-domain>/reset-password`. Without this, Firebase's hosted reset page is used.
8. **AI assistant (Smart Insights)**: create an API key at [console.groq.com](https://console.groq.com/keys) and add these
   **server-side** environment variables in Vercel (no `VITE_` prefix, so they never reach the browser):
   - `GROQ_API_KEY` (required): without it the assistant shows "AI insights aren't set up yet".
   - `GROQ_MODEL` (optional): defaults to `openai/gpt-oss-120b`.
   - `FIREBASE_PROJECT_ID` (optional): defaults to `VITE_FIREBASE_PROJECT_ID`; used to verify callers' sign-in tokens.

   The function lives in `api/ai-insights.ts` (logic in `server/`). It only accepts signed-in users and sends Groq the
   figures the app has already calculated; the model is told not to invent numbers.

9. **Admin console** (`/admin`): add these **server-side** environment variables in Vercel, then redeploy:
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: the admin sign-in. This is separate from customer accounts; it isn't
     a Firebase user. Use a long, unique password. Changing it signs out every admin session.
   - `FIREBASE_SERVICE_ACCOUNT`: lets the server read all users' data. In the Firebase console go to
     **Project settings > Service accounts > Generate new private key**, and paste the whole downloaded JSON file
     as the value. Keep it secret: it has full access to the project.
   - `ADMIN_SESSION_SECRET` (optional): extra secret for signing admin sessions; defaults to the service account key.

   Admin sessions last 8 hours in an HttpOnly cookie; 10 wrong passwords from one address lock sign-in for 15 minutes.
   The console shows who's online now, visits per day and week, sign-ups, every account (with disable/enable and
   password-reset email), and each business's records, where invoices can be deleted. Disabling an account, sending
   a reset and deleting an invoice are recorded in the `adminLog` Firestore collection.

   Visits are counted anonymously by `api/track.ts` (a random id stored in the browser, nothing personal) into the
   `stats_visits`, `stats_visitors` and `presence` collections. Only the server can read these; the security rules
   don't let browsers touch them. The functions need Node 22 (set in `package.json`).

Whenever `firestore.rules` changes, publish it again (paste it into **Firestore > Rules**).

Data layout: each user's business profile is the document `users/{uid}`, with `customers`, `invoices`,
`expenses` and `vatReturns` (returns marked as filed) subcollections beneath it. The rules only let a signed-in user access their own `users/{uid}` tree.

### Local Development Without a Firebase Project

The Firebase emulators run Auth and Firestore locally (requires Java):

```bash
npm run emulators
```

Then set `VITE_USE_FIREBASE_EMULATORS=true` and `VITE_FIREBASE_PROJECT_ID=demo-vatclear` in `.env.local`
(the other Firebase values can be any placeholder). Password reset links appear in the emulator log.

### Tests

```bash
npm test
```

Unit tests cover the VAT and money calculations (`src/lib/finance.ts`), the AI endpoint, and the admin
session, login limits and visit tracking (`server/`).

### Start Development Server

`npm run dev` serves the app only. To try the AI assistant or admin console locally, run `npx vercel dev` instead
(it also serves `/api`), with `GROQ_API_KEY` / the admin variables in your environment. Against the emulators, the
admin console needs `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` and `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
instead of `FIREBASE_SERVICE_ACCOUNT`.

```bash
npm run dev
```

The app will open at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Design Characteristics

- Professional, premium fintech aesthetic
- Clean typography with generous spacing
- Card-based layouts with soft shadows
- Smooth hover and focus animations
- Calm, trustworthy color palette (deep blue, slate, emerald accents)
- Desktop-first responsive design
- Subtle gradients and depth effects

## Project Structure

```
src/
├── pages/
│   ├── LandingPage.tsx       # Landing page with hero and features
│   ├── LoginPage.tsx          # Authentication interface
│   └── DashboardPage.tsx      # Main dashboard with financial overview
├── components/                # Reusable components (extensible)
├── App.tsx                    # Router setup
├── index.tsx                  # Entry point
└── index.css                  # Global styles and Tailwind directives

public/
├── index.html
└── manifest.json

Config files:
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## Color Palette

- **Primary**: Blue (#0066CC, #1E40AF)
- **Accent**: Emerald (#10B981)
- **Neutral**: Slate (#0F172A, #64748B)
- **Backgrounds**: Slate-50 (#F8FAFC)

## Routing

- `/` - Landing Page
- `/login` - Login/Sign-in Page
- `/dashboard` - Main Dashboard
- `/admin` - Admin console (separate admin sign-in)

## License

Proprietary
