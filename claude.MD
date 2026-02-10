# Ruby+ Platform — Project Guide

## Overview

Ruby+ is a Yelp-style marketplace platform connecting Nigerian businesses with diaspora Nigerians and tourists. The platform consists of multiple applications:

| App | Repo / Path | Tech Stack | Status |
|-----|-------------|------------|--------|
| **Web (Frontend)** | `/mnt/c/Users/DELL/Desktop/ruby-plus-web` | Next.js 15, React 19, TypeScript, Tailwind CSS | Active |
| **Backend API** | `/mnt/c/Users/DELL/Desktop/ruby-plus-backend` | NestJS 10, MongoDB/Mongoose, JWT Auth | Active |
| **Customer Mobile App** | TBD | TBD | Not started |
| **Business Mobile App** | TBD | TBD | Not started |

---

## Frontend — ruby-plus-web

### Tech Stack
- **Framework:** Next.js 15.1.0 (App Router) + React 19 + TypeScript 5.7
- **Styling:** Tailwind CSS 3.4 with custom `ruby-*` color palette (primary: `#FD362F`)
- **Fonts:** Poppins (sans), Playfair Display (serif)
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **Toasts:** Sonner
- **Path alias:** `@/*` → `./src/*`

### Project Structure
```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── about/page.tsx                    # About page
│   ├── contact/page.tsx                  # Contact page
│   ├── partner/page.tsx                  # Partner page
│   └── ruby-app/admin/
│       ├── (auth)/login/page.tsx         # Admin login
│       └── (dashboard)/                  # Protected admin dashboard
│           ├── page.tsx                  # Dashboard home
│           ├── users/                    # Admin user management
│           ├── locations/                # Location management
│           ├── businesses/               # Business approval & management
│           ├── orders/                   # Order tracking
│           ├── bookings/                 # Booking management
│           ├── disputes/                 # Dispute resolution
│           ├── finance/                  # Wallets, payouts, ledger
│           ├── taxonomy/                 # Categories & subcategories
│           ├── templates/                # Service/product templates
│           └── audit-logs/               # Activity audit trail
├── components/
│   ├── landing/       # Public site: Navbar, Hero, Categories, Stats, etc.
│   ├── about/         # AboutHero, MissionAndStats, OurValues
│   ├── contact/       # ContactHero, ContactForm, ContactInfo
│   ├── partner/       # PartnerHero
│   └── ui/            # Shared: DataTable, Modal, PageHeader, StatCard, StatusBadge
├── lib/
│   ├── api/client.ts  # API client (JWT auth, token refresh, error handling)
│   ├── auth/auth-context.tsx  # Auth provider with RBAC
│   ├── hooks.ts       # useApi, useMutation custom hooks
│   ├── types.ts       # All TypeScript type definitions
│   └── utils.ts       # Formatting & utility functions
└── styles/globals.css # Tailwind + custom animations
```

### Commands
```bash
npm run dev       # Dev server (port 3000)
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint
```

### Auth & RBAC (Admin)
- JWT access/refresh token flow stored in localStorage
- Roles: `SUPER_ADMIN`, `LOCATION_ADMIN`, `FINANCE_ADMIN`, `CONTENT_ADMIN`, `OPS_ADMIN`
- Scopes: `GLOBAL` or `LOCATION`-based

### Environment Variables
```
NEXT_PUBLIC_API_URL    # Backend API URL (client-side)
API_URL                # Backend API URL (server-side)
SESSION_SECRET         # Encryption key
NEXT_PUBLIC_APP_URL    # Frontend URL
```

---

## Backend — ruby-plus-backend

### Tech Stack
- **Framework:** NestJS 10.3 + TypeScript 5.3
- **Database:** MongoDB (Mongoose 8.1) on MongoDB Atlas
- **Auth:** JWT (Passport) + bcryptjs password hashing
- **Validation:** class-validator + class-transformer
- **API Docs:** Swagger at `/api/docs`
- **Security:** Helmet, ThrottlerModule (rate limiting), CORS
- **API Prefix:** `/api/v1`

