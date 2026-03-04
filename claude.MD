# Ruby+ Platform — Project Guide

## Overview

Ruby+ is a Yelp-style marketplace platform connecting Nigerian businesses with diaspora Nigerians and tourists. The platform consists of multiple applications:

| App | Repo / Path | Tech Stack | Status |
|-----|-------------|------------|--------|
| **Web (Frontend)** | `/mnt/c/Users/DELL/Desktop/ruby-plus-web` | Next.js 15, React 19, TypeScript, Tailwind CSS | Active |
| **Backend API** | `/mnt/c/Users/DELL/Desktop/ruby-plus-backend` | NestJS 10, MongoDB/Mongoose, JWT Auth | Active |
| **Customer Mobile App** | `/mnt/c/Users/DELL/Desktop/ruby-app-mobile` | Expo SDK 54, React Native 0.81, TypeScript, Expo Router v6 | Active |
| **Business Mobile App** | `/mnt/c/Users/DELL/Desktop/ruby-business-app` | Expo SDK 54, React Native 0.81, TypeScript, Expo Router v6 | Active |

---

## Business Models

Every subcategory is assigned one of three `businessModel` values that determine how customers interact with the business. The `businessModel` enum lives on the `Subcategory` schema and drives which UI buttons/flows appear on a business profile.

| Model | Enum Value | Customer Action | Business Provides | Example Subcategories |
|-------|-----------|-----------------|-------------------|----------------------|
| **Model 1** | `ORDER_DELIVERY` | Orders goods online, gets delivery | Products shipped/delivered to customer. No physical visit. | Takeout & Fast Food, Supermarket/Groceries, Pharmacy, Fashion & Boutique, Laundry & Dry Cleaning |
| **Model 2** | `VISIT_ONLY` | Walks in / visits the business | On-site experience. No online ordering or booking required. | Casual Dining, Hair Salon, Gym & Fitness, Clubs & Lounges, Beach Bars, Tailoring, Car Wash, Galleries & Museums |
| **Model 3** | `BOOKING_VISIT` | Books/reserves, then visits (or provider comes to them) | Appointment or reservation-based. May be at business or at customer location. | Fine Dining, Hotels, Shortlets, Cleaning, Plumbing, Electrical, Spa & Massage, Airport Pickup, Live Music Venues, Legal, Consulting |

### 3rd-Party Integration Legs (Planned)

The platform has three operational "legs" that enable the business models:

| Partner | Role | Leg | Used By |
|---------|------|-----|---------|
| **Paystack / Zenith** | Payment processing | Payments | All models |
| **Simpliride** | Ride-hailing (customer transport to business) | Transport | VISIT_ONLY, BOOKING_VISIT |
| **Topship** | Delivery logistics | Delivery | ORDER_DELIVERY |

---

## Taxonomy System

The taxonomy is hierarchical: **Category Groups → Categories → Subcategories**. Each level can be configured per-location via location config overrides.

### Category Groups (2)

| Name | Slug | Type | Description |
|------|------|------|-------------|
| Top Tiles | top-tiles | TOP_TILES | Featured categories shown as tiles on home screen |
| More | more | MORE | Additional categories shown in "More" section |

### Categories (10 official)

| # | Category | Slug | Group | Description |
|---|----------|------|-------|-------------|
| 1 | Concierge Services | concierge-services | TOP_TILES | Your wish is our command. Airport pickups, private security, personal assistants. |
| 2 | Restaurants | restaurants | TOP_TILES | Taste cities like never before. Hidden gems, authentic suya, fine dining. |
| 3 | Nightlife | nightlife | TOP_TILES | Where the city comes alive. Rooftop lounges, clubs, beach bars. |
| 4 | Health & Wellness | health-wellness | TOP_TILES | Glow up, inside and out. Spas, gyms, salons, wellness retreats. |
| 5 | Home Services | home-services | TOP_TILES | Your home, handled. Cleaners, electricians, plumbers. |
| 6 | Shopping | shopping | MORE | Discover. Desire. Deliver. Boutique fashion, groceries, pharmacy. |
| 7 | Local Services | local-services | MORE | Get it done, the easy way. Tailors, laundry, car wash, repairs. |
| 8 | Professional Services | professional-services | MORE | Expertise on demand. Legal, financial, consulting. |
| 9 | Arts & Entertainment | arts-entertainment | MORE | Culture. Concerts. Unforgettable. Galleries, live shows, festivals. |
| 10 | Hotels & Travel | hotels-travel | MORE | Stay somewhere extraordinary. Hotels, shortlets. |

