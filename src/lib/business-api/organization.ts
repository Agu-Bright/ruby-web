'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from './hooks';

function getBranchNetworkId(business: { _id: string; isParent?: boolean; parentBusinessId?: string | { _id: string } } | null) {
  if (!business) return '';
  if (business.isParent) return business._id;
  if (typeof business.parentBusinessId === 'object') return business.parentBusinessId._id;
  return business.parentBusinessId ?? business._id;
}

export function useBranches() {
  const { business } = useBusinessAuth();
  const id = getBranchNetworkId(business);
  const fetcher = useCallback(() => api.businessOrganization.branches(id), [id]);
  return useBusinessQuery<any[]>(fetcher, [id], { enabled: !!id });
}
export function useStaff() { const { business } = useBusinessAuth(); const id = business?._id ?? ''; const fetcher = useCallback(() => api.businessOrganization.staff(id), [id]); return useBusinessQuery<any[]>(fetcher, [id], { enabled: !!id }); }
export function useReferral() { const { business } = useBusinessAuth(); const id = business?._id ?? ''; const fetcher = useCallback(() => api.businessOrganization.referral(id), [id]); return useBusinessQuery<any>(fetcher, [id], { enabled: !!id }); }
export function useAssignStaff(onSuccess?: () => void) { const { business } = useBusinessAuth(); return useMutation<any, any>((data) => api.businessOrganization.assignStaff(business?._id ?? '', data), { onSuccess }); }
export function useUpdateStaff(onSuccess?: () => void) { const { business } = useBusinessAuth(); return useMutation<any, { staffId: string; role: string }>((data) => api.businessOrganization.updateStaff(business?._id ?? '', data.staffId, { role: data.role }), { onSuccess }); }
export function useRemoveStaff(onSuccess?: () => void) { const { business } = useBusinessAuth(); return useMutation<any, string>((staffId) => api.businessOrganization.removeStaff(business?._id ?? '', staffId), { onSuccess }); }
export function useEnableMultiBranch(onSuccess?: () => void) { const { business } = useBusinessAuth(); return useMutation<any, { branchLabel: string }>((data) => api.businessOrganization.enableMultiBranch(business?._id ?? '', data), { onSuccess }); }
export function useCreateBranch(onSuccess?: () => void) { const { business } = useBusinessAuth(); return useMutation<any, any>((data) => api.businessOrganization.createBranch(getBranchNetworkId(business), data), { onSuccess }); }
export function useCatalogMode(onSuccess?: () => void) { return useMutation<any, { branchId: string; catalogMode: string }>((data) => api.businessOrganization.catalogMode(data.branchId, { catalogMode: data.catalogMode }), { onSuccess }); }
