import type { ApiResponse } from "@/lib/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

function generateRequestId(): string {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  noAuth?: boolean;
};

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ruby_access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ruby_refresh_token");
}

function setTokens(access: string, refresh: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("ruby_access_token", access);
  localStorage.setItem("ruby_refresh_token", refresh);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ruby_access_token");
  localStorage.removeItem("ruby_refresh_token");
  localStorage.removeItem("ruby_admin");
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/admin/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const json: ApiResponse<{ accessToken: string; refreshToken: string }> =
        await res.json();
      if (json.success && json.data) {
        setTokens(json.data.accessToken, json.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    params,
    headers: extraHeaders,
    noAuth,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id": generateRequestId(),
    ...extraHeaders,
  };

  if (!noAuth) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = buildUrl(path, params);

  let res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // If 401, try refreshing the token once
  if (res.status === 401 && !noAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
      }
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    // If still 401, clear tokens and redirect to login
    if (res.status === 401) {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/ruby-app/admin/login";
      }
      throw new ApiClientError("Session expired", "AUTH_EXPIRED", 401);
    }
  }

 const json = await res.json().catch(() => ({
    success: false,
    data: null as unknown as T,
    error: { code: 'PARSE_ERROR', message: 'Failed to parse response' },
  }));

  if (!res.ok) {
    throw new ApiClientError(
      json.error?.message || json.message || `Request failed with status ${res.status}`,
      json.error?.code || json.code || 'UNKNOWN_ERROR',
      res.status,
      json.error?.details,
    );
  }

  if (json.success !== undefined) {
    if (!json.success) {
      throw new ApiClientError(
        json.error?.message || 'Request failed',
        json.error?.code || 'UNKNOWN_ERROR',
        res.status,
      );
    }
    return json;
  }

  return { success: true, data: json as T } as ApiResponse<T>;
}

