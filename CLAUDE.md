# CLAUDE.md — Ruby+ Web

## Project Overview

Ruby+ web admin dashboard and public landing pages. A Yelp-style marketplace connecting Nigerian businesses with diaspora Nigerians and tourists.

- **Framework:** Next.js 15.1 (App Router) + React 19 + TypeScript 5.7
- **Styling:** Tailwind CSS 3.4 with custom `ruby-*` color palette (primary: `#FD362F`)
- **Backend:** NestJS REST API (separate repo), MongoDB — see `claude.MD` for full platform docs

## Commands

```bash
npm run dev       # Dev server on port 3000
npm run build     # Production build
npm run start     # Production server (0.0.0.0:3000)
npm run lint      # ESLint
```

No test framework is configured. No CI/CD pipeline exists.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                              # Landing page
│   ├── about/ contact/ partner/              # Public pages
│   └── ruby-app/admin/
│       ├── (auth)/login/page.tsx             # Admin login
│       └── (dashboard)/                      # Protected admin area
│           ├── layout.tsx                    # Dashboard shell (sidebar, topbar, auth guard)
│           ├── page.tsx                      # Dashboard home
│           ├── businesses/page.tsx           # Business management (~130KB, largest file)
│           ├── orders/ bookings/ disputes/   # Operations pages
│           ├── finance/ audit-logs/          # Finance & logs
│           ├── taxonomy/ templates/          # Platform config
│           ├── locations/ users/             # Admin management
│           ├── customers/ delivery/          # Customer & delivery
│           ├── campaigns/ promos/ broadcasts/ notifications/ emergency/
│           └── ...
├── components/
│   ├── ui/                  # Shared: DataTable, Modal, StatusBadge, PageHeader, StatCard, etc.
│   ├── landing/             # Public site: Navbar, Hero, Footer, etc.
│   ├── about/ contact/ partner/
│   └── ...
├── lib/
│   ├── api/client.ts        # API client — JWT auth, token refresh, error handling
│   ├── auth/auth-context.tsx # AuthContext with RBAC (roles, scopes, location access)
│   ├── hooks.ts             # useApi<T>, useMutation<TData, TInput>
│   ├── types.ts             # All TypeScript types (~1000+ lines, mirrors backend DTOs)
│   ├── utils.ts             # Formatting, currency, status colors, populated-field helpers
│   ├── template-presets.ts  # 10 template presets for business onboarding
│   └── taxonomy-seed-data.ts # Seed data for categories/subcategories
└── styles/globals.css       # Tailwind + custom animations
```

## Code Conventions

### Imports & Paths
- **Path alias:** `@/*` maps to `./src/*` — use for all imports
- **Barrel exports:** UI components export via `@/components/ui/index.ts`

### Components & Pages
- Dashboard pages use `'use client'` directive (required for hooks)
- Page pattern: auth check → `useApi` fetch → render with `DataTable` / custom UI
- Forms use **React Hook Form + Zod** for validation
- Icons from **Lucide React** only
- Toast notifications via **Sonner** (`toast.success()`, `toast.error()`)

### Styling
- **Tailwind utility classes** — no CSS modules or styled-components
- Custom palette: `ruby-50` through `ruby-900` (red brand color)
- Fonts: `font-poppins` (primary sans), `font-playfair` (display serif)
- Custom CSS classes in globals.css: `.card`, `.badge-*`, `.btn-primary`, `.skeleton`
- Animations: `.animate-fade-in`, `.animate-slide-up`, `.animate-slide-down`

### State Management
- **Auth:** React Context (`useAuth()` hook from `AuthContext`)
- **Data fetching:** Custom hooks — no Redux, Zustand, React Query, or SWR
- **No global state** beyond auth context

## API & Data Patterns

### API Client (`src/lib/api/client.ts`)
- Centralized fetch wrapper with JWT `Authorization: Bearer` header
- Auto token refresh on 401 responses (with request deduplication)
- Tokens stored in `localStorage`: `ruby_access_token`, `ruby_refresh_token`, `ruby_admin`
- Standard response: `ApiResponse<T>` with `{ success, data, error?, meta? }`
- File uploads via `FormData`

### Data Fetching Hooks (`src/lib/hooks.ts`)
```typescript
// GET requests — auto-fetches on mount/dependency change
const { data, meta, isLoading, error, refetch } = useApi<T>(
  () => api.endpoint.list(params),
  [dependencies],
  { enabled: boolean }
);

// Mutations (POST/PUT/DELETE)
const { mutate, isLoading } = useMutation<TData, TInput>(
  (input) => api.endpoint.create(input),
  { onError: (msg) => toast.error(msg) }
);
```

### Populated Fields (Critical Pattern)
The backend populates Mongoose refs as objects. **Always check type before accessing:**
```typescript
// ✅ Correct
typeof item.categoryId === 'object' ? item.categoryId.name : item.categoryId

// ❌ Wrong — will crash if populated
item.categoryId.slice(0, 8)
```

Helper functions in `utils.ts`: `getOwnerName()`, `getCategoryName()`, `getLocationName()`, etc.

### Common Populated Fields
| Field | On Type | Populated Shape |
|-------|---------|----------------|
| `categoryId` | Subcategory | `{ _id, name, slug }` |
| `templateId` | Subcategory | `{ _id, name, version }` |
| `locationId` | AuditLog | `{ _id, name }` |
| `locationIds` | AdminUser | `{ _id, name }[]` |
| `parentId` | Location | `{ _id, name, slug, type }` |

## Auth & RBAC

### Roles
| Role | Access |
|------|--------|
| `super_admin` | Full platform access, manage all admins |
| `admin` | General admin privileges |
| `location_admin` | Location-scoped access only |
| `support` | Customer support operations |
| `finance` | Finance operations |
| `content` | Content management |

### Scopes
- `GLOBAL` — access all locations
- `LOCATION` — access only assigned locations

### Auth Usage
```typescript
const { admin, isAuthenticated, isSuperAdmin, hasRole, hasLocationAccess } = useAuth();
```

## UI Component Patterns

### DataTable (`src/components/ui/data-table.tsx`)
Generic table with column configuration, pagination, and row actions.

### Modal (`src/components/ui/modal.tsx`)
Portal-based modal with ESC-to-close, multiple sizes. Header uses `py-3`.

### StatusBadge (`src/components/ui/status-badge.tsx`)
Color-coded badges. Status colors mapped via `getStatusColor()` in `utils.ts`.

### Action Pattern
3-dot dropdown menu (`MoreHorizontal`) with color-coded items → confirmation modal → API call.

## Business Status Flow

```
DRAFT → PENDING_REVIEW → APPROVED → LIVE
                       ↘ REJECTED
         APPROVED/LIVE → SUSPENDED → (reinstate) → previous status
```

- **Approve/Reject** only available for `PENDING_REVIEW` businesses
- **Suspend** available for `APPROVED` or `LIVE`
- **Delete** requires `SUPER_ADMIN` role

## Environment Variables

```bash
NEXT_PUBLIC_API_URL    # Backend API URL for client-side requests
API_URL                # Backend API URL for server-side requests
SESSION_SECRET         # Encryption key for sessions
NEXT_PUBLIC_APP_URL    # This app's public URL
```

Copy `.env.example` to `.env.local` to get started.

## Key Business Domain

### Business Models (on Subcategory)
| Model | Enum | Customer Action |
|-------|------|-----------------|
| Model 1 | `ORDER_DELIVERY` | Orders goods, gets delivery |
| Model 2 | `VISIT_ONLY` | Walks in / visits |
| Model 3 | `BOOKING_VISIT` | Books/reserves, then visits |

### Taxonomy Hierarchy
Category Groups → Categories → Subcategories (each with a `businessModel`)

### Currency
NGN (Nigerian Naira) — formatted via `formatCurrency()` in `utils.ts`.

## Gotchas

1. **`businesses/page.tsx` is ~130KB** — very large single file, be cautious with full reads
2. **No test suite** — validate changes manually or by running `npm run build`
3. **Types must match backend DTOs exactly** — field names in `lib/types.ts` mirror backend schemas
4. **Populated fields** — never assume a ref field is a string; use helpers or `typeof` checks
5. **Template presets are shared** — `lib/template-presets.ts` is used by both Templates page and Quick Setup
6. **WSL2 HMR** — `next.config.ts` has a webpack polling workaround for WSL2 file watching
7. **No Prettier** — only ESLint is configured for code quality

## Additional Reference

See `claude.MD` in the repo root for comprehensive platform documentation including:
- Full backend API endpoint reference
- Database collections and schemas
- Mobile app architecture
- Session logs with implementation details
