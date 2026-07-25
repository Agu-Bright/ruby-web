'use client';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { useAssignStaff, useRemoveStaff, useStaff, useUpdateStaff } from '@/lib/business-api/organization';

export default function StaffPage() {
  const staff = useStaff(); const [email,setEmail]=useState(''); const [role,setRole]=useState('STAFF');
  const refresh=()=>void staff.refetch();
  const assign=useAssignStaff(()=>{toast.success('Staff member assigned');setEmail('');refresh()});
  const update=useUpdateStaff(()=>{toast.success('Staff role updated');refresh()});
  const remove=useRemoveStaff(()=>{toast.success('Staff access removed');refresh()});
  const submit=(event:FormEvent)=>{event.preventDefault();if(email.trim()) void assign.mutate({email:email.trim(),role})};
  return <main className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-bold">Staff access</h1><p className="mt-1 text-sm text-gray-500">Give trusted teammates the right level of access to this business.</p>
    <form onSubmit={submit} className="mt-5 grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-[1fr_150px_auto]"><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Teammate email address" className="rounded-lg border p-3"/><select value={role} onChange={e=>setRole(e.target.value)} className="rounded-lg border p-3"><option value="STAFF">Staff</option><option value="MANAGER">Manager</option></select><button disabled={assign.isLoading} className="rounded-lg bg-ruby-red px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{assign.isLoading?'Assigning…':'Add staff'}</button></form>
    <section className="mt-5 overflow-hidden rounded-2xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">Current team</h2></div>{staff.isLoading?<p className="p-5 text-sm text-gray-500">Loading staff…</p>:!staff.data?.length?<p className="p-5 text-sm text-gray-500">No staff have been assigned yet.</p>:<div className="divide-y">{staff.data.map((member:any)=><div key={member._id} className="flex flex-wrap items-center gap-3 p-5"><div className="min-w-48 flex-1"><p className="font-semibold">{member.userId?.firstName ? `${member.userId.firstName} ${member.userId.lastName??''}` : member.userId?.email??member.email}</p><p className="text-sm text-gray-500">{member.userId?.email??member.email}</p></div><select aria-label="Staff role" value={member.role} onChange={e=>void update.mutate({staffId:member._id,role:e.target.value})} disabled={update.isLoading} className="rounded-lg border p-2 text-sm"><option value="STAFF">Staff</option><option value="MANAGER">Manager</option></select><button onClick={()=>{if(confirm('Remove this staff member?'))void remove.mutate(member._id)}} disabled={remove.isLoading} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-60">Remove</button></div>)}</div>}</section></main>;
}
