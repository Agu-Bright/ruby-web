import type { ApiResponse, UploadResult } from "@/lib/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

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
      const res = await fetch(`${API_URL}/auth/refresh`, {
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
    error: { code: "PARSE_ERROR", message: "Failed to parse response" },
  }));

  if (!res.ok) {
    throw new ApiClientError(
      json.error?.message ||
        json.message ||
        `Request failed with status ${res.status}`,
      json.error?.code || json.code || "UNKNOWN_ERROR",
      res.status,
      json.error?.details,
    );
  }

  if (json.success !== undefined) {
    if (!json.success) {
      throw new ApiClientError(
        json.error?.message || "Request failed",
        json.error?.code || "UNKNOWN_ERROR",
        res.status,
      );
    }
    // Flatten nested pagination into meta so meta.totalPages is accessible
    if (json.meta?.pagination) {
      json.meta = { ...json.meta, ...json.meta.pagination };
    }
    return json;
  }

  // Handle paginated responses: { items: [...], pagination: {...} }
  if (json.items !== undefined && json.pagination !== undefined) {
    return {
      success: true,
      data: json.items as T,
      meta: {
        page: json.pagination.page,
        limit: json.pagination.limit,
        total: json.pagination.total,
        totalPages: json.pagination.totalPages,
      },
    } as ApiResponse<T>;
  }

  return { success: true, data: json as T } as ApiResponse<T>;
}

async function uploadFile(
  path: string,
  file: File,
  folder?: string,
): Promise<ApiResponse<UploadResult>> {
  const formData = new FormData();
  formData.append("file", file);

  const url = buildUrl(path, folder ? { folder } : undefined);

  const headers: Record<string, string> = {
    "X-Request-Id": generateRequestId(),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, { method: "POST", headers, body: formData });

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
      }
      res = await fetch(url, { method: "POST", headers, body: formData });
    }

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
    data: null as unknown as UploadResult,
    error: { code: "PARSE_ERROR", message: "Failed to parse response" },
  }));

  if (!res.ok) {
    throw new ApiClientError(
      json.error?.message || json.message || `Upload failed with status ${res.status}`,
      json.error?.code || "UPLOAD_ERROR",
      res.status,
      json.error?.details,
    );
  }

  if (json.success !== undefined) {
    if (!json.success) {
      throw new ApiClientError(
        json.error?.message || "Upload failed",
        json.error?.code || "UPLOAD_ERROR",
        res.status,
      );
    }
    return json;
  }

  return { success: true, data: json as UploadResult };
}

/**
 * Upload a file directly to R2 via presigned URL (bypasses backend proxy).
 * Falls back to multipart upload through backend on failure.
 */
