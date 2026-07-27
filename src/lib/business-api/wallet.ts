'use client';
import { useCallback } from 'react'; import { api } from '@/lib/api'; import { useMutation } from '@/lib/hooks'; import { useBusinessAuth } from '@/lib/business-auth'; import { useBusinessQuery } from './hooks';
export interface BusinessWallet{_id:string;businessId:string;balance:number;availableBalance?:number;currency:string;status?:string}
export function useBusinessWallets(){const {business}=useBusinessAuth();const id=business?._id??'';const f=useCallback(()=>api.businessWallets.list(id),[id]);return useBusinessQuery(f,[id],{enabled:!!id,pollMs:30_000})}
export function useWalletDetail(id:string){const f=useCallback(()=>api.businessWallets.detail(id),[id]);return useBusinessQuery(f,[id],{enabled:!!id})}
export function useWalletTransactions(id:string,params?:Record<string,string|number|undefined>){const key=JSON.stringify(params??{});const f=useCallback(()=>api.businessWallets.transactions(id,params),[id,key]);return useBusinessQuery(f,[id,key],{enabled:!!id})}
export function useFundBusinessWallet(onSuccess?:()=>void){return useMutation<any,{walletId:string;amount:number}>(({walletId,amount})=>api.businessWallets.fund(walletId,amount),{onSuccess})}
