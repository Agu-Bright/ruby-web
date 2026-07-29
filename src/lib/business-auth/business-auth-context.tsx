'use client';

/**
 * BusinessAuthContext — merchant-scoped session on the web dashboard.
 *
 * Deliberately parallel to the admin `AuthContext` in `src/lib/auth/`:
 * separate localStorage keys, no shared reducer, no shared RBAC helpers.
 * A single browser can host both an admin session AND a merchant session
 * without collision (e.g. an ops rep debugging a real merchant account
 * side-by-side with their own admin login).
 *
 * localStorage keys:
 *   - ruby_business_access_token
 *   - ruby_business_refresh_token
 *   - ruby_business_user              (JSON — {_id,email,firstName,lastName,phone,isEmailVerified,isPhoneVerified})
 *   - ruby_business_selected_business (JSON — {_id,name,status?})
 *
 * The context loads from localStorage on mount so hard-reloads survive.
 * `login()` normalises the backend's mixed `id`/`_id` fields into `_id`
 * to match the rest of the platform's type convention.
 *
 * Business-status routing (DRAFT/PENDING_REVIEW/REJECTED/SUSPENDED)
 * lives in the dashboard shell layout — this context only exposes the
 * status so the shell can decide where to send the user. The context
 * itself never redirects.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '@/lib/api';
import type { CustomField } from '@/lib/types';

// ─── Storage keys ──────────────────────────────────────────────────────
export const BIZ_ACCESS_TOKEN_KEY = 'ruby_business_access_token';
export const BIZ_REFRESH_TOKEN_KEY = 'ruby_business_refresh_token';
export const BIZ_USER_KEY = 'ruby_business_user';
export const BIZ_SELECTED_BUSINESS_KEY = 'ruby_business_selected_business';

// ─── Types ─────────────────────────────────────────────────────────────
export type BusinessStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'LIVE'
  | 'REJECTED'
  | 'SUSPENDED';

export interface BusinessUser {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  phoneVerifiedAt?: string;
  isAssisted?: boolean;
  assistedRole?: 'SUPER_ADMIN' | 'LOCATION_ADMIN' | 'SUPPORT';
}

export type BusinessModel = 'ORDER_DELIVERY' | 'VISIT_ONLY' | 'BOOKING_VISIT';

export interface PopulatedSubcategory {
  _id: string;
  name?: string;
  slug?: string;
  businessModel?: BusinessModel;
  productFields?: CustomField[];
  serviceFields?: unknown[];
  allowedFulfillmentModes?: string[];
}

export interface SelectedBusiness {
  _id: string;
  name: string;
  status?: BusinessStatus;
  logoUrl?: string;
  parentBusinessId?: string;
  isParent?: boolean;

  // ── Hydrated after login (M5 visibility gate) ──────────────────────
  // These land when the auth context calls `api.businessMe.getBusinessProfile`
  // post-login. The sidebar reads `businessModel` + `sellsProducts` to
  // decide whether to show the Products / Services entries. Undefined
  // = "still hydrating" — the sidebar defaults to showing everything.
  businessModel?: BusinessModel;
  sellsProducts?: boolean;
  subcategoryId?: string;
  subcategorySlug?: string;
  productFields?: CustomField[];
  categoryId?: string;
  locationId?: string;

  // ── CAC state (used by the CAC lead card, mobile P153 parity) ──────
  // When present, the "Register your business with CAC" card is hidden
  // because the merchant already has CAC on file.
  cacNumber?: string;
  cacStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NOT_SUBMITTED';
  city?: string;
  phone?: string;
}

interface BusinessAuthContextValue {
  user: BusinessUser | null;
  business: SelectedBusiness | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<{
    hasBusinesses: boolean;
    business: SelectedBusiness | null;
  }>;
  loginWithAssistedSession: (data: any) => void;
  logout: () => void;
  setBusiness: (b: SelectedBusiness | null) => void;

  /**
   * Re-fetch the current business's populated profile and merge the
   * hydration fields (businessModel / sellsProducts / subcategoryId /
   * categoryId / locationId) into the SelectedBusiness. Called
   * automatically on login + mount; can be called manually after actions
   * that mutate the business (e.g. onboarding step completions).
   */
  refreshBusinessProfile: () => Promise<void>;

  /**
   * `true` when the current business is in a state that gates the merchant
   * out of the dashboard (DRAFT / PENDING_REVIEW / REJECTED / SUSPENDED).
   * The dashboard shell reads this and redirects to `/business/business-pending`.
   */
  isBusinessGated: boolean;
}