### Subcategories with Business Model Assignments

**Concierge Services** — all BOOKING_VISIT
- Airport Pickup, Private Security, Personal Assistant

**Restaurants** — mixed
- Takeout & Fast Food (`ORDER_DELIVERY`), Casual Dining / Eat-in (`VISIT_ONLY`), Fine Dining / Reservations (`BOOKING_VISIT`)

**Nightlife** — mostly VISIT_ONLY
- Clubs & Lounges (`VISIT_ONLY`), Beach Bars (`VISIT_ONLY`), Live Music Venues (`BOOKING_VISIT`)

**Health & Wellness** — mixed
- Hair Salon (`VISIT_ONLY`), Spa & Massage (`BOOKING_VISIT`), Gym & Fitness (`VISIT_ONLY`)

**Home Services** — all BOOKING_VISIT
- Cleaning, Plumbing, Electrical

**Shopping** — all ORDER_DELIVERY
- Supermarket / Groceries, Pharmacy, Fashion & Boutique

**Local Services** — mixed
- Tailoring (`VISIT_ONLY`), Laundry & Dry Cleaning (`ORDER_DELIVERY`), Car Wash (`VISIT_ONLY`), Repairs (`BOOKING_VISIT`)

**Professional Services** — all BOOKING_VISIT
- Legal, Financial & Accounting, Consulting

**Arts & Entertainment** — mixed
- Galleries & Museums (`VISIT_ONLY`), Live Shows & Concerts (`BOOKING_VISIT`), Festivals & Events (`BOOKING_VISIT`)

**Hotels & Travel** — all BOOKING_VISIT
- Hotels, Shortlets

### Key Taxonomy Schema Fields

**Category schema** (`categories` collection):
- `name` (string, required), `slug` (unique), `description` (tagline), `titles` (localized), `iconKey`, `defaultGroupType` (TOP_TILES | MORE), `displayOrder`, `isShopping`, `isService`, `isActive`

**Subcategory schema** (`subcategories` collection):
- `name` (string, required), `slug` (unique per category), `categoryId` (ref → populated as `{_id, name, slug}`), `businessModel` (ORDER_DELIVERY | VISIT_ONLY | BOOKING_VISIT), `riskTier` (LOW | MEDIUM | HIGH), `allowedFulfillmentModes` (ON_SITE | AT_HOME | BOTH), `templateId` (ref → populated as `{_id, name, version}`), `synonyms`, `displayOrder`, `isActive`

### Template Presets (10)

Templates define the dynamic form fields for business onboarding. Each subcategory can link to a template.