async function uploadDirect(
  file: File,
  folder?: string,
): Promise<ApiResponse<UploadResult>> {
  try {
    // 1. Get presigned URL from backend
    const presigned = await request<{
      uploadUrl: string;
      key: string;
      publicUrl: string;
      expiresIn: number;
    }>("/admin/media/presigned-url", {
      method: "POST",
      body: { fileName: file.name, mimeType: file.type, folder: folder || "uploads" },
    });

    // 2. PUT file directly to R2
    const putRes = await fetch(presigned.data.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: file,
    });

    if (!putRes.ok) {
      throw new Error(`Direct upload failed: ${putRes.status}`);
    }

    // 3. Return result in same format as multipart upload
    return {
      success: true,
      data: {
        key: presigned.data.key,
        url: presigned.data.publicUrl,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      },
    };
  } catch {
    // Fallback to multipart upload through backend
    return uploadFile("/admin/media/upload", file, folder);
  }
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
        user: any;
      }>("/auth/admin/login", { method: "POST", body: data, noAuth: true }),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>(
        "/auth/refresh",
        { method: "POST", body: { refreshToken }, noAuth: true },
      ),
    me: () => request<import("@/lib/types").AdminUser>("/admin/users/me"),
    logout: () => {
      // Backend has no logout endpoint — handled client-side
      clearTokens();
      return Promise.resolve({ success: true, data: undefined as unknown as void });
    },
    // Business owner registration (public — creates account, sends OTP)
    registerBusiness: (data: { email: string; password: string; phone?: string }) =>
      request<{ message?: string; email?: string }>(
        "/auth/business/register",
        { method: "POST", body: data, noAuth: true },
      ),
    // Business owner sign-in with Apple (public — creates account or logs in existing user)
    loginBusinessWithApple: (data: {
      identityToken: string;
      firstName?: string;
      lastName?: string;
    }) =>
      request<{
        accessToken?: string;
        refreshToken?: string;
        tokens?: { accessToken: string; refreshToken: string };
        user?: { id: string; email: string; firstName?: string; lastName?: string };
        hasBusinesses?: boolean;
        business?: { id: string; name: string };
      }>(
        "/auth/business/apple",
        { method: "POST", body: data, noAuth: true },
      ),
    verifyBusinessOtp: (data: { email: string; otp: string }) =>
      request<{ message?: string; email?: string }>(
        "/auth/business/verify-otp",
        { method: "POST", body: data, noAuth: true },
      ),
    resendBusinessOtp: (data: { email: string }) =>
      request<{ message?: string }>(
        "/auth/business/resend-otp",
        { method: "POST", body: data, noAuth: true },
      ),
  },

  // Media
  media: {
    upload: (file: File, folder?: string) =>
      uploadDirect(file, folder),
    delete: (key: string) =>
      request<void>(`/admin/media/${encodeURIComponent(key)}`, {
        method: "DELETE",
      }),
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
        method: "PUT",
        body: data,
      }),
    delete: (id: string) =>
      request<void>(`/admin/users/${id}`, { method: "DELETE" }),

    /**
     * Self-service password change for the currently authenticated admin.
     * Requires the current password (security boundary so a stolen access
     * token alone can't rotate it). Backend rejects with 401 +
     * `INVALID_CURRENT_PASSWORD` if the current is wrong, 400 +
     * `SAME_PASSWORD` if new === current.
     */
    changeMyPassword: (data: { currentPassword: string; newPassword: string }) =>
      request<import("@/lib/types").AdminUser>(
        "/admin/users/me/password",
        { method: "PATCH", body: data },
      ),

    /**
     * Super-admin override: reset another admin's password without
     * knowing their current one. Audit-logged loudly. Refuses to reset
     * a peer super admin (use changeMyPassword for self).
     */
    resetPassword: (id: string, data: { newPassword: string }) =>
      request<import("@/lib/types").AdminUser>(
        `/admin/users/${id}/password`,
        { method: "PUT", body: data },
      ),
  },

  // Locations — backend controller is @Controller('locations')
  locations: {
    list: (params?: import("@/lib/types").LocationFilterParams) =>
      request<import("@/lib/types").Location[]>("/locations", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Location>(`/locations/${id}`),
    create: (data: import("@/lib/types").CreateLocationRequest) =>
      request<import("@/lib/types").CreateLocationResponse>("/locations", {
        method: "POST",
        body: data,
      }),
    update: (id: string, data: import("@/lib/types").UpdateLocationRequest) =>
      request<import("@/lib/types").Location>(`/locations/${id}`, {
        method: "PUT",
        body: data,
      }),
    activate: (id: string, data?: { deliveryConfig?: import("@/lib/types").DeliveryConfig; platformFees?: import("@/lib/types").PlatformFees }) =>
      request<import("@/lib/types").Location>(
        `/locations/${id}/activate`,
        { method: "PUT", body: data },
      ),
    deactivate: (id: string) =>
      request<import("@/lib/types").Location>(
        `/locations/${id}/deactivate`,
        { method: "PUT" },
      ),
    delete: (id: string) =>
      request<void>(`/locations/${id}`, { method: "DELETE" }),
    hierarchy: (id: string) =>
      request<import("@/lib/types").Location[]>(
        `/locations/${id}/hierarchy`,
      ),
    children: (id: string) =>
      request<import("@/lib/types").Location[]>(
        `/locations/${id}/children`,
      ),
    search: (query: string) =>
      request<import("@/lib/types").Location[]>("/locations/search", {
        params: { q: query },
      }),
  },

  // Taxonomy
  categoryGroups: {
    list: () =>
      request<import("@/lib/types").CategoryGroup[]>("/admin/taxonomy/groups"),
    create: (data: import("@/lib/types").CreateCategoryGroupRequest) =>
      request<import("@/lib/types").CategoryGroup>("/admin/taxonomy/groups", {
        method: "POST",
        body: data,
      }),
    update: (
      id: string,
      data: Partial<import("@/lib/types").CreateCategoryGroupRequest>,
    ) =>
      request<import("@/lib/types").CategoryGroup>(
        `/admin/taxonomy/groups/${id}`,
        { method: "PUT", body: data },
      ),
    delete: (id: string) =>
      request<void>(`/admin/taxonomy/groups/${id}`, { method: "DELETE" }),
  },

  categories: {
    // P145 — the admin taxonomy backend returns paginated
    // `{ items, pagination }` from the controller, and the Transform
    // interceptor wraps it as `{ success: true, data: { items,
    // pagination } }`. The rest of the app types this endpoint as
    // `Category[]` and reads `res.data` as an array — so the
    // businesses page filter dropdown was showing "All categories"
    // with no options (data.items had the array, but data was the
    // wrapper). Unwrap `items` here so every caller sees the array
    // shape they already expect. Same fix applied to subcategories
    // below.
    list: async (params?: { groupId?: string; isActive?: boolean }) => {
      const res = await request<any>("/admin/taxonomy/categories", {
        params: params as Record<string, string | number | boolean | undefined>,
      });
      if (res?.data && Array.isArray((res.data as any).items)) {
        return {
          ...res,
          data: (res.data as any).items as import("@/lib/types").Category[],
        };
      }
      return res as ApiResponse<import("@/lib/types").Category[]>;
    },
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
        { method: "PUT", body: data },
      ),
    delete: (id: string) =>
      request<void>(`/admin/taxonomy/categories/${id}`, { method: "DELETE" }),
  },

  subcategories: {
    // P145 — same paginated-wrapper unwrap as categories.list.
    list: async (params?: {
      categoryId?: string;
      isActive?: boolean;
      limit?: number;
    }) => {
      const res = await request<any>("/admin/taxonomy/subcategories", {
        params: { limit: 500, ...params } as Record<
          string,
          string | number | boolean | undefined
        >,
      });
      if (res?.data && Array.isArray((res.data as any).items)) {
        return {
          ...res,
          data: (res.data as any).items as import("@/lib/types").Subcategory[],
        };
      }
      return res as ApiResponse<import("@/lib/types").Subcategory[]>;
    },
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
        { method: "PUT", body: data },
      ),
    delete: (id: string) =>
      request<void>(`/admin/taxonomy/subcategories/${id}`, {
        method: "DELETE",
      }),
  },

  locationCategoryConfig: {
    list: (locationId: string) =>
      request<import("@/lib/types").LocationCategoryConfig[]>(
        `/admin/taxonomy/location-configs/categories/${locationId}`,
      ),
    upsert: (data: import("@/lib/types").UpsertLocationCategoryConfigRequest) =>
      request<import("@/lib/types").LocationCategoryConfig>(
        "/admin/taxonomy/location-configs/categories",
        { method: "POST", body: data },
      ),
  },

  locationSubcategoryConfig: {
    list: (locationId: string) =>
      request<import("@/lib/types").LocationSubcategoryConfig[]>(
        `/admin/taxonomy/location-configs/subcategories/${locationId}`,
      ),
    upsert: (
      data: import("@/lib/types").UpsertLocationSubcategoryConfigRequest,
    ) =>
      request<import("@/lib/types").LocationSubcategoryConfig>(
        "/admin/taxonomy/location-configs/subcategories",
        { method: "POST", body: data },
      ),
  },

  // Preview public payload for a location
  taxonomyPreview: {
    categories: (locationId: string) =>
      request<unknown>(`/locations/${locationId}/categories`, { noAuth: true }),
  },

  // Templates
  templates: {
    list: (params?: { search?: string; isActive?: boolean; includeAllVersions?: boolean } & import("@/lib/types").PaginationParams) =>
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
        method: "PUT",
        body: data,
      }),
    deactivate: (id: string) =>
      request<import("@/lib/types").Template>(`/admin/templates/${id}/deactivate`, {
        method: "PUT",
      }),
    createVersion: (id: string, data: { description?: string; fields?: import("@/lib/types").TemplateField[]; sections?: import("@/lib/types").TemplateSection[] }) =>
      request<import("@/lib/types").Template>(`/admin/templates/${id}/version`, {
        method: "POST",
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
    pendingReview: (params?: import("@/lib/types").PaginationParams) =>
      request<import("@/lib/types").Business[]>("/admin/businesses/pending-review", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    stats: (params?: { locationId?: string }) =>
      request<import("@/lib/types").BusinessStats>("/admin/businesses/stats", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Business>(`/admin/businesses/${id}`),
    approve: (id: string, data?: { notes?: string }) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/approve`,
        { method: "POST", body: data },
      ),
    // P148 — admin bypass to promote an APPROVED business straight to
    // LIVE without waiting for the merchant to complete their own
    // go-live flow. Fixes the "no businesses found" symptom on the
    // customer app when a business is admin-approved but the owner
    // never manually goes live from the business mobile app.
    setLive: (id: string) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/set-live`,
        { method: "POST" },
      ),
    reject: (id: string, data: { reason: string }) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/reject`,
        { method: "POST", body: data },
      ),
    suspend: (id: string, data: { reason: string }) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/suspend`,
        { method: "POST", body: data },
      ),
    reinstate: (id: string) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/reinstate`,
        { method: "POST" },
      ),
    feature: (id: string, data: { isFeatured: boolean; featuredUntil?: string }) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/feature`,
        { method: "PATCH", body: data },
      ),
    verifyCac: (id: string, data: import("@/lib/types").VerifyCacRequest) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/verify-cac`,
        { method: "POST", body: data },
      ),
    /**
     * Phase 13.2/13.10: flip `isVerified=true` so the business becomes
     * eligible for Deolu AI recommendations ("Ruby Verified" gate).
     * Distinct from CAC verification — a business can be CAC-verified
     * but not yet promoted to Deolu's surface.
     */
    verify: (id: string) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/verify`,
        { method: "POST" },
      ),
    unverify: (id: string, reason: string) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/unverify`,
        { method: "POST", body: { reason } },
      ),
    delete: (id: string) =>
      request<null>(`/admin/businesses/${id}`, { method: "DELETE" }),
    adminCreate: (data: import("@/lib/types").AdminCreateBusinessRequest) =>
      request<import("@/lib/types").Business>("/admin/businesses", {
        method: "POST",
        body: data,
      }),
    adminUpdate: (id: string, data: Partial<import("@/lib/types").AdminCreateBusinessRequest>) =>
      request<import("@/lib/types").Business>(`/admin/businesses/${id}`, {
        method: "PUT",
        body: data,
      }),
    unclaimed: (params?: import("@/lib/types").PaginationParams & { search?: string; locationId?: string }) =>
      request<import("@/lib/types").Business[]>("/admin/businesses/unclaimed", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    regenerateClaimCode: (id: string) =>
      request<{ claimCode: string }>(`/admin/businesses/${id}/regenerate-claim-code`, {
        method: "POST",
      }),
    // Multi-branch: list child branches of a parent business
    getBranches: (parentId: string) =>
      request<import("@/lib/types").Business[]>(`/admin/businesses/${parentId}/branches`),
    /**
     * P119 — thin helper for the businesses page's Brand filter
     * search-as-you-type. Hits the regular admin list with isParent=true
     * and a small limit; results feed the SearchableSelect popover when
     * the admin is picking a parent brand to filter children of.
     */
    brands: (search?: string, limit = 20) =>
      request<import("@/lib/types").Business[]>("/admin/businesses", {
        params: {
          isParent: true,
          search,
          limit,
        } as Record<string, string | number | boolean | undefined>,
      }),
    // Keep backward-compat alias
    updateStatus: (
      id: string,
      data: import("@/lib/types").BusinessApprovalAction,
    ) =>
      request<import("@/lib/types").Business>(
        `/admin/businesses/${id}/status`,
        { method: "PATCH", body: data },
      ),
    // Business wallet management
    getWallet: (businessId: string) =>
      request<import("@/lib/types").Wallet[]>(`/admin/wallets/by-business/${businessId}`),
    fundWallet: (walletId: string, data: { amount: number; currency?: string; description?: string }) =>
      request<import("@/lib/types").LedgerEntry>(`/admin/wallets/${walletId}/fund`, {
        method: "POST",
        body: data,
      }),
    getWalletTransactions: (walletId: string, params?: { page?: number; limit?: number; type?: string }) =>
      request<import("@/lib/types").LedgerEntry[]>(`/admin/wallets/${walletId}/transactions`, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  // Admin Products
  products: {
    list: (params?: import("@/lib/types").ProductFilterParams) =>
      request<import("@/lib/types").Product[]>("/admin/products", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Product>(`/admin/products/${id}`),
    update: (id: string, data: import("@/lib/types").UpdateProductRequest) =>
      request<import("@/lib/types").Product>(`/admin/products/${id}`, {
        method: "PUT",
        body: data,
      }),
    delete: (id: string) =>
      request<void>(`/admin/products/${id}`, { method: "DELETE" }),
    suspend: (id: string) =>
      request<import("@/lib/types").Product>(`/admin/products/${id}/suspend`, {
        method: "POST",
      }),
    activate: (id: string) =>
      request<import("@/lib/types").Product>(`/admin/products/${id}/activate`, {
        method: "POST",
      }),
  },

  // Admin Services
  services: {
    list: (params?: import("@/lib/types").ServiceFilterParams) =>
      request<import("@/lib/types").ServiceListing[]>("/admin/services", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").ServiceListing>(`/admin/services/${id}`),
    update: (id: string, data: import("@/lib/types").UpdateServiceRequest) =>
      request<import("@/lib/types").ServiceListing>(`/admin/services/${id}`, {
        method: "PUT",
        body: data,
      }),
    delete: (id: string) =>
      request<void>(`/admin/services/${id}`, { method: "DELETE" }),
    suspend: (id: string) =>
      request<import("@/lib/types").ServiceListing>(
        `/admin/services/${id}/suspend`,
        { method: "POST" },
      ),
    activate: (id: string) =>
      request<import("@/lib/types").ServiceListing>(
        `/admin/services/${id}/activate`,
        { method: "POST" },
      ),
    archive: (id: string) =>
      request<import("@/lib/types").ServiceListing>(
        `/admin/services/${id}/archive`,
        { method: "POST" },
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
    cancel: (id: string, reason: string) =>
      request<import("@/lib/types").Order>(`/admin/orders/${id}/cancel`, {
        method: "POST",
        body: { reason },
      }),
    updateStatus: (id: string, status: string, note?: string) =>
      request<import("@/lib/types").Order>(`/admin/orders/${id}/status`, {
        method: "PATCH",
        body: { status, note },
      }),
    stats: (params?: { locationId?: string; businessId?: string; startDate?: string; endDate?: string }) =>
      request<import("@/lib/types").OrderStats>("/admin/orders/stats", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  // Delivery Jobs
  delivery: {
    listJobs: (params?: import("@/lib/types").DeliveryJobFilterParams) =>
      request<import("@/lib/types").DeliveryJob[]>("/admin/delivery/jobs", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    getJob: (id: string) =>
      request<import("@/lib/types").DeliveryJob>(`/admin/delivery/jobs/${id}`),
    assignRider: (id: string, data: { name: string; phone: string; vehicleType?: string; vehiclePlate?: string }) =>
      request<import("@/lib/types").DeliveryJob>(`/admin/delivery/jobs/${id}/rider`, {
        method: "PUT",
        body: data,
      }),
    updateJobStatus: (id: string, status: string, note?: string) =>
      request<import("@/lib/types").DeliveryJob>(`/admin/delivery/jobs/${id}/status`, {
        method: "PUT",
        body: { status, note },
      }),
    cancelJob: (id: string, reason: string) =>
      request<import("@/lib/types").DeliveryJob>(`/admin/delivery/jobs/${id}/cancel`, {
        method: "POST",
        body: { reason },
      }),
    stats: (params?: { locationId?: string }) =>
      request<import("@/lib/types").DeliveryStats>("/admin/delivery/stats", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    // Pandago outlet management — manual registration + bulk backfill for
    // legacy/unclaimed businesses. Normal post-deploy claimed merchants
    // auto-register on admin approval and don't expose these actions.
    pandagoBackfill: (params?: { limit?: number; dryRun?: boolean }) =>
      request<{
        scanned: number;
        registered: number;
        failed: number;
        skipped: number;
        errors: { businessId: string; error: string }[];
      }>("/admin/delivery/pandago/backfill", {
        method: "POST",
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    pandagoRegisterBusiness: (businessId: string) =>
      request<{ status: 'ACTIVE' | 'FAILED'; error?: string }>(
        `/admin/delivery/pandago/businesses/${businessId}/register`,
        { method: "POST" },
      ),
  },

  // Bookings
  bookings: {
    list: (params?: import("@/lib/types").BookingFilterParams) =>
      request<import("@/lib/types").Booking[]>("/admin/bookings", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Booking>(`/admin/bookings/${id}`),
    stats: () =>
      request<import("@/lib/types").BookingStats>("/admin/bookings/stats"),
  },

  // Rides
  rides: {
    list: (params?: Record<string, any>) =>
      request<any[]>("/admin/rides", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<any>(`/admin/rides/${id}`),
    stats: (params?: { locationId?: string }) =>
      request<any>("/admin/rides/stats", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  // Dispatch
  dispatch: {
    list: (params?: Record<string, any>) =>
      request<any[]>("/admin/dispatch", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<any>(`/admin/dispatch/${id}`),
    cancel: (id: string, data?: { reason?: string }) =>
      request<any>(`/admin/dispatch/${id}/cancel`, {
        method: "POST",
        body: data,
      }),
    stats: (params?: { locationId?: string }) =>
      request<any>("/admin/dispatch/stats", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  // Disputes
  disputes: {
    list: (params?: import("@/lib/types").DisputeFilterParams) =>
      request<import("@/lib/types").Dispute[]>("/admin/disputes", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Dispute>(`/admin/disputes/${id}`),
    /** Admin sends a reply (or internal note) to a dispute thread. */
    addMessage: (
      id: string,
      data: import("@/lib/types").AddDisputeMessageRequest,
    ) =>
      request<import("@/lib/types").Dispute>(`/admin/disputes/${id}/messages`, {
        method: "POST",
        body: data,
      }),
    updateStatus: (id: string, data: { status: string; note?: string }) =>
      request<import("@/lib/types").Dispute>(`/admin/disputes/${id}/status`, {
        method: "PUT",
        body: data,
      }),
    assign: (id: string, data: { adminId: string; note?: string }) =>
      request<import("@/lib/types").Dispute>(`/admin/disputes/${id}/assign`, {
        method: "POST",
        body: data,
      }),
    close: (id: string, data: { note: string }) =>
      request<import("@/lib/types").Dispute>(`/admin/disputes/${id}/close`, {
        method: "POST",
        body: data,
      }),
    escalate: (id: string, data: { reason: string }) =>
      request<import("@/lib/types").Dispute>(`/admin/disputes/${id}/escalate`, {
        method: "POST",
        body: data,
      }),
    resolve: (
      id: string,
      data: import("@/lib/types").DisputeResolutionRequest,
    ) =>
      request<import("@/lib/types").Dispute>(`/admin/disputes/${id}/resolve`, {
        method: "POST",
        body: data,
      }),
  },

  // Dispute notification recipients (Phase 14) — admin-managed email
  // list for dispute event alerts. Co-located with disputes.* because
  // the Recipients tab lives on the disputes page.
  disputeRecipients: {
    list: () =>
      request<import("@/lib/types").DisputeNotificationRecipient[]>(
        "/admin/disputes/notification-recipients",
      ),
    create: (data: import("@/lib/types").CreateDisputeRecipientRequest) =>
      request<import("@/lib/types").DisputeNotificationRecipient>(
        "/admin/disputes/notification-recipients",
        { method: "POST", body: data },
      ),
    update: (
      id: string,
      data: import("@/lib/types").UpdateDisputeRecipientRequest,
    ) =>
      request<import("@/lib/types").DisputeNotificationRecipient>(
        `/admin/disputes/notification-recipients/${id}`,
        { method: "PATCH", body: data },
      ),
    delete: (id: string) =>
      request<void>(`/admin/disputes/notification-recipients/${id}`, {
        method: "DELETE",
      }),
    /**
     * Self-service "Send test email to me" — backend looks up the
     * calling admin's own email and fires a sample dispute messageAdded
     * email. Lets ops verify SMTP + template render without filing a
     * real dispute. Returns the address the test was sent to.
     */
    sendTest: () =>
      request<{ sentTo: string; message: string }>(
        "/admin/disputes/notification-recipients/test",
        { method: "POST" },
      ),
  },

  // Phase 16 — VAT report (FIRS-remittance aggregation)
  vat: {
    report: (params: {
      startDate: string;
      endDate: string;
      locationId?: string;
    }) =>
      request<import("@/lib/types").VatReport>(
        "/admin/finance/vat-report",
        {
          params: params as Record<string, string | number | boolean | undefined>,
        },
      ),
  },

  // Finance
  wallets: {
    list: (
      params?: {
        locationId?: string;
        search?: string;
      } & import("@/lib/types").PaginationParams,
    ) =>
      request<import("@/lib/types").Wallet[]>("/admin/wallets", {
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
      request<import("@/lib/types").LedgerEntry[]>("/admin/wallets/ledger", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  payouts: {
    list: (params?: import("@/lib/types").PayoutFilterParams) =>
      request<import("@/lib/types").Payout[]>("/admin/payouts", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Payout>(`/admin/payouts/${id}`),
    approve: (id: string) =>
      request<import("@/lib/types").Payout>(
        `/admin/payouts/${id}/approve`,
        { method: "POST" },
      ),
    reject: (id: string, data?: { reason?: string }) =>
      request<import("@/lib/types").Payout>(
        `/admin/payouts/${id}/reject`,
        { method: "POST", body: data },
      ),
    process: (id: string) =>
      request<import("@/lib/types").Payout>(
        `/admin/payouts/${id}/process`,
        { method: "POST" },
      ),
    complete: (id: string) =>
      request<import("@/lib/types").Payout>(
        `/admin/payouts/${id}/complete`,
        { method: "POST" },
      ),
    stats: () =>
      request<import("@/lib/types").PayoutStats>("/admin/payouts/stats"),
  },

  // P70: Ops health endpoints (SMS gateway, Paystack balance, etc.) —
  // surfaced on the admin /finance page so an operator can diagnose silent
  // outages (e.g. Termii misconfigured) without poking at backend logs.
  health: {
    /**
     * P80: returns the chained MessagingHealth shape (chain + per-provider
     * status + 24h failover stats). Old SmsHealth callers receive the
     * extra fields but ignore them — still TS-safe via the union.
     */
    sms: () =>
      request<import("@/lib/types").MessagingHealth>("/admin/health/sms"),
    whatsapp: () =>
      request<import("@/lib/types").MessagingHealth>(
        "/admin/health/whatsapp",
      ),
    smsTest: (body: import("@/lib/types").MessagingTestRequest) =>
      request<{
        sent: boolean;
        phone: string;
        channel: "SMS" | "WHATSAPP";
        provider: "twilio" | "termii" | "chain";
      }>("/admin/health/sms/test", { method: "POST", body }),
  },

  feeConfigs: {
    list: (
      params?: {
        scope?: string;
        locationId?: string;
      } & import("@/lib/types").PaginationParams,
    ) =>
      request<import("@/lib/types").FeeConfig[]>("/admin/fees", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").FeeConfig>(
        `/admin/fees/${id}`,
      ),
    create: (data: Partial<import("@/lib/types").FeeConfig>) =>
      request<import("@/lib/types").FeeConfig>("/admin/fees", {
        method: "POST",
        body: data,
      }),
    update: (id: string, data: Partial<import("@/lib/types").FeeConfig>) =>
      request<import("@/lib/types").FeeConfig>(
        `/admin/fees/${id}`,
        { method: "PATCH", body: data },
      ),
    delete: (id: string) =>
      request<{ deleted: boolean }>(
        `/admin/fees/${id}`,
        { method: "DELETE" },
      ),
  },

  // Customers (end-users)
  customers: {
    list: (params?: import("@/lib/types").CustomerFilterParams) =>
      request<import("@/lib/types").Customer[]>("/users", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Customer>(`/users/${id}`),
    activate: (id: string) =>
      request<import("@/lib/types").Customer>(`/users/${id}/activate`, {
        method: "PUT",
      }),
    deactivate: (id: string) =>
      request<import("@/lib/types").Customer>(`/users/${id}/deactivate`, {
        method: "PUT",
      }),
    delete: (id: string) =>
      request<void>(`/users/${id}`, { method: "DELETE" }),
    sendPasswordReset: (id: string) =>
      request<{ message: string }>(`/users/${id}/password-reset`, {
        method: "POST",
      }),
    getWallets: (userId: string) =>
      request<import("@/lib/types").Wallet[]>(`/admin/wallets/by-user/${userId}`),
    fundWallet: (walletId: string, data: { amount: number; currency?: string; description?: string }) =>
      request<import("@/lib/types").LedgerEntry>(`/admin/wallets/${walletId}/fund`, {
        method: "POST",
        body: data,
      }),
    getWalletTransactions: (walletId: string, params?: { page?: number; limit?: number; type?: string }) =>
      request<import("@/lib/types").LedgerEntry[]>(`/admin/wallets/${walletId}/transactions`, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    stats: () =>
      request<import("@/lib/types").CustomerStats>("/users/stats"),
    getOtp: (id: string) =>
      request<{ code: string; purpose: string; createdAt: string; expiresAt: string } | null>(`/users/${id}/otp`),
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

  // Promos
  promos: {
    list: (params?: import("@/lib/types").PromoFilterParams) =>
      request<import("@/lib/types").Promo[]>("/admin/promos", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Promo>(`/admin/promos/${id}`),
    create: (data: Partial<import("@/lib/types").Promo>) =>
      request<import("@/lib/types").Promo>("/admin/promos", {
        method: "POST",
        body: data,
      }),
    update: (id: string, data: Partial<import("@/lib/types").Promo>) =>
      request<import("@/lib/types").Promo>(`/admin/promos/${id}`, {
        method: "PUT",
        body: data,
      }),
    delete: (id: string) =>
      request<void>(`/admin/promos/${id}`, { method: "DELETE" }),
    stats: () =>
      request<{ total: number; active: number; totalImpressions: number; totalClicks: number }>("/admin/promos/stats"),
  },

  adCampaigns: {
    list: (params?: import("@/lib/types").AdCampaignFilterParams) =>
      request<import("@/lib/types").AdCampaign[]>("/admin/ads", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").AdCampaign>(`/admin/ads/${id}`),
    stats: (params?: { locationId?: string }) =>
      request<import("@/lib/types").AdCampaignStats>("/admin/ads/stats", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    approve: (id: string) =>
      request<import("@/lib/types").AdCampaign>(`/admin/ads/${id}/approve`, {
        method: "POST",
      }),
    reject: (id: string, data: { rejectionReason?: string }) =>
      request<import("@/lib/types").AdCampaign>(`/admin/ads/${id}/reject`, {
        method: "POST",
        body: data,
      }),
    delete: (id: string) =>
      request<null>(`/admin/ads/${id}`, { method: "DELETE" }),
    createAdminReel: (
      data: {
        media: { url: string; type?: string }[];
        caption?: string;
        hashtags?: string[];
        locationId?: string;
        // P143 — admin reels can now carry the same `externalUrl` field
        // the customer mobile create-reel screen already supports (P137).
        // Backend whitelist accepts http/https only; the viewer renders
        // a tappable chip on the Explore overlay.
        externalUrl?: string;
        taggedBusinessId?: string;
      },
      businessId?: string,
    ) =>
      request<import("@/lib/types").AdCampaign>(`/admin/ads/reels${businessId ? `?businessId=${businessId}` : ''}`, {
        method: "POST",
        body: data,
      }),
  },

  reviews: {
    list: (params?: { page?: number; limit?: number; businessId?: string; rating?: number; isFlagged?: string; isVerified?: string }) =>
      request<any[]>("/admin/reviews", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    verify: (id: string) =>
      request<any>(`/admin/reviews/${id}/verify`, { method: "PATCH" }),
    delete: (id: string) =>
      request<null>(`/admin/reviews/${id}`, { method: "DELETE" }),

    // P103 — admin Feature toggle for the home tab reviews marquee.
    // Featured reviews sort first and get a purple "Featured" pill on
    // the card. Separate from the paid FEATURED_REVIEWS ad type.
    feature: (id: string, data: { isFeatured: boolean; featuredUntil?: string }) =>
      request<any>(`/admin/reviews/${id}/feature`, {
        method: "PATCH",
        body: data,
      }),

    // P51 §7 — moderation queue + trust dashboard.
    listQuarantined: (params?: {
      businessId?: string;
      page?: number;
      limit?: number;
      state?: "QUARANTINED" | "AUTO_REJECTED";
    }) =>
      request<any[]>("/admin/reviews/moderation/quarantined", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    clear: (id: string, notes?: string) =>
      request<any>(`/admin/reviews/${id}/clear`, {
        method: "POST",
        body: notes ? { notes } : undefined,
      }),
    remove: (id: string, reason: string) =>
      request<any>(`/admin/reviews/${id}/remove`, {
        method: "POST",
        body: { reason },
      }),
    trustDashboard: (sinceDays?: number) =>
      request<{
        sinceDays: number;
        byState: Record<string, number>;
        byTier: Record<string, number>;
        fraudScoreStats: {
          avgScore: number;
          maxScore: number;
          quarantineRate: number;
          autoRejectRate: number;
          verifiedVisitRate: number;
        } | null;
      }>("/admin/reviews/trust/dashboard", {
        params: sinceDays ? { sinceDays } : undefined,
      }),
  },

  // P121 — Content moderation admin endpoints (App Store Guideline 1.2
  // 24-hour SLA for actioning reports).
  moderation: {
    listReports: (params?: {
      page?: number;
      limit?: number;
      contentType?: string;
      status?: string;
    }) =>
      request<any[]>("/admin/moderation/reports", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    getReport: (id: string) =>
      request<{ report: any; content: any }>(
        `/admin/moderation/reports/${id}`,
      ),
    resolveReport: (
      id: string,
      body: {
        resolution:
          | "RESOLVED_CONTENT_REMOVED"
          | "RESOLVED_USER_SUSPENDED"
          | "DISMISSED";
        adminNotes?: string;
      },
    ) =>
      request<any>(`/admin/moderation/reports/${id}/resolve`, {
        method: "POST",
        body,
      }),
    stats: () =>
      request<{
        pending: number;
        resolvedToday: number;
        oldestPendingAt?: string;
        oldestAgeHours: number | null;
      }>("/admin/moderation/stats"),
  },

  // Phase 59 — Review Rewards Engine admin endpoints.
  rewards: {
    stats: () =>
      request<{
        totalPointsOutstanding: number;
        ngnLiabilityIfFullRedemption: number;
        usersWithPoints: number;
        conversionRate: number;
        minRedemption: number;
        redemptionsLast30d: {
          count: number;
          totalPoints: number;
          totalNgn: number;
        };
        topEarnersLast30d: Array<{
          userId: string;
          totalEarned: number;
          reviewsCount: number;
          firstName?: string;
          lastName?: string;
          email?: string;
        }>;
        // P94 — per-source breakdown (REVIEW/REFERRAL/REEL/PAYMENT/ADMIN
        // credits in the last 30d). Zeroed buckets present so the UI
        // doesn't have to conditionally render.
        bySourceLast30d?: Record<
          string,
          { count: number; totalPoints: number; uniqueUsers: number }
        >;
        // P94 — # rows currently in the QUARANTINED queue. Drives the
        // badge on the Quarantine tab.
        quarantineQueueSize?: number;
      }>("/admin/rewards/stats"),

    getUser: (userId: string) =>
      request<{
        status: {
          points: number;
          lifetimeEarned: number;
          lifetimeRedeemed: number;
          minRedemption: number;
          conversionRate: number;
          cashValueNgn: number;
          canRedeem: boolean;
          pointsToUnlock: number;
        };
        ledger: {
          items: Array<{
            _id: string;
            userId: string;
            type:
              | "REVIEW_PUBLISHED"
              | "CLAWBACK"
              | "REDEMPTION"
              | "ADMIN_ADJUSTMENT";
            pointsDelta: number;
            balanceAfter: number;
            description: string;
            createdAt: string;
            reason?: string;
            reviewId?: string;
            adminId?: string;
          }>;
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        };
      }>(`/admin/rewards/users/${userId}`),

    adjust: (userId: string, pointsDelta: number, reason: string) =>
      request<{ newBalance: number; pointsDelta: number }>(
        `/admin/rewards/users/${userId}/adjust`,
        { method: "POST", body: { pointsDelta, reason } },
      ),

    // P99 — Quarantine queue: paginated list of credits with
    // verdict=QUARANTINED awaiting admin triage.
    getQuarantine: (params?: {
      sourceType?: string;
      page?: number;
      limit?: number;
    }) =>
      request<{
        items: Array<{
          _id: string;
          userId:
            | string
            | { _id: string; firstName?: string; lastName?: string; email?: string };
          type: string;
          pointsDelta: number;
          balanceAfter: number;
          sourceType?: string;
          sourceId?: string;
          fraudScore?: number;
          fraudVerdict?: string;
          deviceFingerprintId?: string;
          clientIp?: string;
          description: string;
          reason?: string;
          createdAt: string;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>("/admin/rewards/quarantine", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),

    clearQuarantine: (entryId: string, reason?: string) =>
      request<{
        entryId: string;
        userId: string;
        pointsDelta: number;
        newBalance: number;
      }>(`/admin/rewards/quarantine/${entryId}/clear`, {
        method: "POST",
        body: { reason },
      }),

    rejectQuarantine: (entryId: string, reason: string) =>
      request<{ entryId: string; deleted: true }>(
        `/admin/rewards/quarantine/${entryId}/reject`,
        { method: "POST", body: { reason } },
      ),

    clawback: (sourceType: string, sourceId: string, reason: string) =>
      request<{ userId: string; reversed: number; reason: string }>(
        "/admin/rewards/clawback",
        { method: "POST", body: { sourceType, sourceId, reason } },
      ),

    // P99 — Cluster alerts: fraud-ring signals from shared device
    // fingerprint or shared client IP across many users / many entries.
    getClusterAlerts: () =>
      request<{
        deviceClusters: Array<{
          deviceFingerprintId: string;
          userIds: string[];
          userCount: number;
          lastSeen: string;
          entryCount: number;
        }>;
        ipClusters: Array<{
          clientIp: string;
          userIds: string[];
          userCount: number;
          lastSeen: string;
          entryCount: number;
        }>;
        generatedAt: string;
        thresholds: {
          deviceWindowDays: number;
          deviceMinUsers: number;
          ipWindowDays: number;
          ipMinEntries: number;
        };
      }>("/admin/rewards/cluster-alerts"),
  },

  adProducts: {
    list: () =>
      request<import("@/lib/types").AdProduct[]>("/admin/ads/products"),
    updatePrice: (type: string, ratePerUnit: number) =>
      request<import("@/lib/types").AdProduct>(
        `/admin/ads/products/${type}`,
        {
          method: "PATCH",
          body: { ratePerUnit },
        },
      ),
  },

  emergency: {
    list: (params?: import("@/lib/types").EmergencyAlertFilterParams) =>
      request<import("@/lib/types").EmergencyAlert[]>("/admin/emergency/alerts", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").EmergencyAlert>(`/admin/emergency/alerts/${id}`),
    update: (id: string, data: import("@/lib/types").UpdateEmergencyAlertRequest) =>
      request<import("@/lib/types").EmergencyAlert>(`/admin/emergency/alerts/${id}`, {
        method: "PATCH",
        body: data,
      }),
    stats: (params?: { locationId?: string }) =>
      request<import("@/lib/types").EmergencyAlertStats>("/admin/emergency/alerts/stats", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
  },

  appVersions: {
    list: () =>
      request<any[]>("/admin/system/app-versions"),
    upsert: (data: { app: string; platform: string; minVersion: string; latestVersion?: string; storeUrl?: string; forceUpdate?: boolean; updateMessage?: string }) =>
      request<any>("/admin/system/app-version", { method: "PATCH", body: data }),
  },

  notifications: {
    list: (params?: { page?: number; limit?: number; type?: string; isRead?: boolean }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.type) searchParams.set("type", params.type);
      if (params?.isRead !== undefined) searchParams.set("isRead", String(params.isRead));
      const qs = searchParams.toString();
      return request<import("@/lib/types").AdminNotificationListResponse>(
        `/admin/notifications${qs ? `?${qs}` : ""}`,
      );
    },
    unreadCount: () =>
      request<{ count: number }>("/admin/notifications/unread-count"),
    markRead: (ids: string[]) =>
      request<{ success: boolean }>("/admin/notifications/mark-read", {
        method: "POST",
        body: { ids },
      }),
    markAllRead: () =>
      request<{ success: boolean }>("/admin/notifications/mark-all-read", {
        method: "POST",
      }),
    broadcast: (data: import("@/lib/types").BroadcastNotificationRequest) =>
      request<import("@/lib/types").BroadcastNotification>("/admin/notifications/broadcast", {
        method: "POST",
        body: data,
      }),
    /**
     * Dry-run preview of how many users / devices a broadcast WOULD
     * reach. Surfaced near the Send button so admins can spot empty-
     * audience problems (the silent-delivery-failure mode) BEFORE
     * clicking. A value of 0 here is the alarm bell.
     */
    broadcastPreview: (params: {
      targetAudience: import("@/lib/types").BroadcastTargetAudience;
      locationIds?: string[];
      platforms?: import("@/lib/types").BroadcastPlatform[];
    }) => {
      const searchParams = new URLSearchParams();
      searchParams.set("targetAudience", params.targetAudience);
      (params.locationIds || []).forEach((id) =>
        searchParams.append("locationIds", id),
      );
      (params.platforms || []).forEach((p) =>
        searchParams.append("platforms", p),
      );
      return request<import("@/lib/types").BroadcastPreviewResponse>(
        `/admin/notifications/broadcast/preview?${searchParams.toString()}`,
      );
    },
    broadcastHistory: (params?: {
      page?: number;
      limit?: number;
      status?: import("@/lib/types").BroadcastStatus;
      includeTest?: boolean;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.status) searchParams.set("status", params.status);
      if (params?.includeTest) searchParams.set("includeTest", "true");
      const qs = searchParams.toString();
      return request<import("@/lib/types").BroadcastHistoryResponse>(
        `/admin/notifications/broadcast/history${qs ? `?${qs}` : ""}`,
      );
    },
    /**
     * Full detail for one broadcast — used by the history detail modal.
     * Returns the same shape as a history list row plus full `data`,
     * `errorMessage`, and deep-link metadata.
     */
    broadcastDetail: (id: string) =>
      request<import("@/lib/types").BroadcastNotification>(
        `/admin/notifications/broadcast/${id}`,
      ),
    /**
     * Single-recipient dry-run. Useful for previewing how a deep-link or
     * attachment renders before mass-blasting. Recorded as a TEST-status
     * broadcast in history.
     */
    broadcastTest: (data: import("@/lib/types").TestBroadcastRequest) =>
      request<import("@/lib/types").BroadcastNotification>(
        "/admin/notifications/broadcast/test",
        { method: "POST", body: data },
      ),
    /**
     * Cancel a SCHEDULED broadcast before its scheduledAt arrives.
     * 400 if the broadcast already fired. Idempotent on CANCELLED.
     */
    broadcastCancel: (id: string) =>
      request<import("@/lib/types").BroadcastNotification>(
        `/admin/notifications/broadcast/${id}/cancel`,
        { method: "POST" },
      ),
    /**
     * Clone an existing broadcast and send it as a fresh row. Pass
     * `scheduledAt` to schedule the resend instead of firing immediately.
     */
    broadcastResend: (id: string, body: { scheduledAt?: string } = {}) =>
      request<import("@/lib/types").BroadcastNotification>(
        `/admin/notifications/broadcast/${id}/resend`,
        { method: "POST", body },
      ),
  },

  // P135 — admin-editable singleton powering the business app's
  // "Talk to Ruby+" support card. SUPER_ADMIN only on the backend.
  merchantSupport: {
    get: () =>
      request<import("@/lib/types").MerchantSupportConfig>(
        "/admin/merchant-support",
      ),
    update: (
      data: import("@/lib/types").UpdateMerchantSupportConfigPayload,
    ) =>
      request<import("@/lib/types").MerchantSupportConfig>(
        "/admin/merchant-support",
        { method: "PUT", body: data },
      ),
  },

  legalDocuments: {
    list: (params?: { page?: number; limit?: number; type?: string; status?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.type) searchParams.set("type", params.type);
      if (params?.status) searchParams.set("status", params.status);
      const qs = searchParams.toString();
      return request<any>(`/admin/legal-documents${qs ? `?${qs}` : ""}`);
    },
    create: (data: any) =>
      request<any>("/admin/legal-documents", { method: "POST", body: data }),
    update: (id: string, data: any) =>
      request<any>(`/admin/legal-documents/${id}`, { method: "PUT", body: data }),
    activate: (id: string) =>
      request<any>(`/admin/legal-documents/${id}/activate`, { method: "POST" }),
    deactivate: (id: string) =>
      request<any>(`/admin/legal-documents/${id}/deactivate`, { method: "POST" }),
    delete: (id: string) =>
      request<any>(`/admin/legal-documents/${id}`, { method: "DELETE" }),
  },

  // ─────────────────────────────────────────────────────────────────
  // Marketers / referral codes
  // ─────────────────────────────────────────────────────────────────
  marketers: {
    list: (params?: import("@/lib/types").MarketerFilterParams) =>
      request<import("@/lib/types").Marketer[]>("/admin/marketers", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    create: (data: import("@/lib/types").CreateMarketerRequest) =>
      request<import("@/lib/types").Marketer>("/admin/marketers", {
        method: "POST",
        body: data,
      }),
    get: (id: string) =>
      request<import("@/lib/types").Marketer>(`/admin/marketers/${id}`),
    update: (id: string, data: import("@/lib/types").UpdateMarketerRequest) =>
      request<import("@/lib/types").Marketer>(`/admin/marketers/${id}`, {
        method: "PATCH",
        body: data,
      }),
    suspend: (id: string, reason?: string) =>
      request<import("@/lib/types").Marketer>(
        `/admin/marketers/${id}/suspend`,
        { method: "POST", body: { reason } },
      ),
    reinstate: (id: string) =>
      request<import("@/lib/types").Marketer>(
        `/admin/marketers/${id}/reinstate`,
        { method: "POST" },
      ),
    listCodes: (id: string) =>
      request<import("@/lib/types").ReferralCode[]>(
        `/admin/marketers/${id}/codes`,
      ),
    generateCode: (
      id: string,
      data: import("@/lib/types").GenerateCodeRequest,
    ) =>
      request<import("@/lib/types").ReferralCode>(
        `/admin/marketers/${id}/codes`,
        { method: "POST", body: data },
      ),
    updateCode: (
      codeId: string,
      data: import("@/lib/types").UpdateCodeRequest,
    ) =>
      request<import("@/lib/types").ReferralCode>(
        `/admin/referral-codes/${codeId}`,
        { method: "PATCH", body: data },
      ),
    listAttributions: (
      id: string,
      params?: import("@/lib/types").AttributionFilterParams,
    ) =>
      request<import("@/lib/types").ReferralAttribution[]>(
        `/admin/marketers/${id}/attributions`,
        { params: params as Record<string, string | number | boolean | undefined> },
      ),
    processPayout: (
      id: string,
      attributionIds: string[],
      payoutToBank?: boolean,
    ) =>
      request<{
        marketerId: string;
        paidCount: number;
        totalAmount: number;
        ledgerEntryId?: string;
      }>(`/admin/marketers/${id}/payouts`, {
        method: "POST",
        body: { attributionIds, payoutToBank },
      }),
    /**
     * Issue a fresh viewToken for the marketer; invalidates the previous
     * shareable `/m/:token` URL. Returns the updated marketer.
     */
    regenerateViewToken: (id: string) =>
      request<import("@/lib/types").Marketer>(
        `/admin/marketers/${id}/regenerate-view-token`,
        { method: "POST" },
      ),
    /**
     * Public (no-auth) read-only stats snapshot keyed off viewToken.
     * Used by the `/m/[token]` page.
     */
    publicView: (token: string) =>
      request<import("@/lib/types").PublicMarketerView>(
        `/public/marketers/by-token/${encodeURIComponent(token)}`,
      ),
  },


  // ─────────────────────────────────────────────────────────────────
  // Home sections (admin-managed customer-app home layout)
  // ─────────────────────────────────────────────────────────────────
  homeSections: {
    list: (params?: {
      type?: import("@/lib/types").HomeSectionType;
      locationId?: string;
      isActive?: boolean;
    }) =>
      request<import("@/lib/types").HomeSection[]>("/admin/home-sections", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    get: (id: string) =>
      request<import("@/lib/types").HomeSection>(`/admin/home-sections/${id}`),
    create: (data: import("@/lib/types").CreateHomeSectionRequest) =>
      request<import("@/lib/types").HomeSection>("/admin/home-sections", {
        method: "POST",
        body: data,
      }),
    update: (id: string, data: import("@/lib/types").UpdateHomeSectionRequest) =>
      request<import("@/lib/types").HomeSection>(`/admin/home-sections/${id}`, {
        method: "PATCH",
        body: data,
      }),
    delete: (id: string) =>
      request<{ deleted: true }>(`/admin/home-sections/${id}`, {
        method: "DELETE",
      }),
    reorder: (data: import("@/lib/types").ReorderHomeSectionsRequest) =>
      request<{ updated: number }>("/admin/home-sections/reorder", {
        method: "PATCH",
        body: data,
      }),
    /** Public feed (no auth) — used to preview what customers see. */
    publicFeed: (locationId?: string) =>
      request<import("@/lib/types").HomeSectionFeedItem[]>(
        "/public/home-sections",
        { params: { locationId } },
      ),
    /**
     * Re-run the default-section seed. Idempotent server-side (skips
     * when the collection already has rows). Surfaced via the empty
     * state's "Seed defaults" button so admins can recover from an
     * empty collection without a redeploy.
     */
    seed: () =>
      request<{ created: number }>("/admin/home-sections/seed", {
        method: "POST",
      }),
  },

  // ─────────────────────────────────────────────────────────────────
  // P120 — Business Ad Subscriptions admin surface.
  // Drives the /admin/ad-subscriptions page: list / cancel /
  // upgrade-downgrade / perks / banner moderation / onboarding queue /
  // revenue stats. Mounted at /admin/ad-subscriptions on the backend.
  // ─────────────────────────────────────────────────────────────────
  adSubscriptions: {
    /** List tier definitions (Starter / Growth / Prime). */
    tiers: () =>
      request<
        Array<{
          tier: "STARTER" | "GROWTH" | "PRIME";
          displayName: string;
          weeklyAmountNgn: number;
          pushBlastsPerMonth: number;
          reelsPerMonth: number;
          perkBullets: string[];
        }>
      >("/admin/ad-subscriptions/tiers"),

    /** Paginated subscription list with filters. */
    list: (params?: {
      page?: number;
      limit?: number;
      tier?: "STARTER" | "GROWTH" | "PRIME";
      status?:
        | "PENDING_ONBOARDING_REVIEW"
        | "ACTIVE"
        | "IN_GRACE_PERIOD"
        | "PAUSED"
        | "CANCELLED"
        | "EXPIRED";
      businessId?: string;
      periodEndFrom?: string;
      periodEndTo?: string;
    }) =>
      request<any[]>(
        `/admin/ad-subscriptions${
          params
            ? "?" +
              new URLSearchParams(
                Object.entries(params).reduce(
                  (acc, [k, v]) => (v != null ? { ...acc, [k]: String(v) } : acc),
                  {},
                ),
              ).toString()
            : ""
        }`,
      ),

    /** Single subscription detail. */
    get: (id: string) => request<any>(`/admin/ad-subscriptions/${id}`),

    /**
     * Force-cancel — admin-only since P124 (merchant-facing cancel was
     * replaced by pause/resume). Perks live to currentPeriodEnd then
     * EXPIRED by the cron sweep. Use this for chargeback / TOS
     * violation / refund-and-close support tickets.
     */
    cancel: (id: string, body?: { reason?: string }) =>
      request<any>(`/admin/ad-subscriptions/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify(body || {}),
      }),

    /**
     * P124 — Pause on the merchant's behalf. Identical effect to the
     * merchant's pause: status -> PAUSED, managed campaign frozen,
     * cached tier cleared. Useful for support tickets ("merchant said
     * pause my sub").
     */
    pause: (id: string, body?: { reason?: string }) =>
      request<any>(`/admin/ad-subscriptions/${id}/pause`, {
        method: "POST",
        body: JSON.stringify(body || {}),
      }),

    /**
     * P124 — Resume a PAUSED subscription without billing the wallet
     * (admin-only courtesy path; the renewal cron will pick up billing
     * from the next period boundary). Mirrors the merchant resume
     * effect (fresh 7-day period, managed campaign re-opened, cached
     * tier restored) — just without the upfront wallet debit.
     */
    resume: (id: string) =>
      request<any>(`/admin/ad-subscriptions/${id}/resume`, {
        method: "POST",
      }),

    /** Admin upgrade/downgrade — immediate-expire + new sub on WALLET. */
    upgradeDowngrade: (
      id: string,
      body: { tier: "STARTER" | "GROWTH" | "PRIME" },
    ) =>
      request<any>(`/admin/ad-subscriptions/${id}/upgrade-downgrade`, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    /** Force-expire — past-grace cleanup or escalation path. */
    expire: (id: string) =>
      request<any>(`/admin/ad-subscriptions/${id}/expire`, { method: "POST" }),

    /** Mark the free profile-setup perk done. */
    markProfileSetup: (id: string) =>
      request<any>(`/admin/ad-subscriptions/${id}/perks/profile-setup`, {
        method: "PATCH",
      }),

    /** Update polished-photos count (0..6+). */
    setPolishedPhotos: (id: string, count: number) =>
      request<any>(`/admin/ad-subscriptions/${id}/perks/polished-photos`, {
        method: "PATCH",
        body: JSON.stringify({ count }),
      }),

    /** Schedule the creative shoot (PRIME only). */
    scheduleShoot: (id: string, scheduledAt: string) =>
      request<any>(
        `/admin/ad-subscriptions/${id}/perks/creative-shoot/schedule`,
        {
          method: "POST",
          body: JSON.stringify({ scheduledAt }),
        },
      ),

    /** Mark the creative shoot complete (PRIME only). */
    completeShoot: (id: string) =>
      request<any>(
        `/admin/ad-subscriptions/${id}/perks/creative-shoot/complete`,
        { method: "POST" },
      ),

    /** Admin banner upload — auto-approves. */
    uploadBanner: (id: string, body: { imageUrl: string; ctaText?: string }) =>
      request<any>(`/admin/ad-subscriptions/${id}/banner`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    /** Moderate merchant-uploaded banner (APPROVED / REJECTED). */
    moderateBanner: (
      id: string,
      body: {
        decision: "APPROVED" | "REJECTED";
        rejectionReason?: string;
      },
    ) =>
      request<any>(`/admin/ad-subscriptions/${id}/banner/moderate`, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    /** Flat onboarding-perk queue across all active subs. */
    onboardingQueue: () =>
      request<
        Array<{
          subscriptionId: string;
          businessId: any;
          tier: "STARTER" | "GROWTH" | "PRIME";
          perk:
            | "PROFILE_SETUP"
            | "POLISHED_PHOTOS"
            | "CREATIVE_SHOOT_SCHEDULE"
            | "CREATIVE_SHOOT_COMPLETE"
            | "BANNER_MODERATION";
          detail: string;
          daysWaiting: number;
        }>
      >("/admin/ad-subscriptions/queue/onboarding"),

    /** Revenue + status aggregates. */
    stats: () =>
      request<{
        totalActive: number;
        weeklyRevenueNgn: number;
        monthlyRevenueNgnEstimate: number;
        byTier: Array<{
          _id: "STARTER" | "GROWTH" | "PRIME";
          count: number;
          weeklyRevenueNgn: number;
        }>;
        byStatus: Array<{ _id: string; count: number }>;
      }>("/admin/ad-subscriptions/stats/summary"),

    // ─── P139 — onboarding review flow + admin-fulfilled push blasts ───

    /**
     * Manually activate a PENDING_ONBOARDING_REVIEW subscription early
     * (before the 48h auto-deadline). Starts the 7-day billing week from
     * NOW (not from paidAt). Idempotent if the sub is already ACTIVE.
     */
    activate: (id: string) =>
      request<any>(`/admin/ad-subscriptions/${id}/activate`, {
        method: "POST",
        body: JSON.stringify({}),
      }),

    /**
     * Admin queue of merchant-submitted push blast requests. Status
     * filter (default PENDING). Sorted newest-first.
     */
    listPushBlastRequests: (status?:
      | "PENDING"
      | "SENT"
      | "REJECTED"
      | "STALE") =>
      request<
        Array<{
          _id: string;
          businessId: any;
          subscriptionId: string;
          message: string;
          radiusKm: number;
          status: "PENDING" | "SENT" | "REJECTED" | "STALE";
          createdAt: string;
          fulfilledAt?: string;
          fulfilledByAdminId?: string;
          recipientCount?: number;
          finalMessage?: string;
          rejectedAt?: string;
          rejectionReason?: string;
        }>
      >(
        `/admin/ad-subscriptions/push-blast-requests${
          status ? `?status=${status}` : ""
        }`,
      ),

    /**
     * Admin fires the push blast on behalf of the merchant. Consumes
     * one of the merchant's monthly quota slots. `finalMessage` is
     * optional — admin may tweak the merchant's draft before sending.
     */
    fulfilPushBlastRequest: (requestId: string, body: { finalMessage?: string }) =>
      request<any>(
        `/admin/ad-subscriptions/push-blast-requests/${requestId}/fulfil`,
        { method: "POST", body: JSON.stringify(body) },
      ),

    /**
     * Admin rejects a push blast request with a reason that surfaces
     * back to the merchant.
     */
    rejectPushBlastRequest: (requestId: string, reason: string) =>
      request<any>(
        `/admin/ad-subscriptions/push-blast-requests/${requestId}/reject`,
        { method: "POST", body: JSON.stringify({ reason }) },
      ),
  },

  // ─────────────────────────────────────────────────────────────────
  // Events — Phase 6 ticketing. Admin CRUD + publish/cancel.
  // The customer-facing read paths live under /public/events; this
  // section is the admin surface only.
  // ─────────────────────────────────────────────────────────────────
  events: {
    list: (params?: {
      locationId?: string;
      startsAfter?: string;
      startsBefore?: string;
      limit?: number;
      skip?: number;
    }) =>
      request<{ items: import("@/lib/types").RubyEvent[]; total: number }>(
        "/admin/events",
        {
          params: params as Record<
            string,
            string | number | boolean | undefined
          >,
        },
      ),
    get: (id: string) =>
      request<import("@/lib/types").RubyEvent>(`/admin/events/${id}`),
    create: (data: import("@/lib/types").CreateEventRequest) =>
      request<import("@/lib/types").RubyEvent>("/admin/events", {
        method: "POST",
        body: data,
      }),
    update: (
      id: string,
      data: import("@/lib/types").UpdateEventRequest,
    ) =>
      request<import("@/lib/types").RubyEvent>(`/admin/events/${id}`, {
        method: "PUT",
        body: data,
      }),
    publish: (id: string) =>
      request<import("@/lib/types").RubyEvent>(`/admin/events/${id}/publish`, {
        method: "POST",
      }),
    cancel: (id: string) =>
      request<import("@/lib/types").RubyEvent>(`/admin/events/${id}/cancel`, {
        method: "POST",
      }),
    refundAllTickets: (id: string) =>
      request<{
        refunded: number;
        skipped: number;
        totalNgnRefunded: number;
        failures: number;
      }>(`/admin/events/${id}/refund-all-tickets`, { method: "POST" }),
    delete: (id: string) =>
      request<void>(`/admin/events/${id}`, { method: "DELETE" }),
    // Phase 65 — admin ticket roster for the event detail drawer.
    listTickets: (id: string) =>
      request<
        Array<{
          _id: string;
          ticketNumber: string;
          tier: string;
          pricePaidNgn: number;
          paymentMethod?: "WALLET" | "PAYSTACK";
          paystackReference?: string;
          status:
            | "ACTIVE"
            | "USED"
            | "CANCELLED"
            | "REFUNDED"
            | "EXPIRED";
          isUsed?: boolean;
          usedAt?: string;
          createdAt: string;
          refundedAt?: string;
          userId?:
            | string
            | {
                _id: string;
                firstName?: string;
                lastName?: string;
                email?: string;
                phone?: string;
              };
        }>
      >(`/admin/events/${id}/tickets`),
    // Phase 40 — approval workflow.
    listPending: (params?: {
      locationId?: string;
      limit?: number;
      skip?: number;
      sortOldestFirst?: boolean;
    }) =>
      request<{ items: import("@/lib/types").RubyEvent[]; total: number }>(
        "/admin/events/pending",
        {
          params: params as Record<
            string,
            string | number | boolean | undefined
          >,
        },
      ),
    approve: (id: string) =>
      request<import("@/lib/types").RubyEvent>(`/admin/events/${id}/approve`, {
        method: "POST",
      }),
    reject: (id: string, reason: string) =>
      request<import("@/lib/types").RubyEvent>(`/admin/events/${id}/reject`, {
        method: "POST",
        body: { reason },
      }),
    // Phase 40 P7 — per-event analytics + cross-event sales report.
    analytics: (id: string) =>
      request<import("@/lib/types").EventAnalytics>(
        `/admin/events/${id}/analytics`,
      ),
    salesReport: (params?: {
      fromDate?: string;
      toDate?: string;
      locationId?: string;
      organizerBusinessId?: string;
    }) =>
      request<import("@/lib/types").AdminEventsSalesReport>(
        "/admin/events/reports/sales",
        {
          params: params as Record<
            string,
            string | number | boolean | undefined
          >,
        },
      ),
    salesReportCsv: (params?: {
      fromDate?: string;
      toDate?: string;
      locationId?: string;
      organizerBusinessId?: string;
    }) =>
      request<{
        filename: string;
        contentType: string;
        contentBase64: string;
      }>("/admin/events/reports/sales/csv", {
        params: params as Record<
          string,
          string | number | boolean | undefined
        >,
      }),
    // Phase 40 P9 — admin browser-camera scanner.
    scan: (id: string, qrCode: string) =>
      request<{
        kind:
          | "success"
          | "already_used"
          | "invalid_qr"
          | "wrong_event"
          | "event_not_today";
        message?: string;
        ticket?: { _id: string; tierName: string; usedAt?: string };
        usedAt?: string;
      }>(`/admin/events/${id}/scan`, {
        method: "POST",
        body: { qrCode },
      }),
  },
  // Admin-managed platform alert recipients (ad payments, etc.). Direct
  // clone of eventRecipients shape — same CRUD + test endpoint. Backend
  // path: /admin/system-alerts/recipients.
  systemAlerts: {
    list: () =>
      request<import("@/lib/types").SystemAlertRecipient[]>(
        "/admin/system-alerts/recipients",
      ),
    create: (data: import("@/lib/types").CreateSystemAlertRecipientRequest) =>
      request<import("@/lib/types").SystemAlertRecipient>(
        "/admin/system-alerts/recipients",
        { method: "POST", body: data },
      ),
    update: (
      id: string,
      data: import("@/lib/types").UpdateSystemAlertRecipientRequest,
    ) =>
      request<import("@/lib/types").SystemAlertRecipient>(
        `/admin/system-alerts/recipients/${id}`,
        { method: "PATCH", body: data },
      ),
    remove: (id: string) =>
      request<void>(`/admin/system-alerts/recipients/${id}`, {
        method: "DELETE",
      }),
    sendTest: () =>
      request<{ sentTo: string; message: string }>(
        "/admin/system-alerts/recipients/test",
        { method: "POST" },
      ),
  },

  // Phase 40 — event notification recipients (clone of dispute pattern).
  eventRecipients: {
    list: () =>
      request<import("@/lib/types").EventNotificationRecipient[]>(
        "/admin/events/notification-recipients",
      ),
    create: (data: import("@/lib/types").CreateEventRecipientRequest) =>
      request<import("@/lib/types").EventNotificationRecipient>(
        "/admin/events/notification-recipients",
        { method: "POST", body: data },
      ),
    update: (
      id: string,
      data: import("@/lib/types").UpdateEventRecipientRequest,
    ) =>
      request<import("@/lib/types").EventNotificationRecipient>(
        `/admin/events/notification-recipients/${id}`,
        { method: "PATCH", body: data },
      ),
    delete: (id: string) =>
      request<void>(`/admin/events/notification-recipients/${id}`, {
        method: "DELETE",
      }),
    sendTest: () =>
      request<{ sentTo: string; message: string }>(
        "/admin/events/notification-recipients/test",
        { method: "POST" },
      ),
  },

  // ─────────────────────────────────────────────────────────────────
  // Deolu admin — Phase 7 (renamed from "Ask Ruby" in Phase 12a).
  // Health dashboard + tag review queue. Backend route still
  // `/admin/ask-ruby/health` for backward compat.
  // ─────────────────────────────────────────────────────────────────
  deolu: {
    health: (hours = 24) =>
      request<import("@/lib/types").DeoluHealthMetrics>(
        "/admin/ask-ruby/health",
        { params: { hours } },
      ),
  },

  // ─────────────────────────────────────────────────────────────────
  // Web Search admin — surfaces Google Custom Search provider health
  // + Mongo cache stats on the Finance page so ops can monitor the
  // paid-API quota burn and tune cache TTL if needed.
  // ─────────────────────────────────────────────────────────────────
  webSearch: {
    getHealth: () =>
      request<{
        configured: boolean;
        activeProvider: "GOOGLE" | "BRAVE" | "SERPAPI" | null;
        cacheRowsAlive: number;
        last7d: { totalHits: number; uniqueQueries: number };
      }>("/admin/web-search/health"),
    testSearch: (q: string) =>
      request<{
        results: Array<{
          title: string;
          link: string;
          snippet: string;
          displayLink: string;
          faviconUrl: string;
          thumbnail?: { url: string; width?: number; height?: number } | null;
        }>;
        totalResults: number;
        searchTimeMs: number;
        provider: "GOOGLE" | "BRAVE" | "SERPAPI";
        cached: boolean;
      }>("/admin/web-search/test", { params: { q } }),
  },

  // ──────────────── Phase 50: Ruby+ Select ────────────────
  rubySelect: {
    list: (params?: { status?: string; locationId?: string; page?: number; limit?: number }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set("status", params.status);
      if (params?.locationId) search.set("locationId", params.locationId);
      if (params?.page) search.set("page", String(params.page));
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return request<{
        items: import("@/lib/types").RubySelectPost[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/admin/ruby-select${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) =>
      request<import("@/lib/types").RubySelectPost>(`/admin/ruby-select/${id}`),
    create: (data: import("@/lib/types").CreateRubySelectPostRequest) =>
      request<import("@/lib/types").RubySelectPost>("/admin/ruby-select", {
        method: "POST",
        body: data,
      }),
    update: (id: string, data: import("@/lib/types").UpdateRubySelectPostRequest) =>
      request<import("@/lib/types").RubySelectPost>(`/admin/ruby-select/${id}`, {
        method: "PATCH",
        body: data,
      }),
    publish: (id: string) =>
      request<import("@/lib/types").RubySelectPost>(`/admin/ruby-select/${id}/publish`, {
        method: "POST",
      }),
    archive: (id: string) =>
      request<import("@/lib/types").RubySelectPost>(`/admin/ruby-select/${id}/archive`, {
        method: "POST",
      }),
    delete: (id: string) =>
      request<void>(`/admin/ruby-select/${id}`, { method: "DELETE" }),
  },

  // P149 — admin support-chat inbox. Same underlying rows as the customer
  // support-chat surface (POST /user/support-chat/messages) but admins
  // read + reply here.
  supportChat: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      unreadOnly?: boolean;
    }) => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.search) query.set("search", params.search);
      if (params?.unreadOnly) query.set("unreadOnly", "true");
      const qs = query.toString();
      return request<{
        items: import("@/lib/types").SupportConversationAdmin[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/admin/support-chat/conversations${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) =>
      request<import("@/lib/types").SupportConversationAdmin>(
        `/admin/support-chat/conversations/${id}`,
      ),
    messages: (id: string, params?: { page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      const qs = query.toString();
      return request<{
        items: import("@/lib/types").SupportMessage[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(
        `/admin/support-chat/conversations/${id}/messages${
          qs ? `?${qs}` : ""
        }`,
      );
    },
    reply: (id: string, data: { text?: string }) =>
      request<import("@/lib/types").SupportMessage>(
        `/admin/support-chat/conversations/${id}/messages`,
        { method: "POST", body: data },
      ),
    markRead: (id: string) =>
      request<{ success: boolean }>(
        `/admin/support-chat/conversations/${id}/read`,
        { method: "PUT" },
      ),
  },

  // P152-E — Ruby Quest admin surface. One tabbed page groups the 4
  // sub-resources (spawns, rewards, prizes, config); all under
  // /admin/ruby-quest/*.
  rubyQuest: {
    // ── Spawns ────────────────────────────────────────────────────
    listSpawns: (params?: {
      status?: string;
      rarity?: string;
      businessId?: string;
      page?: number;
      limit?: number;
    }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set("status", params.status);
      if (params?.rarity) search.set("rarity", params.rarity);
      if (params?.businessId) search.set("businessId", params.businessId);
      if (params?.page) search.set("page", String(params.page));
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return request<{
        items: import("@/lib/types").RubyQuestSpawn[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/admin/ruby-quest/spawns${qs ? `?${qs}` : ""}`);
    },
    createSpawn: (data: import("@/lib/types").CreateRubyQuestSpawnRequest) =>
      request<import("@/lib/types").RubyQuestSpawn>(
        "/admin/ruby-quest/spawns",
        { method: "POST", body: data },
      ),
    revokeSpawn: (id: string, reason?: string) => {
      const qs = reason
        ? `?reason=${encodeURIComponent(reason)}`
        : "";
      return request<import("@/lib/types").RubyQuestSpawn>(
        `/admin/ruby-quest/spawns/${id}${qs}`,
        { method: "DELETE" },
      );
    },

    // ── Reward pool ───────────────────────────────────────────────
    listRewards: () =>
      request<{ items: import("@/lib/types").RubyRewardConfig[] }>(
        "/admin/ruby-quest/rewards",
      ),
    createReward: (data: import("@/lib/types").CreateRubyRewardConfigRequest) =>
      request<import("@/lib/types").RubyRewardConfig>(
        "/admin/ruby-quest/rewards",
        { method: "POST", body: data },
      ),
    updateReward: (
      id: string,
      data: import("@/lib/types").UpdateRubyRewardConfigRequest,
    ) =>
      request<import("@/lib/types").RubyRewardConfig>(
        `/admin/ruby-quest/rewards/${id}`,
        { method: "PATCH", body: data },
      ),

    // ── Prize queue ───────────────────────────────────────────────
    listPrizes: (params?: {
      status?: string;
      page?: number;
      limit?: number;
    }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set("status", params.status);
      if (params?.page) search.set("page", String(params.page));
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return request<{
        items: import("@/lib/types").AdminPrizeQueueEntry[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/admin/ruby-quest/prizes${qs ? `?${qs}` : ""}`);
    },
    updatePrize: (
      id: string,
      data: { status?: string; fulfilmentNote?: string },
    ) =>
      request<import("@/lib/types").AdminPrizeQueueEntry>(
        `/admin/ruby-quest/prizes/${id}`,
        { method: "PATCH", body: data },
      ),

    // ── Config singleton ──────────────────────────────────────────
    getConfig: () =>
      request<import("@/lib/types").RubyQuestConfig>(
        "/admin/ruby-quest/config",
      ),
    updateConfig: (data: Partial<import("@/lib/types").RubyQuestConfig>) =>
      request<import("@/lib/types").RubyQuestConfig>(
        "/admin/ruby-quest/config",
        { method: "PATCH", body: data },
      ),
  },
};

export default api;
