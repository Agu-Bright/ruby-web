'use client';
import {useCallback} from 'react';
import {toast} from 'sonner';
import {api} from '@/lib/api';
import {useBusinessQuery} from '@/lib/business-api/hooks';
export function LocationSelector({value,onChange,pin}:{value:string;onChange:(id:string)=>void;pin:[number,number]}){const fetcher=useCallback(()=>api.businessOnboarding.locations('CITY'),[]);const locations=useBusinessQuery<any[]>(fetcher,[]);const validate=async()=>{if(!value)return toast.error('Choose a Ruby+ city first');const result=await api.businessOnboarding.validateCoordinates(value,pin[0],pin[1]);if(result.data.valid)toast.success('Pin is inside the selected Ruby+ location');else toast.error(result.data.message)};return <div className="mt-4 flex flex-col gap-2 sm:flex-row"><select value={value} onChange={event=>onChange(event.target.value)} className="min-w-0 flex-1 rounded-lg border p-3 text-sm"><option value="">Select Ruby+ city</option>{(locations.data??[]).map((location:any)=><option key={location._id} value={location._id}>{location.name}</option>)}</select><button type="button" onClick={()=>void validate()} className="rounded-lg border px-4 py-2.5 text-sm font-semibold">Validate pin</button></div>}
