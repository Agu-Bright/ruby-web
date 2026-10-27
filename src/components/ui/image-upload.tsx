'use client';

import { useState, useRef, useCallback, useEffect, useId } from 'react';
import { Upload, X, Loader2, AlertCircle, RotateCcw, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { compressImage } from '@/lib/image-compress';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  folder?: string;
  label?: string;
  helpText?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  scope?: 'admin' | 'business';
}

// HEIC/HEIF included because iPhones capture in HEIC by default. The browser
// can't be relied on to convert HEIC, so we upload the original and the backend
// normalizes it to JPEG (see media.service.ts). iOS renders HEIC in <img>, so
// the local preview below still shows the selected photo.
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.svg,.heic,.heif';
// Generous pre-compression ceiling — only blocks absurd files. The real
// per-upload limit (maxSizeMB) is enforced AFTER compression for non-HEIC.
const MAX_INPUT_MB = 30;

type Status = 'idle' | 'working' | 'error';

const isHeicFile = (file: File) =>
  /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

export function ImageUpload({
  value,
  onChange,
  folder = 'uploads',
  label,
  helpText,
  maxSizeMB = 5,
  disabled = false,
  scope,
}: ImageUploadProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [statusLabel, setStatusLabel] = useState('Uploading…');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [diag, setDiag] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const lastFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // Unique, SSR-stable id so each <label htmlFor> targets its own <input>, even
  // when many uploaders render in the same grid (hotel room photos).
  const inputId = useId();

  // Small visible breadcrumb so a phone screenshot shows exactly where an
  // upload got to. sessionStorage survives an in-app-browser reload, so if the
  // page reloads when the photo picker opens, the last step still shows.
  const trace = useCallback((msg: string) => {
    const line = `${new Date().toLocaleTimeString()} · ${msg}`;
    setDiag(line);
    try { sessionStorage.setItem('ruby_upload_trace', line); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('ruby_upload_trace');
      if (saved) setDiag(saved);
    } catch { /* ignore */ }
  }, []);

  const setLocalPreview = useCallback((file: File | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (file) {
      try {
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setPreviewUrl(url);
        return;
      } catch {
        // createObjectURL can fail in rare mobile states; fall through.
      }
    }
    setPreviewUrl(null);
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  // A shared uploader is used in both dashboards. Infer the business portal
  // when callers do not provide a scope so its token is never sent to admin
  // media routes. On business.rubyplus.net the middleware rewrites to
  // /business/* SERVER-side only — the browser path stays clean — so we also
  // detect the `business.` subdomain by hostname. Callers should still pass
  // scope explicitly; this is the safety net.
  const resolvedScope = scope ?? (
    typeof window !== 'undefined' && (
      window.location.hostname.startsWith('business.') ||
      window.location.pathname.startsWith('/business/')
    )
      ? 'business'
      : 'admin'
  );

  const validateFile = useCallback((file: File): string | null => {
    const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
    const typeOk =
      ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.split(',').includes(ext);
    if (!typeOk) {
      return 'Unsupported file type. Please upload a JPEG, PNG, WebP, HEIC or SVG image.';
    }
    if (file.size > MAX_INPUT_MB * 1024 * 1024) {
      return `This photo is ${(file.size / 1024 / 1024).toFixed(1)}MB — too large (max ${MAX_INPUT_MB}MB).`;
    }
    return null;
  }, []);

  const runUpload = useCallback(
    async (file: File) => {
      lastFileRef.current = file;
      trace(`selected ${file.name || 'photo'} (${(file.size / 1024 / 1024).toFixed(1)}MB, ${file.type || 'no type'})`);

      const validationError = validateFile(file);
      if (validationError) {
        setLocalPreview(file);
        setError(validationError);
        setStatus('error');
        trace(`rejected: ${validationError}`);
        return;
      }

      setError(null);
      setLocalPreview(file);
      setStatus('working');

      try {
        let toUpload = file;

        if (isHeicFile(file)) {
          setStatusLabel('Uploading…');
        } else {
          setStatusLabel('Optimizing…');
          try {
            const compressed = await compressImage(file);
            if (compressed.size > maxSizeMB * 1024 * 1024) {
              setError(
                `This image is ${(compressed.size / 1024 / 1024).toFixed(1)}MB after compression (max ${maxSizeMB}MB). Please use a smaller photo.`,
              );
              setStatus('error');
              trace('rejected: too large after compression');
              return;
            }
            toUpload = compressed;
          } catch {
            toUpload = file; // compression failed → upload original
          }
          setStatusLabel('Uploading…');
        }

        trace('uploading…');
        const res = resolvedScope === 'business'
          ? await api.businessMedia.upload(toUpload)
          : await api.media.upload(toUpload, folder);

        if (!res?.data?.url) {
          throw new Error('The server did not return an image URL.');
        }

        onChange(res.data.url);
        setLocalPreview(null);
        setStatus('idle');
        setError(null);
        trace('uploaded ✓');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setError(message);
        setStatus('error');
        trace(`failed: ${message}`);
      }
    },
    [folder, maxSizeMB, onChange, resolvedScope, setLocalPreview, trace, validateFile],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (file) runUpload(file);
    else trace('picker returned no file');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || status === 'working') return;
    const file = e.dataTransfer.files?.[0];
    if (file) runUpload(file);
  };

  const handleRetry = () => {
    if (lastFileRef.current) runUpload(lastFileRef.current);
  };

  const handleDismissError = () => {
    setError(null);
    setStatus('idle');
    setLocalPreview(null);
  };

  const handleRemove = () => {
    onChange(undefined);
    setError(null);
    setStatus('idle');
    setLocalPreview(null);
  };

  // A real, tappable file input overlaid on its target. We trigger the picker
  // natively (tap the input / its <label>) instead of calling input.click()
  // from JS — the programmatic-click pattern silently fails to deliver the
  // selection in several iPhone in-app browsers.
  const fileInput = (
    <input
      id={inputId}
      type="file"
      accept={ACCEPTED_EXTENSIONS}
      onChange={handleFileSelect}
      disabled={disabled || status === 'working'}
      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      aria-label={label || 'Upload image'}
    />
  );

  const diagLine = diag ? (
    <p className="mt-1 text-[10px] leading-snug text-gray-400 break-words">status: {diag}</p>
  ) : null;

  // ---- STATE 1: in-progress or failed ----
  if (status === 'working' || status === 'error') {
    const shownImage = previewUrl || value;
    return (
      <div>
        {label && <label className="label-text">{label}</label>}
        <div
          className={`relative flex items-center justify-center w-full h-28 overflow-hidden rounded-lg border-2 ${
            status === 'error' ? 'border-red-300' : 'border-gray-200'
          } bg-gray-900`}
        >
          {shownImage ? (
            <img
              src={shownImage}
              alt="Selected"
              className="w-full h-full object-cover opacity-70"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          ) : null}

          {status === 'working' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
              <span className="text-xs font-medium text-white">{statusLabel}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-red-900/55 px-3 text-center">
              <AlertCircle className="w-6 h-6 text-white" />
              <span className="text-xs font-semibold text-white">Upload failed</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-900 hover:bg-gray-100"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/25"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          )}
        </div>
        {status === 'error' && error && (
          <div className="flex items-start gap-1.5 mt-1.5 text-red-600">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-snug">{error}</p>
          </div>
        )}
        {diagLine}
      </div>
    );
  }

  // ---- STATE 2: uploaded ----
  if (value) {
    return (
      <div>
        {label && <label className="label-text">{label}</label>}
        <div className="relative group w-full h-28 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
          <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 shadow-sm">
            <Check className="w-3 h-3" /> Uploaded
          </span>
          {!disabled && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent px-2.5 py-1.5">
              <label
                htmlFor={inputId}
                className="relative cursor-pointer text-[11px] font-semibold text-white hover:underline"
              >
                Replace
                {fileInput}
              </label>
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-white hover:underline"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          )}
        </div>
        {helpText && <p className="text-[11px] text-gray-400 mt-1.5">{helpText}</p>}
        {diagLine}
      </div>
    );
  }

  // ---- STATE 3: empty dropzone (native tap target) ----
  return (
    <div>
      {label && <label className="label-text">{label}</label>}
      <label
        htmlFor={inputId}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        className={`
          relative flex flex-col items-center justify-center w-full h-28 rounded-lg border-2 border-dashed transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : 'cursor-pointer'}
          ${isDragOver ? 'border-ruby-400 bg-ruby-50/50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100/50'}
        `}
      >
        <div className="pointer-events-none flex flex-col items-center">
          <Upload className="w-5 h-5 text-gray-400 mb-1" />
          <p className="text-xs text-gray-600 font-medium">Tap to upload a photo</p>
          <p className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG, WebP, HEIC (iPhone) or SVG</p>
        </div>
        {fileInput}
      </label>
      {helpText && <p className="text-[11px] text-gray-400 mt-1">{helpText}</p>}
      {diagLine}
    </div>
  );
}
