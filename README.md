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

## Getting Started

### Install Dependencies

```bash
npm install
```

### Start Development Server

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

## License

Proprietary
