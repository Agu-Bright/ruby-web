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
        { method: "PUT", body: data },
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
    delete: (id: string) =>
      request<null>(`/admin/businesses/${id}`, { method: "DELETE" }),
    adminCreate: (data: import("@/lib/types").AdminCreateBusinessRequest) =>
      request<import("@/lib/types").Business>("/admin/businesses", {
        method: "POST",
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
  },

  reviews: {
    list: (params?: { page?: number; limit?: number; businessId?: string; rating?: number; isFlagged?: string }) =>
      request<any[]>("/admin/reviews", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    delete: (id: string) =>
      request<null>(`/admin/reviews/${id}`, { method: "DELETE" }),
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
    broadcastHistory: (params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      const qs = searchParams.toString();
      return request<import("@/lib/types").BroadcastHistoryResponse>(
        `/admin/notifications/broadcast/history${qs ? `?${qs}` : ""}`,
      );
    },
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
};

export default api;
