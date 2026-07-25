'use client';

import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ScanLine, XCircle } from 'lucide-react';
import { useScanTicket } from '@/lib/business-api/events';

export default function EventScannerPage() {
  const params = useParams<{ id: string }>(); const [manualCode, setManualCode] = useState(''); const [result, setResult] = useState<any>(null); const last = useRef('');
  const scan = useScanTicket(params.id, (data: any) => setResult(data)); const submit = (code: string) => { const value = code.trim(); if (!value || value === last.current) return; last.current = value; scan.mutate(value); };
  const detected = (codes: IDetectedBarcode[]) => { const code = codes[0]?.rawValue; if (code && !result) submit(code); }; const manual = (event: FormEvent) => { event.preventDefault(); submit(manualCode); setManualCode(''); };
  return <main className="mx-auto max-w-4xl p-6"><Link href={`/business/dashboard/events/${params.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} /> Back to event</Link><h1 className="mt-5 text-2xl font-bold">Ticket scanner</h1><div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="overflow-hidden rounded-2xl bg-black"><Scanner onScan={detected} constraints={{ facingMode: 'environment' }} paused={!!result} styles={{ container: { width: '100%' }, video: { objectFit: 'cover' } }} /></section><section className="rounded-2xl border bg-white p-5">{result ? <div className={result.kind === 'success' ? 'rounded-xl bg-emerald-50 p-4 text-emerald-800' : 'rounded-xl bg-rose-50 p-4 text-rose-800'}>{result.kind === 'success' ? <CheckCircle2 /> : <XCircle />}<p className="mt-2 font-bold">{result.kind === 'success' ? 'Ticket accepted' : result.kind.replaceAll('_', ' ')}</p><p className="mt-1 text-sm">{result.attendeeName ?? result.message ?? result.ticket?.tierName}</p><button onClick={() => { setResult(null); last.current = ''; }} className="mt-4 rounded-lg border border-current px-3 py-2 text-sm font-semibold">Scan next</button></div> : <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500"><ScanLine className="mx-auto" /><p className="mt-2 text-sm">Point the camera at a Ruby+ ticket.</p></div>}<form onSubmit={manual} className="mt-5"><label className="text-sm font-semibold">Manual ticket code<input value={manualCode} onChange={(event) => setManualCode(event.target.value)} className="mt-1 w-full rounded-lg border p-3 font-mono text-sm" placeholder="RP-EVT-…" /></label><button className="mt-3 rounded-lg border px-4 py-2.5 text-sm font-semibold">Validate code</button></form></section></div></main>;
}