### Project Structure
```
src/
├── common/
│   ├── decorators/    # @Public, @Roles, @CurrentUser, @ApiResponse
│   ├── guards/        # JWT, Roles, AdminScope, LocationGating, BusinessOwner
│   ├── interceptors/  # Transform (standardized responses), RequestId
│   ├── filters/       # HttpException (standardized errors)
│   ├── pipes/         # ParseObjectId
│   └── utils/
├── database/seeds/    # Database seed script
├── modules/
│   ├── auth/          # Auth (user/admin/business login, JWT, refresh)
│   ├── admin/         # Admin user CRUD
│   ├── users/         # End-user management
│   ├── locations/     # Location management (country/state/city, GeoJSON)
│   ├── businesses/    # Business registration, approval flow, discovery
│   ├── products/      # Product catalog per business
│   ├── services/      # Service listings per business
│   ├── orders/        # Order lifecycle (place → deliver → complete)
│   ├── bookings/      # Service booking lifecycle
│   ├── wallets/       # Wallet system (user/business/platform), ledger
│   ├── payouts/       # Payout requests, bank accounts
│   ├── disputes/      # Dispute resolution with messaging
│   ├── delivery/      # Delivery quotes and job tracking
│   ├── taxonomy/      # Category groups, categories, subcategories
│   ├── templates/     # Service/product templates
│   ├── analytics/     # Dashboard KPIs, revenue, order stats
│   ├── audit/         # Audit log tracking
│   └── webhooks/      # Payment provider webhooks
├── app.module.ts      # Root module
└── main.ts            # Entry point
```

### Commands
```bash
npm run start:dev     # Dev with hot reload
npm run build         # Compile to dist/
npm run start:prod    # Run production
npm run seed          # Seed database
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run lint          # ESLint + auto-fix
npm run format        # Prettier
```

### Key API Endpoint Groups

| Prefix | Description |
|--------|-------------|
| `POST /auth/user/register & login` | User auth |
| `POST /auth/admin/login` | Admin auth |
| `POST /auth/business/login` | Business owner auth |
| `/admin/*` | Admin CRUD (users, locations, businesses, orders, disputes, payouts, taxonomy) |
| `/public/*` | Public discovery (locations, businesses, products, services, taxonomy) |
| `/business/*` | Business owner operations (profile, products, services, orders, bookings, payouts) |
| `/user/*` | Customer operations (orders, bookings, disputes, wallets) |
| `/delivery/*` | Delivery quotes and jobs |
| `/analytics/*` | Dashboard & reporting |

### Database Collections
`users`, `admin_users`, `locations`, `businesses`, `products`, `service_listings`, `orders`, `bookings`, `wallets`, `ledger_entries`, `payouts`, `bank_accounts`, `disputes`, `category_groups`, `categories`, `templates`, `audit_logs`, `delivery_jobs`, `delivery_quotes`, `delivery_configs`, `fee_configs`, `payments`

### Status Flows
- **Business:** DRAFT → PENDING_REVIEW → APPROVED → LIVE (or REJECTED/SUSPENDED)
- **Order:** PLACED → ACCEPTED → PREPARING → READY → DISPATCHED → DELIVERED → COMPLETED
- **Booking:** PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
- **Dispute:** OPEN → UNDER_REVIEW → AWAITING_RESPONSE → RESOLVED → CLOSED
- **Payout:** PENDING → APPROVED → PROCESSING → COMPLETED

### Standard API Response Format
```json
{
  "success": true,
  "data": {},
  "meta": { "requestId": "...", "timestamp": "...", "pagination": {} }
}
```

### Environment Variables (Backend)
```
NODE_ENV, PORT (3000), API_PREFIX (api/v1)
MONGODB_URI
JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
THROTTLE_TTL (60), THROTTLE_LIMIT (100)
CORS_ORIGINS
ADMIN_EMAIL, ADMIN_PASSWORD (seed)
PAYMENT_PROVIDER, PAYMENT_WEBHOOK_SECRET
```

---

## Mobile Apps (Planned)

### Customer App
- For end-users (diaspora Nigerians, tourists)
- Browse/discover businesses by location
- Place orders, book services
- Track orders/deliveries
- Manage wallet, view transaction history
- File disputes

### Business App
- For business owners
- Manage business profile, products, services
- Accept/reject/manage orders and bookings
- View earnings, request payouts
- Manage bank accounts
- Respond to disputes

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Clients                                │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Web App    │  │ Customer App │  │   Business App       │ │
│  │  (Next.js)  │  │  (Mobile)    │  │   (Mobile)           │ │
│  │  Port 3000  │  │  TBD         │  │   TBD                │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘ │
│         │                │                      │             │
│         └────────────────┼──────────────────────┘             │
│                          │                                    │
│                    ┌─────▼─────┐                              │
│                    │ Backend   │                              │
│                    │ (NestJS)  │                              │
│                    │ /api/v1   │                              │
│                    └─────┬─────┘                              │
│                          │                                    │
│                    ┌─────▼─────┐                              │
│                    │ MongoDB   │                              │
│                    │ Atlas     │                              │
│                    └───────────┘                              │
└──────────────────────────────────────────────────────────────┘
```

## Conventions
- Frontend uses `@/` path alias for all imports from `src/`
- Backend modules follow NestJS pattern: controller → service → schema + DTOs
- All API responses are standardized via Transform interceptor
- Currency is NGN (Nigerian Naira) by default
- Admin RBAC enforced at guard level with GLOBAL/LOCATION scopes
- Git: `main` branch is primary, current work on `master`
