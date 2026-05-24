'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Camera,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { api } from '@/lib/api';
import { useApi, useMutation } from '@/lib/hooks';
import type { RubyEvent } from '@/lib/types';

/**
 * Phase 40 P9 — admin browser-camera scanner. Fallback for in-person
 * events Ruby+ co-runs, or to help a merchant whose phone died at the
 * door. Uses @yudiel/react-qr-scanner (works in any modern browser with
 * getUserMedia + HTTPS).
 *
 * Same discriminated-union result shape as the mobile scanner — colour-
 * coded result panel below the camera. Debounces re-detection.
 */

const SCAN_REGEX = /^RP-EVT-[a-fA-F0-9]{24}-[a-fA-F0-9]{12}$/;
const DEBOUNCE_MS = 1500;

type ScanResult =
  | { kind: 'success'; ticket: { tierName: string; _id: string } }
  | { kind: 'already_used'; usedAt: string }
  | { kind: 'invalid_qr'; message: string }
  | { kind: 'wrong_event'; message: string }
  | { kind: 'event_not_today'; message: string }
  | null;

export default function AdminScannerPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<ScanResult>(null);
  const [scanCount, setScanCount] = useState(0);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  // Show only PUBLISHED + SOLD_OUT events — those are the only ones with
  // tickets that could be scanned today.
  const { data: eventsData } = useApi(() =>
    api.events.list({ limit: 100 }),
  );
  const scannableEvents = (eventsData?.items || []).filter(
    (e: RubyEvent) => e.status === 'PUBLISHED' || e.status === 'SOLD_OUT',
  );

  const scanMut = useMutation((args: { eventId: string; qrCode: string }) =>
    api.events.scan(args.eventId, args.qrCode),
  );

  const submitScan = async (rawCode: string) => {
    if (!selectedEventId) {
      alert('Pick an event first.');
      return;
    }
    const code = rawCode.trim();
    if (!SCAN_REGEX.test(code)) {
      setResult({ kind: 'invalid_qr', message: 'Not a valid Ruby+ ticket QR.' });
      return;
    }
    const res = await scanMut.mutate({ eventId: selectedEventId, qrCode: code });
    if (!res) return;
    setResult(res as ScanResult);
    if (res.kind === 'success') {
      setScanCount((c) => c + 1);
    }
  };

  const handleDetected = (codes: IDetectedBarcode[]) => {
    if (!codes || codes.length === 0) return;
    const data = codes[0].rawValue;
    const now = Date.now();
    // Debounce identical re-detection from continuous camera frames.
    if (
      lastScanRef.current.code === data &&
      now - lastScanRef.current.at < DEBOUNCE_MS
    ) {
      return;
    }
    lastScanRef.current = { code: data, at: now };
    submitScan(data);
  };

  const handleManual = () => {
    if (!manualCode.trim()) return;
    submitScan(manualCode);
    setManualCode('');
  };

  const handleNext = () => {
    setResult(null);
    lastScanRef.current = { code: '', at: 0 };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Camera size={24} /> Event ticket scanner
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Pick an event, then point your camera at the QR code on the
            attendee's ticket PDF. Use this as a fallback when the merchant
            scanner isn't available.
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Scanned this session: <strong>{scanCount}</strong>
        </div>
      </div>

      {/* Event picker */}
      <div className="card p-4">
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Event
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ruby-400"
        >
          <option value="">Select an event…</option>
          {scannableEvents.map((e: RubyEvent) => (
            <option key={e._id} value={e._id}>
              {e.title} · {new Date(e.startsAt).toLocaleDateString('en-GB')}
            </option>
          ))}
        </select>
      </div>

      {selectedEventId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera */}
          <div className="card p-4">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Camera
            </div>
            <div className="aspect-square w-full bg-black rounded-lg overflow-hidden relative">
              <Scanner
                onScan={handleDetected}
                constraints={{ facingMode: 'environment' }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { objectFit: 'cover' },
                }}
                allowMultiple={false}
                paused={!!result}
              />
              {result && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <button
                    onClick={handleNext}
                    className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold shadow-lg"
                  >
                    Scan next ticket
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Centre the QR in the camera view. Browser may ask for camera
              permission the first time.
            </p>
          </div>

          {/* Result + manual entry */}
          <div className="space-y-4">
            <ResultPanel result={result} />

            <div className="card p-4">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Manual entry
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="RP-EVT-…"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-ruby-400"
                />
                <button
                  onClick={handleManual}
                  disabled={!manualCode.trim()}
                  className="bg-ruby-500 hover:bg-ruby-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Scan
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Paste the full RP-EVT-… code from the attendee's email if the
                QR is damaged or unreadable.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: ScanResult }) {
  if (!result) {
    return (
      <div className="card p-6 text-center text-gray-400">
        <ScanLine size={32} className="mx-auto mb-2" />
        <p className="text-sm">Awaiting scan…</p>
      </div>
    );
  }

  let icon: React.ReactNode;
  let bg = 'bg-gray-50';
  let border = 'border-gray-200';
  let fg = 'text-gray-900';
  let title = '';
  let body = '';

  switch (result.kind) {
    case 'success':
      icon = <CheckCircle2 size={36} />;
      bg = 'bg-green-50';
      border = 'border-green-200';
      fg = 'text-green-700';
      title = 'Admit one';
      body = `${result.ticket.tierName} · Ticket #${result.ticket._id.slice(-6).toUpperCase()}`;
      break;
    case 'already_used':
      icon = <AlertTriangle size={36} />;
      bg = 'bg-amber-50';
      border = 'border-amber-200';
      fg = 'text-amber-700';
      title = 'Already used';
      body = `Scanned ${new Date(result.usedAt).toLocaleString('en-GB')}`;
      break;
    case 'wrong_event':
      icon = <XCircle size={36} />;
      bg = 'bg-red-50';
      border = 'border-red-200';
      fg = 'text-red-700';
      title = 'Wrong event';
      body = result.message;
      break;
    case 'event_not_today':
      icon = <XCircle size={36} />;
      bg = 'bg-red-50';
      border = 'border-red-200';
      fg = 'text-red-700';
      title = 'Not today';
      body = result.message;
      break;
    case 'invalid_qr':
    default:
      icon = <XCircle size={36} />;
      bg = 'bg-red-50';
      border = 'border-red-200';
      fg = 'text-red-700';
      title = 'Invalid ticket';
      body = (result as any).message || 'Not a Ruby+ ticket.';
      break;
  }

  return (
    <div className={`card p-6 ${bg} border-2 ${border}`}>
      <div className="flex items-center gap-4">
        <div className={fg}>{icon}</div>
        <div>
          <div className={`text-xl font-bold ${fg}`}>{title}</div>
          <div className={`text-sm ${fg} opacity-80 mt-1`}>{body}</div>
        </div>
      </div>
    </div>
  );
}