// ============================================================
// API Client Methods
// ============================================================
export const api = {
  // Auth
  auth: {
    login: (data: { email: string; password: string }) =>
      request<{
        accessToken: string;
        refreshToken: string;
        admin: import("@/lib/types").AdminUser;
      }>("/auth/admin/login", { method: "POST", body: data, noAuth: true }),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>(
        "/admin/auth/refresh",
        { method: "POST", body: { refreshToken }, noAuth: true },
      ),
    me: () => request<import("@/lib/types").AdminUser>("/admin/auth/me"),
    logout: () => request<void>("/admin/auth/logout", { method: "POST" }),
  },

  // Admin Users
  adminUsers: {
    list: (params?: import("@/lib/types").PaginationParams) =>
      request<import("@/lib/types").AdminUser[]>("/admin/users", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").AdminUser>(`/admin/users/${id}`),
    create: (data: import("@/lib/types").CreateAdminRequest) =>
      request<import("@/lib/types").AdminUser>("/admin/users", {
        method: "POST",
        body: data,
      }),
    update: (id: string, data: import("@/lib/types").UpdateAdminRequest) =>
      request<import("@/lib/types").AdminUser>(`/admin/users/${id}`, {
        method: "PATCH",
        body: data,
      }),
    delete: (id: string) =>
      request<void>(`/admin/users/${id}`, { method: "DELETE" }),
  },

  // Locations
  locations: {
    list: (params?: import("@/lib/types").LocationFilterParams) =>
      request<import("@/lib/types").Location[]>("/admin/locations", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Location>(`/admin/locations/${id}`),
    create: (data: import("@/lib/types").CreateLocationRequest) =>
      request<import("@/lib/types").Location>("/admin/locations", {
        method: "POST",
        body: data,
      }),
    update: (id: string, data: import("@/lib/types").UpdateLocationRequest) =>
      request<import("@/lib/types").Location>(`/admin/locations/${id}`, {
        method: "PATCH",
        body: data,
      }),
    activate: (id: string) =>
      request<import("@/lib/types").Location>(
        `/admin/locations/${id}/activate`,
        { method: "POST" },
      ),
    deactivate: (id: string) =>
      request<import("@/lib/types").Location>(
        `/admin/locations/${id}/deactivate`,
        { method: "POST" },
      ),
    search: (query: string) =>
      request<import("@/lib/types").Location[]>("/admin/locations/search", {
        params: { q: query },
      }),
  },

  // Taxonomy
  categoryGroups: {
    list: () =>
      request<import("@/lib/types").CategoryGroup[]>("/admin/taxonomy/groups"),
    create: (data: Partial<import("@/lib/types").CategoryGroup>) =>
      request<import("@/lib/types").CategoryGroup>("/admin/taxonomy/groups", {
        method: "POST",
        body: data,
      }),
    update: (id: string, data: Partial<import("@/lib/types").CategoryGroup>) =>
      request<import("@/lib/types").CategoryGroup>(
        `/admin/taxonomy/groups/${id}`,
        { method: "PATCH", body: data },
      ),
    delete: (id: string) =>
      request<void>(`/admin/taxonomy/groups/${id}`, { method: "DELETE" }),
  },

  categories: {
    list: (params?: { groupId?: string; isActive?: boolean }) =>
      request<import("@/lib/types").Category[]>("/admin/taxonomy/categories", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Category>(
        `/admin/taxonomy/categories/${id}`,
      ),
    create: (data: import("@/lib/types").CreateCategoryRequest) =>
      request<import("@/lib/types").Category>("/admin/taxonomy/categories", {
        method: "POST",
        body: data,
      }),
    update: (
      id: string,
      data: Partial<import("@/lib/types").CreateCategoryRequest>,
    ) =>
      request<import("@/lib/types").Category>(
        `/admin/taxonomy/categories/${id}`,
        { method: "PATCH", body: data },
      ),
    delete: (id: string) =>
      request<void>(`/admin/taxonomy/categories/${id}`, { method: "DELETE" }),
  },

  subcategories: {
    list: (params?: { categoryId?: string; isActive?: boolean }) =>
      request<import("@/lib/types").Subcategory[]>(
        "/admin/taxonomy/subcategories",
        {
          params: params as Record<
            string,
            string | number | boolean | undefined
          >,
        },
      ),
    get: (id: string) =>
      request<import("@/lib/types").Subcategory>(
        `/admin/taxonomy/subcategories/${id}`,
      ),
    create: (data: import("@/lib/types").CreateSubcategoryRequest) =>
      request<import("@/lib/types").Subcategory>(
        "/admin/taxonomy/subcategories",
        { method: "POST", body: data },
      ),
    update: (
      id: string,
      data: Partial<import("@/lib/types").CreateSubcategoryRequest>,
    ) =>
      request<import("@/lib/types").Subcategory>(
        `/admin/taxonomy/subcategories/${id}`,
        { method: "PATCH", body: data },
      ),
    delete: (id: string) =>
      request<void>(`/admin/taxonomy/subcategories/${id}`, {
        method: "DELETE",
      }),
  },

  locationCategoryConfig: {
    list: (locationId: string) =>
      request<import("@/lib/types").LocationCategoryConfig[]>(
        `/admin/taxonomy/locations/${locationId}/categories`,
      ),
    upsert: (data: import("@/lib/types").UpsertLocationCategoryConfigRequest) =>
      request<import("@/lib/types").LocationCategoryConfig>(
        "/admin/taxonomy/location-category-config",
        { method: "PUT", body: data },
      ),
  },

  locationSubcategoryConfig: {
    list: (locationId: string) =>
      request<import("@/lib/types").LocationSubcategoryConfig[]>(
        `/admin/taxonomy/locations/${locationId}/subcategories`,
      ),
    upsert: (
      data: import("@/lib/types").UpsertLocationSubcategoryConfigRequest,
    ) =>
      request<import("@/lib/types").LocationSubcategoryConfig>(
        "/admin/taxonomy/location-subcategory-config",
        { method: "PUT", body: data },
      ),
  },

  // Preview public payload for a location
  taxonomyPreview: {
    categories: (locationId: string) =>
      request<unknown>(`/locations/${locationId}/categories`, { noAuth: true }),
  },

  // Templates
  templates: {
    list: (params?: { subcategoryId?: string; isActive?: boolean }) =>
      request<import("@/lib/types").Template[]>("/admin/templates", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Template>(`/admin/templates/${id}`),
    create: (data: import("@/lib/types").CreateTemplateRequest) =>
      request<import("@/lib/types").Template>("/admin/templates", {
        method: "POST",
        body: data,
      }),
    update: (id: string, data: import("@/lib/types").UpdateTemplateRequest) =>
      request<import("@/lib/types").Template>(`/admin/templates/${id}`, {
        method: "PATCH",
        body: data,
      }),
    delete: (id: string) =>
      request<void>(`/admin/templates/${id}`, { method: "DELETE" }),
  },

  // Businesses
  businesses: {
    list: (params?: import("@/lib/types").BusinessFilterParams) =>
      request<import("@/lib/types").Business[]>("/admin/businesses", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Business>(`/admin/businesses/${id}`),
    updateStatus: (
      id: string,
      data: import("@/lib/types").BusinessApprovalAction,
    ) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/status`,
        { method: "PATCH", body: data },
      ),
  },

  // Orders
  orders: {
    list: (params?: import("@/lib/types").OrderFilterParams) =>
      request<import("@/lib/types").Order[]>("/admin/orders", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Order>(`/admin/orders/${id}`),
  },

  // Bookings
  bookings: {
    list: (params?: import("@/lib/types").BookingFilterParams) =>
      request<import("@/lib/types").Booking[]>("/admin/bookings", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Booking>(`/admin/bookings/${id}`),
  },

  // Disputes
  disputes: {
    list: (params?: import("@/lib/types").DisputeFilterParams) =>
      request<import("@/lib/types").Dispute[]>("/admin/disputes", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Dispute>(`/admin/disputes/${id}`),
    resolve: (
      id: string,
      data: import("@/lib/types").DisputeResolutionRequest,
    ) =>
      request<import("@/lib/types").Dispute>(`/admin/disputes/${id}/resolve`, {
        method: "POST",
        body: data,
      }),
  },

  // Finance
  wallets: {
    list: (
      params?: {
        locationId?: string;
        search?: string;
      } & import("@/lib/types").PaginationParams,
    ) =>
      request<import("@/lib/types").Wallet[]>("/admin/finance/wallets", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  ledger: {
    list: (
      params?: {
        walletId?: string;
        locationId?: string;
      } & import("@/lib/types").PaginationParams,
    ) =>
      request<import("@/lib/types").LedgerEntry[]>("/admin/finance/ledger", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  payouts: {
    list: (params?: import("@/lib/types").PayoutFilterParams) =>
      request<import("@/lib/types").Payout[]>("/admin/finance/payouts", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Payout>(`/admin/finance/payouts/${id}`),
    action: (id: string, data: import("@/lib/types").PayoutActionRequest) =>
      request<import("@/lib/types").Payout>(
        `/admin/finance/payouts/${id}/action`,
        { method: "POST", body: data },
      ),
  },

  feeConfigs: {
    list: (
      params?: {
        scope?: string;
        locationId?: string;
      } & import("@/lib/types").PaginationParams,
    ) =>
      request<import("@/lib/types").FeeConfig[]>("/admin/finance/fee-configs", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").FeeConfig>(
        `/admin/finance/fee-configs/${id}`,
      ),
    create: (data: Partial<import("@/lib/types").FeeConfig>) =>
      request<import("@/lib/types").FeeConfig>("/admin/finance/fee-configs", {
        method: "POST",
        body: data,
      }),
    update: (id: string, data: Partial<import("@/lib/types").FeeConfig>) =>
      request<import("@/lib/types").FeeConfig>(
        `/admin/finance/fee-configs/${id}`,
        { method: "PATCH", body: data },
      ),
  },

  // Audit Logs
  auditLogs: {
    list: (params?: import("@/lib/types").AuditLogFilterParams) =>
      request<import("@/lib/types").AuditLog[]>("/admin/audit-logs", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  // Analytics
  analytics: {
    dashboard: (params?: { locationId?: string }) =>
      request<import("@/lib/types").DashboardAnalytics>(
        "/admin/analytics/dashboard",
        {
          params: params as Record<
            string,
            string | number | boolean | undefined
          >,
        },
      ),
  },
};

export default api;
