'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Revoke any object URL we created when it changes or on unmount, so the
  // browser doesn't leak the decoded image (matters on phones).
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
  // /business/* SERVER-side only — the browser path stays clean — so we must
  // detect the `business.` subdomain by hostname too. Callers should still pass
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
    // Accept by MIME type, or fall back to the file extension — some mobile
    // browsers report an empty/omitted MIME type (notably HEIC on iOS).
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

  // The actual processing + upload. Separated so Retry can re-run it with the
  // exact same file. Every exit path leaves a VISIBLE state — a selected photo
  // can never silently disappear.
  const runUpload = useCallback(
    async (file: File) => {
      lastFileRef.current = file;

      const validationError = validateFile(file);
      if (validationError) {
        // Still show the picked photo so the user sees what was rejected.
        setLocalPreview(file);
        setError(validationError);
        setStatus('error');
        return;
      }

      setError(null);
      setLocalPreview(file);
      setStatus('working');

      try {
        let toUpload = file;

        if (isHeicFile(file)) {
          // Do NOT run the fragile browser canvas decode on HEIC — it throws or
          // hangs on iOS. Upload the original (HEIC is already small); the
          // backend converts it to JPEG.
          setStatusLabel('Uploading…');
        } else {
          // Best-effort client compression. If it ever fails, fall back to the
          // original rather than blocking the upload.
          setStatusLabel('Optimizing…');
          try {
            const compressed = await compressImage(file);
            if (compressed.size > maxSizeMB * 1024 * 1024) {
              setError(
                `This image is ${(compressed.size / 1024 / 1024).toFixed(1)}MB after compression (max ${maxSizeMB}MB). Please use a smaller photo.`,
              );
              setStatus('error');
              return;
            }
            toUpload = compressed;
          } catch {
            // Compression failed — upload the original; backend still stores it.
            toUpload = file;
          }
          setStatusLabel('Uploading…');
        }

        const res = resolvedScope === 'business'
          ? await api.businessMedia.upload(toUpload)
          : await api.media.upload(toUpload, folder);

        if (!res?.data?.url) {
          throw new Error('The server did not return an image URL.');
        }

        // Success — hand the URL up. Clear local state; the parent now owns the
        // image via `value` (or appends it to a list).
        onChange(res.data.url);
        setLocalPreview(null);
        setStatus('idle');
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setError(message);
        setStatus('error');
      }
    },
    [folder, maxSizeMB, onChange, resolvedScope, setLocalPreview, validateFile],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (file) runUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || status === 'working') return;
    const file = e.dataTransfer.files?.[0];
    if (file) runUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && status !== 'working') setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
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

  const openPicker = () => {
    if (!disabled && status !== 'working') fileInputRef.current?.click();
  };

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept={ACCEPTED_EXTENSIONS}
      onChange={handleFileSelect}
      className="hidden"
      disabled={disabled || status === 'working'}
    />
  );

  // ---- STATE 1: in-progress or failed (local preview with overlay) ----
  // This guarantees the selected photo is always shown with clear feedback.
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
              // HEIC may not render in <img> on non-iOS; hide broken icon.
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          ) : null}

          {/* Working overlay */}
          {status === 'working' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
              <span className="text-xs font-medium text-white">{statusLabel}</span>
            </div>
          )}

          {/* Error overlay */}
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
        {hiddenInput}
      </div>
    );
  }

  // ---- STATE 2: uploaded (parent-owned value) ----
  if (value) {
    return (
      <div>
        {label && <label className="label-text">{label}</label>}
        <div className="relative group w-full h-28 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 shadow-sm">
              <Check className="w-3 h-3" /> Uploaded
            </span>
          </div>
          {!disabled && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={openPicker}
                className="text-[11px] font-semibold text-white hover:underline"
              >
                Replace
              </button>
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
        {hiddenInput}
      </div>
    );
  }

  // ---- STATE 3: empty dropzone ----
  return (
    <div>
      {label && <label className="label-text">{label}</label>}
      <div
        onClick={openPicker}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative flex flex-col items-center justify-center w-full h-28 rounded-lg border-2 border-dashed cursor-pointer transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : ''}
          ${isDragOver ? 'border-ruby-400 bg-ruby-50/50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100/50'}
        `}
      >
        <Upload className="w-5 h-5 text-gray-400 mb-1" />
        <p className="text-xs text-gray-600 font-medium">Click to upload or drag and drop</p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          JPEG, PNG, WebP, HEIC (iPhone) or SVG
        </p>
        {hiddenInput}
      </div>
      {helpText && <p className="text-[11px] text-gray-400 mt-1">{helpText}</p>}
    </div>
  );
}
