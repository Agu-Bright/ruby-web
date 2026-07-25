'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from './hooks';

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
export interface ProductImage { url: string; alt?: string; order?: number; isPrimary?: boolean }
export interface ProductVariation { name: string; type: 'SINGLE' | 'MULTIPLE'; required?: boolean; options: Array<{ name: string; priceAdjustment?: number; isAvailable?: boolean; sku?: string }> }
export interface ProductAddOn { name: string; price: number; isAvailable?: boolean; maxQuantity?: number }
export interface NutritionalInfo { calories?: number; protein?: number; carbs?: number; fat?: number; allergens?: string[] }
export interface BusinessProduct { _id: string; businessId: string; name: string; description?: string; basePrice: number; compareAtPrice?: number; category?: string; images?: ProductImage[]; variations?: ProductVariation[]; addOns?: ProductAddOn[]; trackInventory?: boolean; stockQuantity?: number; allowBackorder?: boolean; isAvailable: boolean; availableDays?: number[]; availableFrom?: string; availableTo?: string; prepTimeMinutes?: number; nutritionalInfo?: NutritionalInfo; tags?: string[]; status: ProductStatus; displayOrder?: number; metadata?: Record<string, unknown>; currency?: string; createdAt: string; updatedAt?: string; price?: number; stock?: number; media?: Array<{ url: string }> }
export interface CreateProductPayload { businessId: string; name: string; description?: string; basePrice: number; compareAtPrice?: number; category?: string; images?: ProductImage[]; variations?: ProductVariation[]; addOns?: ProductAddOn[]; stockQuantity?: number; trackInventory?: boolean; allowBackorder?: boolean; isAvailable?: boolean; availableDays?: number[]; availableFrom?: string; availableTo?: string; prepTimeMinutes?: number; nutritionalInfo?: NutritionalInfo; tags?: string[]; metadata?: Record<string, unknown> }
export type UpdateProductPayload = Partial<CreateProductPayload>;

export function useProducts(params: { category?: string; status?: string; search?: string; page?: number; limit?: number } = {}) { const { business } = useBusinessAuth(); const businessId = business?._id ?? ''; const key = JSON.stringify(params); const fetcher = useCallback(() => api.businessProducts.list({ businessId, ...params }), [businessId, key]); return useBusinessQuery(fetcher, [businessId, key], { enabled: !!businessId }); }
export function useProductDetail(id: string) { const fetcher = useCallback(() => api.businessProducts.detail(id), [id]); return useBusinessQuery(fetcher, [id], { enabled: !!id }); }
export function useCreateProduct(onSuccess?: () => void) { return useMutation<BusinessProduct, CreateProductPayload>((data) => api.businessProducts.create(data), { onSuccess }); }
export function useUpdateProduct(onSuccess?: () => void) { return useMutation<BusinessProduct, { id: string; data: UpdateProductPayload }>(({ id, data }) => api.businessProducts.update(id, data), { onSuccess }); }
export function useDeleteProduct(onSuccess?: () => void) { return useMutation<void, string>((id) => api.businessProducts.remove(id), { onSuccess }); }
export function useBulkUpdateStock(onSuccess?: () => void) { return useMutation<unknown, { productId: string; stockQuantity: number }[]>((updates) => api.businessProducts.bulkUpdateStock(updates), { onSuccess }); }
export function useBulkUpdateStatus(onSuccess?: () => void) { return useMutation<unknown, { businessId: string; productIds: string[]; status: ProductStatus }>(({ businessId, productIds, status }) => api.businessProducts.bulkUpdateStatus(businessId, productIds, status), { onSuccess }); }
export function useUpdateProductOrder(onSuccess?: () => void) { return useMutation<BusinessProduct, { id: string; order: number }>(({ id, order }) => api.businessProducts.updateOrder(id, order), { onSuccess }); }
export function useProductCategories() { const { business } = useBusinessAuth(); const products = useProducts({ limit: 200 }); const categories = [...new Set((products.data ?? []).map((product) => product.category).filter((category): category is string => !!category))]; return { ...products, data: categories, businessId: business?._id ?? '' }; }