| Preset ID | Name | Fields | Linked Subcategories |
|-----------|------|--------|---------------------|
| `restaurant` | Restaurant | 10 | Takeout & Fast Food, Casual Dining, Fine Dining |
| `hotel` | Hotel & Shortlet | 8 | Hotels, Shortlets |
| `salon` | Hair Salon & Barber | 6 | Hair Salon, Tailoring |
| `spa_wellness` | Spa & Wellness | 6 | Spa & Massage |
| `gym` | Gym & Fitness | 6 | Gym & Fitness |
| `shopping` | Shopping & Retail | 5 | Supermarket/Groceries, Pharmacy, Fashion & Boutique |
| `home_services` | Home Services | 6 | Cleaning, Plumbing, Electrical, Repairs |
| `professional` | Professional Services | 6 | Legal, Financial & Accounting, Consulting |
| `nightlife` | Nightlife & Entertainment | 6 | Clubs & Lounges, Beach Bars, Live Music Venues, Live Shows & Concerts |
| `car_services` | Car Services | 5 | Car Wash |

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
│           ├── layout.tsx                # Dashboard shell (sidebar, topbar, auth guard)
│           ├── page.tsx                  # Dashboard home
│           ├── users/page.tsx            # Admin user management
│           ├── locations/page.tsx        # Location management
│           ├── businesses/page.tsx       # Business approval & management
│           ├── orders/page.tsx           # Order tracking
│           ├── bookings/page.tsx         # Booking management
│           ├── disputes/page.tsx         # Dispute resolution
│           ├── finance/page.tsx          # Wallets, payouts, ledger
│           ├── taxonomy/
│           │   ├── page.tsx              # Taxonomy management (groups, categories, subcategories)
│           │   └── setup/page.tsx        # Quick Setup — auto-generate all taxonomy + templates
│           ├── templates/page.tsx        # Template management (uses shared presets)
│           └── audit-logs/page.tsx       # Activity audit trail
├── components/
│   ├── landing/       # Public site: Navbar, Hero, Categories, Stats, Footer, etc.
│   ├── about/         # AboutHero, MissionAndStats, OurValues
│   ├── contact/       # ContactHero, ContactForm, ContactInfo
│   ├── partner/       # PartnerHero
│   └── ui/            # Shared UI components:
│       ├── data-table.tsx      # Generic DataTable with columns config
│       ├── modal.tsx           # Reusable modal with sizes
│       ├── status-badge.tsx    # Colored status badges
│       ├── page-header.tsx     # Page header component
│       ├── stat-card.tsx       # Dashboard stat cards
│       ├── toast-provider.tsx  # Sonner toast wrapper
│       ├── searchable-select.tsx  # Searchable dropdown select
│       ├── image-upload.tsx    # Image upload component
│       └── index.ts            # Barrel export
├── lib/
│   ├── api/client.ts           # API client (JWT auth, token refresh, error handling)
│   ├── auth/auth-context.tsx   # Auth provider with RBAC
│   ├── hooks.ts                # useApi, useMutation custom hooks
│   ├── types.ts                # All TypeScript type definitions
│   ├── utils.ts                # Formatting & utility functions
│   ├── template-presets.ts     # Shared TEMPLATE_PRESETS (10 presets with field definitions)
│   └── taxonomy-seed-data.ts   # Seed data: groups, categories, subcategories, template mapping
└── styles/globals.css          # Tailwind + custom animations
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

### Admin Dashboard Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/ruby-app/admin` | Overview with analytics |
| Locations | `/ruby-app/admin/locations` | Country/state/city management |
| Admin Users | `/ruby-app/admin/users` | Admin CRUD (super_admin only) |
| Taxonomy | `/ruby-app/admin/taxonomy` | Category groups, categories, subcategories (tabbed) |
| Quick Setup | `/ruby-app/admin/taxonomy/setup` | One-click taxonomy + template initialization |
| Templates | `/ruby-app/admin/templates` | Template management with preset suggestions |
| Businesses | `/ruby-app/admin/businesses` | Business approval & status management |
| Orders | `/ruby-app/admin/orders` | Order tracking |
| Bookings | `/ruby-app/admin/bookings` | Booking management |
| Disputes | `/ruby-app/admin/disputes` | Dispute resolution |
| Finance | `/ruby-app/admin/finance` | Wallets, payouts, ledger |
| Audit Logs | `/ruby-app/admin/audit-logs` | Activity trail |

### Sidebar Navigation (Dashboard Layout)

Defined in `src/app/ruby-app/admin/(dashboard)/layout.tsx`:
- **Overview:** Dashboard
- **Platform:** Locations, Admin Users (super only), Taxonomy, Templates
- **Operations:** Businesses, Orders, Bookings, Disputes
- **Finance & Logs:** Finance, Audit Logs

### Environment Variables
```
NEXT_PUBLIC_API_URL    # Backend API URL (client-side)
API_URL                # Backend API URL (server-side)
SESSION_SECRET         # Encryption key
NEXT_PUBLIC_APP_URL    # Frontend URL
```

### Known Backend Populate Patterns
The backend uses Mongoose `.populate()` on certain fields, meaning API responses return objects instead of plain string IDs. The frontend types and code must handle both forms:

| Field | On Type | Populated Shape | Where |
|-------|---------|----------------|-------|
| `categoryId` | `Subcategory` | `{ _id, name, slug }` | Subcategory list/detail |
| `templateId` | `Subcategory` | `{ _id, name, version }` | Subcategory list/detail |
| `locationId` | `AuditLog` | `{ _id, name }` | Audit log list/detail |
| `locationIds` | `AdminUser` | `{ _id, name, type?, status? }[]` | Admin user list |
| `parentId` | `Location` | `{ _id, name, slug, type }` | Location list |

**Pattern:** Always check `typeof field === 'object'` before accessing `.name` or `.slice()`.