// ─── Context ───────────────────────────────────────────────────────────
const BusinessAuthContext = createContext<BusinessAuthContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────
export function BusinessAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BusinessUser | null>(null);
  const [business, setBusinessState] = useState<SelectedBusiness | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate the SelectedBusiness with populated subcategory info. Called
  // right after login and once on mount when we have a business id
  // already. Silently no-ops on failure so the shell stays usable — the
  // sidebar just falls back to showing every catalog entry.
  const refreshBusinessProfile = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const bizJson = localStorage.getItem(BIZ_SELECTED_BUSINESS_KEY);
    if (!bizJson) return;
    let current: SelectedBusiness;
    try {
      current = JSON.parse(bizJson) as SelectedBusiness;
    } catch {
      return;
    }
    if (!current?._id) return;
    try {
      const res = await api.businessMe.getBusinessProfile(current._id);
      const profile = res.data;
      if (!profile) return;
      const sub = profile.subcategoryId;
      const populatedSub =
        sub && typeof sub === 'object' ? (sub as PopulatedSubcategory) : null;
      // Backend `GET /business/:id` returns the full doc — pluck the
      // CAC + contact fields for the CAC-registration lead card (P153
      // parity). Contact fields are also useful for pre-filling other
      // support conversations later.
      const contact = (profile as unknown as { contact?: { phone?: string } }).contact;
      const address = (profile as unknown as { address?: { city?: string } }).address;
      const enriched: SelectedBusiness = {
        ...current,
        _id: profile._id || current._id,
        name: profile.name || current.name,
        status: (profile.status as BusinessStatus) || current.status,
        logoUrl: profile.logoUrl || current.logoUrl,
        isParent: profile.isParent ?? current.isParent,
        parentBusinessId:
          profile.parentBusinessId ?? current.parentBusinessId,
        sellsProducts: profile.sellsProducts ?? current.sellsProducts,
        businessModel:
          populatedSub?.businessModel ?? current.businessModel,
        subcategoryId:
          populatedSub?._id ??
          (typeof sub === 'string' ? sub : current.subcategoryId),
        subcategorySlug: populatedSub?.slug ?? current.subcategorySlug,
        productFields: populatedSub?.productFields ?? current.productFields,
        categoryId:
          typeof profile.categoryId === 'object'
            ? profile.categoryId?._id
            : profile.categoryId ?? current.categoryId,
        locationId:
          typeof profile.locationId === 'object'
            ? profile.locationId?._id
            : profile.locationId ?? current.locationId,
        cacNumber:
          (profile as unknown as { cacNumber?: string }).cacNumber ??
          current.cacNumber,
        cacStatus:
          (profile as unknown as { cacStatus?: SelectedBusiness['cacStatus'] })
            .cacStatus ?? current.cacStatus,
        phone: contact?.phone ?? current.phone,
        city: address?.city ?? current.city,
      };
      localStorage.setItem(
        BIZ_SELECTED_BUSINESS_KEY,
        JSON.stringify(enriched),
      );
      setBusinessState(enriched);
    } catch {
      // Silent — network or auth error. The sidebar just keeps its
      // previous visibility state, which is safe (defaults to showing).
    }
  }, []);

  // Load persisted session on mount. Safe against malformed JSON — if
  // anything throws, we clear the keys and land the merchant on the login
  // screen rather than crashing the shell.
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem(BIZ_ACCESS_TOKEN_KEY);
      const userJson = localStorage.getItem(BIZ_USER_KEY);
      const bizJson = localStorage.getItem(BIZ_SELECTED_BUSINESS_KEY);
      if (token && userJson) {
        const parsed = JSON.parse(userJson) as BusinessUser;
        if (parsed && parsed._id) setUser(parsed);
        if (bizJson) {
          const parsedBiz = JSON.parse(bizJson) as SelectedBusiness;
          if (parsedBiz && parsedBiz._id) setBusinessState(parsedBiz);
        }
        // Fire-and-forget: re-hydrate populated fields in the background
        // (businessModel / sellsProducts change rarely but can drift when
        // the merchant edits their business on mobile).
        void refreshBusinessProfile();
      }
    } catch {
      // Corrupt storage — clear and start fresh.
      clearBusinessTokens();
    } finally {
      setIsLoading(false);
    }
  }, [refreshBusinessProfile]);

  const login = useCallback<BusinessAuthContextValue['login']>(
    async (email, password) => {
      const res = await api.businessAuth.login({ email, password });
      const data = res.data;

      // Backend response can put tokens at top-level OR nested under
      // `tokens`. Support both shapes so future API tweaks don't break login.
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;
      if (!accessToken || !refreshToken) {
        throw new Error('Login succeeded but no tokens were returned');
      }

      // Normalise user shape — backend uses `id` on some paths, `_id` on
      // others. Everywhere else on the platform we use `_id`.
      const normalizedUser: BusinessUser = {
        _id: data.user._id || data.user.id || '',
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        phone: data.user.phone,
        isEmailVerified: data.user.isEmailVerified,
        isPhoneVerified: data.user.isPhoneVerified,
        phoneVerifiedAt: data.user.phoneVerifiedAt,
      };

      // Persist tokens BEFORE state so `api.*` calls that fire during the
      // same tick can see the token via localStorage.
      localStorage.setItem(BIZ_ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(BIZ_REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(BIZ_USER_KEY, JSON.stringify(normalizedUser));

      // Mirror business into the admin-side token key too. The existing
      // `api.*` request helper reads `ruby_access_token` unconditionally —
      // until the per-client refactor lands (planned for M6), we prime that
      // slot with the business token so business hooks flow through the
      // same interceptor. Admin sessions would overwrite this key on
      // their own login; the two never race in practice because they
      // live on different subdomains.
      localStorage.setItem('ruby_access_token', accessToken);
      localStorage.setItem('ruby_refresh_token', refreshToken);

      const nextBusiness: SelectedBusiness | null = data.business
        ? {
            _id: (data.business._id || data.business.id) as string,
            name: data.business.name,
            status: data.business.status as BusinessStatus | undefined,
          }
        : null;
      if (nextBusiness) {
        localStorage.setItem(
          BIZ_SELECTED_BUSINESS_KEY,
          JSON.stringify(nextBusiness),
        );
      } else {
        localStorage.removeItem(BIZ_SELECTED_BUSINESS_KEY);
      }

      setUser(normalizedUser);
      setBusinessState(nextBusiness);

      // Hydrate the populated subcategory + sellsProducts in the
      // background — the sidebar reads these to decide whether to show
      // Products vs Services (M5 visibility gate). Awaiting would slow
      // the login redirect; the sidebar handles the transient "still
      // hydrating" state by defaulting to show-all.
      if (nextBusiness) {
        void refreshBusinessProfile();
      }

      return {
        hasBusinesses: !!data.hasBusinesses,
        business: nextBusiness,
      };
    },
    [refreshBusinessProfile],
  );

  const loginWithAssistedSession = useCallback((data: any) => {
    const accessToken = data?.accessToken;
    const nextBusiness = data?.business
      ? { _id: data.business._id || data.business.id, name: data.business.name, status: data.business.status as BusinessStatus | undefined }
      : null;
    if (!accessToken || !nextBusiness?._id || !data?.user) throw new Error('The assisted session could not be started.');
    const nextUser: BusinessUser = { _id: data.user._id || data.user.id, email: data.user.email, firstName: data.user.firstName, lastName: data.user.lastName, isAssisted: true, assistedRole: data.user.assistedRole };
    localStorage.setItem(BIZ_ACCESS_TOKEN_KEY, accessToken);
    localStorage.removeItem(BIZ_REFRESH_TOKEN_KEY);
    localStorage.setItem(BIZ_USER_KEY, JSON.stringify(nextUser));
    localStorage.setItem(BIZ_SELECTED_BUSINESS_KEY, JSON.stringify(nextBusiness));
    localStorage.setItem('ruby_access_token', accessToken);
    localStorage.removeItem('ruby_refresh_token');
    setUser(nextUser);
    setBusinessState(nextBusiness);
    void refreshBusinessProfile();
  }, [refreshBusinessProfile]);

  const logout = useCallback(() => {
    clearBusinessTokens();
    setUser(null);
    setBusinessState(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/business/login';
    }
  }, []);

  const setBusiness = useCallback((b: SelectedBusiness | null) => {
    setBusinessState(b);
    if (typeof window === 'undefined') return;
    if (b) {
      localStorage.setItem(BIZ_SELECTED_BUSINESS_KEY, JSON.stringify(b));
    } else {
      localStorage.removeItem(BIZ_SELECTED_BUSINESS_KEY);
    }
  }, []);

  const isBusinessGated = useMemo(() => {
    if (!business?.status) return false;
    return (
      business.status === 'DRAFT' ||
      business.status === 'PENDING_REVIEW' ||
      business.status === 'REJECTED' ||
      business.status === 'SUSPENDED'
    );
  }, [business?.status]);

  const value = useMemo<BusinessAuthContextValue>(
    () => ({
      user,
      business,
      isAuthenticated: !!user,
      isLoading,
      login,
      loginWithAssistedSession,
      logout,
      setBusiness,
      refreshBusinessProfile,
      isBusinessGated,
    }),
    [
      user,
      business,
      isLoading,
      login,
      loginWithAssistedSession,
      logout,
      setBusiness,
      refreshBusinessProfile,
      isBusinessGated,
    ],
  );

  return (
    <BusinessAuthContext.Provider value={value}>
      {children}
    </BusinessAuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────
export function useBusinessAuth(): BusinessAuthContextValue {
  const ctx = useContext(BusinessAuthContext);
  if (!ctx) {
    throw new Error(
      'useBusinessAuth must be used inside a <BusinessAuthProvider>',
    );
  }
  return ctx;
}

// ─── Helpers ───────────────────────────────────────────────────────────
export function clearBusinessTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BIZ_ACCESS_TOKEN_KEY);
  localStorage.removeItem(BIZ_REFRESH_TOKEN_KEY);
  localStorage.removeItem(BIZ_USER_KEY);
  localStorage.removeItem(BIZ_SELECTED_BUSINESS_KEY);
}

export function getBusinessAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(BIZ_ACCESS_TOKEN_KEY);
}
