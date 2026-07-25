'use client';
import { useCallback } from 'react'; import { api } from '@/lib/api'; import { useMutation } from '@/lib/hooks'; import { useBusinessAuth } from '@/lib/business-auth'; import { useBusinessQuery } from './hooks';
export interface BankAccount{_id:string;bankName:string;bankCode:string;accountNumber:string;accountName:string;isPrimary?:boolean;currency?:string}
export interface Payout{_id:string;amount:number;status:string;bankAccountId?:BankAccount|string;createdAt:string;reference?:string}
export function useBankAccounts(){const {business}=useBusinessAuth();const id=business?._id??'';const f=useCallback(()=>api.businessBankAccounts.list(id),[id]);return useBusinessQuery(f,[id],{enabled:!!id})}
export function useCreateBankAccount(onSuccess?:()=>void){return useMutation<BankAccount,any>((data)=>api.businessBankAccounts.create(data),{onSuccess})}
export function usePayouts(status?:string){const {business}=useBusinessAuth();const id=business?._id??'';const f=useCallback(()=>api.businessPayouts.list({businessId:id,status}),[id,status]);return useBusinessQuery(f,[id,status],{enabled:!!id})}
export function useCreatePayout(onSuccess?:()=>void){return useMutation<Payout,any>((data)=>api.businessPayouts.create(data),{onSuccess})}