---

## Backend — ruby-plus-backend

### Tech Stack
- **Framework:** NestJS 10.3 + TypeScript 5.3
- **Database:** MongoDB (Mongoose 8.1) on MongoDB Atlas
- **Auth:** JWT (Passport) + bcryptjs password hashing
- **Validation:** class-validator + class-transformer (`whitelist: true` strips unknown fields)
- **API Docs:** Swagger at `/api/docs`
- **Security:** Helmet, ThrottlerModule (rate limiting), CORS
- **API Prefix:** `/api`

### Project Structure
```
src/
├── common/
│   ├── decorators/    # @Public, @Roles, @CurrentUser, @ApiResponse
│   ├── guards/        # JWT, Roles, AdminScope, LocationGating, BusinessOwner
│   ├── interceptors/  # Transform (standardized responses), RequestId
│   ├── filters/       # HttpException (standardized errors)
│   ├── pipes/         # ParseObjectId
│   ├── interfaces/    # Shared enums: BusinessModel, AdminRole, OrderStatus, etc.
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
│   ├── media/         # File upload (S3/local)
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
| `POST /auth/refresh` | Token refresh (all roles) |
| `/admin/*` | Admin CRUD (users, locations, businesses, orders, disputes, payouts, taxonomy, templates) |
| `/public/*` | Public discovery (locations, businesses, products, services, taxonomy) |
| `/business/*` | Business owner operations (profile, products, services, orders, bookings, payouts) |
| `/user/*` | Customer operations (orders, bookings, disputes, wallets) |
| `/delivery/*` | Delivery quotes and jobs |
| `/analytics/*` | Dashboard & reporting |
| `/admin/media/upload` | File upload |

### Database Collections
`users`, `admin_users`, `locations`, `businesses`, `products`, `service_listings`, `orders`, `bookings`, `wallets`, `ledger_entries`, `payouts`, `bank_accounts`, `disputes`, `category_groups`, `categories`, `subcategories`, `templates`, `audit_logs`, `delivery_jobs`, `delivery_quotes`, `delivery_configs`, `fee_configs`, `payments`

### Key Enums

| Enum | Values | Location |
|------|--------|----------|
| `BusinessModel` | `ORDER_DELIVERY`, `VISIT_ONLY`, `BOOKING_VISIT` | `common/interfaces`, `taxonomy/schemas/subcategory.schema` |
| `CategoryGroupType` | `TOP_TILES`, `MORE`, `FEATURED`, `SEASONAL` | `common/interfaces` |
| `RiskTier` | `LOW`, `MEDIUM`, `HIGH` | `taxonomy/schemas/subcategory.schema` |
| `FulfillmentMode` | `ON_SITE`, `AT_HOME`, `BOTH` | `taxonomy/schemas/subcategory.schema` |
| `BusinessStatus` | `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `LIVE`, `REJECTED`, `SUSPENDED` | `common/interfaces` |
| `OrderStatus` | `PLACED`, `ACCEPTED`, `PREPARING`, `READY`, `DISPATCHED`, `DELIVERED`, `COMPLETED` | `common/interfaces` |
| `BookingStatus` | `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED` | `common/interfaces` |

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
```

Paginated responses also use:
```json
{
  "items": [...],
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```
The API client normalizes both formats into `ApiResponse<T>`.

### Environment Variables (Backend)
```
NODE_ENV, PORT (3000), API_PREFIX (api)
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
│                    │ /api      │                              │
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
- Backend ValidationPipe uses `whitelist: true` — only DTO-declared fields are accepted, unknown fields are stripped
- Frontend types in `lib/types.ts` must match backend DTO field names exactly (e.g. `name` not just `titles.en`, `displayOrder` not `order`, `defaultGroupType` not `groupType`)
- Backend populates certain ref fields as objects (see "Known Backend Populate Patterns" above) — always check `typeof field === 'object'` before string operations
- All API responses are standardized via Transform interceptor
- Currency is NGN (Nigerian Naira) by default
- Admin RBAC enforced at guard level with GLOBAL/LOCATION scopes
- Template presets are shared via `@/lib/template-presets` — used by both Templates page and Quick Setup
- Taxonomy seed data lives in `@/lib/taxonomy-seed-data` — the single source of truth for official categories/subcategories
- Git: `main` branch is primary, current work on `master`

---

## Session Log — Businesses Page Improvements (Feb 2026)

### Business Status Flow Constraints
- Backend only allows `approve` from `PENDING_REVIEW` status — NOT from `DRAFT` or `REJECTED`
- The full flow: DRAFT → PENDING_REVIEW → APPROVED → LIVE (or REJECTED / SUSPENDED)
- Frontend Approve/Reject buttons should only show for `PENDING_REVIEW` businesses
- DRAFT businesses haven't been submitted yet; REJECTED businesses must go back through review

### Admin Business Actions (Frontend)
The businesses page (`/ruby-app/admin/businesses`) supports these admin actions:
| Action | Available When | Requires Reason | Backend Endpoint |
|--------|---------------|-----------------|------------------|
| Approve | PENDING_REVIEW | No (optional notes) | `POST /admin/businesses/:id/approve` |
| Reject | PENDING_REVIEW | Yes | `POST /admin/businesses/:id/reject` |
| Suspend | APPROVED, LIVE | Yes | `POST /admin/businesses/:id/suspend` |
| Reinstate | SUSPENDED | No | `POST /admin/businesses/:id/reinstate` |
| Feature/Unfeature | Any | No | `PATCH /admin/businesses/:id/feature` |
| Verify CAC | CAC status PENDING | No | `POST /admin/businesses/:id/verify-cac` |
| Reject CAC | CAC status PENDING | Yes | `POST /admin/businesses/:id/verify-cac` (status: REJECTED) |
| Delete | Any (SUPER_ADMIN only) | No | `DELETE /admin/businesses/:id` |

### Admin Delete Endpoint (Added)
- **Backend:** `DELETE /admin/businesses/:id` — SUPER_ADMIN only, deletes any business regardless of status
- **Service method:** `businessesService.adminDelete(id)` in `businesses.service.ts`
- **Controller:** Added to `BusinessesAdminController` in `businesses.controller.ts`
- **Frontend API:** `api.businesses.delete(id)` in `lib/api/client.ts`

### UI Design Patterns (Businesses Page)
- **Action dropdown:** Uses a `MoreHorizontal` (3-dot) menu with color-coded items per variant (success=green, danger=red, warning=amber)
- **Modal component:** Header uses `py-3` (not `py-4`) to avoid gap at top; supports optional `subtitle` prop
- **Filter bar:** Wrapped in a `card` container; search input has `bg-gray-50` background; custom select with ChevronDown overlay
- **Section labels:** Use `text-[11px] font-semibold text-gray-500 uppercase tracking-wider` consistently
- **Action confirmation modal:** Color-coded alert banner (red for danger, blue for positive actions); spinner in confirm button while processing
- **Contact items, addresses, hours:** Displayed in `bg-gray-50 rounded-lg` cards for visual grouping

### Util Function Types
- All populated field helper functions in `lib/utils.ts` (`getOwnerName`, `getCategoryName`, `getLocationName`, etc.) use `any` parameter type to avoid TypeScript index signature conflicts with specific populated interfaces like `BusinessCategoryPopulated`
- These functions safely handle both string IDs and populated objects via runtime `typeof` checks

---

## Session Log — Enhanced Add Product/Service (Business App, Feb 2026)

### Overview
Implemented a robust, category-aware product and service creation flow for the Business Mobile App (`ruby-business-app`). The creation screens now adapt dynamically based on the logged-in business's subcategory, support business-created product categories, image uploads, variations, add-ons, availability configuration, and template-driven dynamic fields — all correctly mapping to backend schemas.

### Architecture Decisions
1. **Business Model → Products vs Services:** `ORDER_DELIVERY` → "Products" tab + product screens; `VISIT_ONLY`/`BOOKING_VISIT` → "Services" tab + service screens
2. **Product categories are business-defined strings** — the `category` field on products. `useProductCategories()` extracts distinct values client-side from existing products
3. **Template-driven dynamic fields** — 10 template presets mapped by subcategory slug, rendered by `TemplateFields` component. Stored in `metadata` (products) or `templateData` (services)
4. **Backward-compat pattern** — Product type keeps both old (`price`, `stock`, `media`) and new (`basePrice`, `stockQuantity`, `images`) field names; components check both with `??` fallback
5. **Nested service objects** — Service types changed from flat (`price`, `pricingType`, `durationMinutes`) to nested (`pricing: { type, basePrice }`, `duration: { minutes }`) matching backend DTOs

### Files Created (Business App)

| File | Purpose |
|------|---------|
| `src/utils/business-model.ts` | Maps subcategory slugs → template presets; determines products vs services; dynamic tab labels/icons |
| `src/constants/product-fields.ts` | Mobile-compatible `TEMPLATE_PRESETS` for all 10 business categories with field definitions |
| `src/components/products/ImagePickerGrid.tsx` | Multi-image picker with primary selection, upload progress |
| `src/components/products/CategoryPicker.tsx` | Horizontal chip selector with inline "Add New" |
| `src/components/products/VariationBuilder.tsx` | Repeatable variation groups (SINGLE/MULTIPLE type, options with price adjustments) |
| `src/components/products/AddOnBuilder.tsx` | Repeatable add-on items with name, price, isRequired |
| `src/components/products/NutritionalInfo.tsx` | Nutrition fields + allergen multi-select (restaurants only) |
| `src/components/products/AvailabilityWindow.tsx` | Day selection, time range, prep time |
| `src/components/services/AvailabilitySlotBuilder.tsx` | Per-day slot configuration with capacity |
| `src/components/services/CancellationPolicyCard.tsx` | Cancellation hours and fee percent inputs |
| `src/components/services/TemplateFields.tsx` | Renders dynamic fields from template preset |

### Files Modified (Business App)

| File | Change |
|------|--------|
| `src/types/product.ts` | Added `ProductImage`, `NutritionalInfo`, `ProductVariationOption`; `price` → `basePrice`; `stock` → `stockQuantity`; legacy compat fields kept |
| `src/types/service.ts` | Added `ServicePricing`, `ServiceDuration`, `TravelFeeConfig`, `CancellationPolicy`, `ServiceAvailabilitySlot`; flat → nested structure; legacy compat fields kept |
| `src/utils/validation.ts` | Expanded `productSchema` (variations, addOns, images, nutritionalInfo, availability) and `serviceSchema` (nested pricing/duration, availability, cancellation) |
| `src/hooks/useProducts.ts` | Added `useProductCategories()` hook |
| `app/(tabs)/_layout.tsx` | Dynamic tab label/icon based on business model |
| `app/(tabs)/products.tsx` | Full rewrite: dynamic header, status/category filters, products OR services list, service card rendering |
| `app/(main)/products/create.tsx` | Full rewrite: 8-section form with all new components |
| `app/(main)/services/create.tsx` | Full rewrite: 9-section form with nested pricing/duration, availability slots, cancellation policy, template fields |
| `app/(main)/products/[id].tsx` | Fixed `price` → `basePrice` and `stock` → `stockQuantity` with fallbacks |
| `app/(main)/services/[id].tsx` | Rewritten to use useState with nested objects instead of flat react-hook-form fields |
| `src/components/products/ProductCard.tsx` | Fixed `media` → `images` and `price` → `basePrice` with fallbacks |
| `src/components/daily-operations/InventoryProductItem.tsx` | Fixed `media` → `images` and `price` → `basePrice` with fallbacks |
| `app/(main)/services/index.tsx` | Fixed to use nested `pricing`/`duration` with flat field fallbacks |

### Critical Data Mismatches Fixed
| Frontend (Before) | Backend Expects | Fix Applied |
|-------------------|----------------|-------------|
| `price` on Product | `basePrice` | Type uses `basePrice`; components fallback `product.basePrice ?? product.price` |
| `stock` on Product | `stockQuantity` | Type uses `stockQuantity`; components fallback `product.stockQuantity ?? product.stock` |
| `media` on Product | `images: ProductImage[]` | Type uses `images`; components fallback `product.images?.[0]?.url \|\| product.media?.[0]?.url` |
| Flat `price`/`pricingType`/`durationMinutes` on Service | Nested `pricing: { type, basePrice }` / `duration: { minutes }` | Types use nested objects; detail screens use `service.pricing?.type \|\| service.pricingType` pattern |

### Subcategory → Template Mapping
27 subcategory slugs map to 10 template preset IDs via `SUBCATEGORY_TEMPLATE_MAP` in `src/utils/business-model.ts`. Used by `getTemplatePresetId()` to determine which dynamic fields to show during product/service creation.

### Product Create Screen Sections
1. Images (ImagePickerGrid, up to 8)
2. Basic Info (name, description, CategoryPicker)
3. Pricing & Inventory (basePrice, compareAtPrice, trackInventory toggle, stockQuantity, isAvailable toggle)
4. Variations (expandable, VariationBuilder)
5. Add-Ons (expandable, AddOnBuilder)
6. Template Fields (conditional on subcategory, TemplateFields)
7. Availability (expandable, AvailabilityWindow)
8. Nutritional Info (restaurant subcategories only, NutritionalInfo)

### Service Create Screen Sections
1. Media (ImagePickerGrid, up to 6)
2. Basic Info (name, description)
3. Pricing (type chips: FIXED/STARTS_FROM/QUOTE_REQUIRED, basePrice, depositPercent)
4. Duration (minutes, flexible toggle, min/max if flexible)
5. Fulfillment (mode chips: ON_SITE/AT_HOME/BOTH, TravelFeeConfig if applicable)
6. Availability (expandable, AvailabilitySlotBuilder)
7. Cancellation Policy (expandable, CancellationPolicyCard)
8. Details (expandable: requirements, includes, excludes repeatable lists)
9. Template Fields (conditional on subcategory, TemplateFields)

---

## Session Log — Fix Product/Service Display in Customer App (Feb 2026)

### Overview
Fixed critical display bugs in the customer mobile app (`ruby-app-mobile`) where products and services were not rendering correctly due to type mismatches between the frontend types and backend schemas. The business app had been updated but the customer app still used outdated types.

### Bugs Fixed
1. **Product prices showed ₦0** — app read `product.price` but backend sends `basePrice`
2. **Product images didn't render** — app expected `images: string[]` but backend sends `images: ProductImage[]` (objects with `url`)
3. **Service prices showed ₦0** — app read `s.price` but backend sends `pricing: { type, basePrice }`
4. **Service duration showed "[object Object] min"** — app treated `duration` as number but backend sends `{ minutes, isFlexible }`
5. **Booking screen had no services** — tried `(business as any).services` which is empty; services are fetched separately via `useBusinessServices`
6. **Cart stored wrong prices** — `addToCart` passed `product.price` (undefined) causing checkout totals of NaN

### Architecture Decision: Location-Based Fetching
Products/services are fetched per `businessId`, and location filtering happens at the business discovery level. This is architecturally correct — no changes needed.

### Backward-Compat Helper Pattern
Added helper functions in `src/utils/format.ts` that handle both new and legacy schema fields:
- `getProductPrice(product)` — `product.basePrice ?? product.price ?? 0`
- `getProductComparePrice(product)` — `product.compareAtPrice ?? product.comparePrice`
- `getProductImageUrl(product)` — handles `ProductImage[]` objects or `string[]`
- `getServicePrice(service)` — `service.pricing?.basePrice ?? service.price ?? 0`
- `getServicePriceDisplay(service)` — handles QUOTE_REQUIRED, STARTS_FROM, FIXED
- `getServiceDurationMinutes(service)` — handles nested `{ minutes }` or flat number
- `formatDuration(service)` — with `~` prefix for flexible durations
- `getServiceImageUrl(service)` — handles `media[]` or legacy `images[]`

### Files Modified (Customer App)
| File | Change |
|------|--------|
| `src/types/business.ts` | Added `ProductImage`, `ProductVariation`, `ProductAddOn`, `ServicePricing`, `ServiceDuration`, `ServiceMedia`, `CancellationPolicy`, `ServiceAvailabilitySlot`; updated `Product` (`basePrice`, `images: ProductImage[]`, `variations`) and `ServiceListing` (nested `pricing`/`duration`, `fulfillmentMode`, `media`); legacy compat fields kept |
| `src/utils/format.ts` | Added 8 backward-compat helpers for product/service field extraction |
| `src/components/business/ProductItem.tsx` | Fixed image, price, comparePrice using helpers |
| `app/(main)/business/[id].tsx` | Fixed addToCart (price/image), service price display (getServicePriceDisplay), service duration display (formatDuration) |
| `app/(main)/booking/create.tsx` | Fixed services data source (useBusinessServices hook), price calculations, service card display |
| `src/stores/cart.store.ts` | Updated CartItem for variations/addOns, updated getSubtotal, added cart sanitization on load |
