'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
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

// HEIC/HEIF included because iPhones capture in HEIC by default. compressImage
// rasterizes them to JPEG (iOS Safari decodes HEIC on canvas) before upload.
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.svg,.heic,.heif';
// Generous pre-compression ceiling — only blocks absurd files. The real
// per-upload limit (maxSizeMB) is enforced AFTER compression, since phone
// photos are often several MB raw but compress far below it.
const MAX_INPUT_MB = 30;

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
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // A shared uploader is used in both dashboards. Infer the business portal
  // when callers do not provide a scope so its token is never sent to admin
  // media routes.
  //
  // IMPORTANT: on business.rubyplus.net the middleware rewrites requests to
  // /business/* SERVER-side, but the browser URL stays clean (e.g.
  // /dashboard/rooms), so `pathname.startsWith('/business/')` is false there.
  // We must also detect the `business.` subdomain by hostname, otherwise a
  // business user's upload wrongly hits /admin/media/upload (admin auth) and
  // fails — which blocked hotel room / service photo uploads. Callers should
  // still pass scope explicitly; this is the safety net.
  const resolvedScope = scope ?? (
    typeof window !== 'undefined' && (
      window.location.hostname.startsWith('business.') ||
      window.location.pathname.startsWith('/business/')
    )
      ? 'business'
      : 'admin'
  );

  const validateFile = useCallback(
    (file: File): string | null => {
      // Accept by MIME type, or fall back to the file extension — some mobile
      // browsers report an empty/omitted MIME type (notably HEIC on iOS), which
      // would otherwise fail a strict type check and block the upload.
      const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
      const typeOk =
        ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.split(',').includes(ext);
      if (!typeOk) {
        return 'Unsupported file type. Please upload a JPEG, PNG, WebP, HEIC or SVG image.';
      }
      // Only a generous pre-compression ceiling here; the per-upload limit is
      // checked after compression in handleUpload.
      if (file.size > MAX_INPUT_MB * 1024 * 1024) {
        return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${MAX_INPUT_MB}MB`;
      }
      return null;
    },
    [],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);

      try {
        // iPhone photos are HEIC. Browsers cannot reliably decode HEIC on a
        // canvas (createImageBitmap throws on several iOS Safari versions, and
        // Android can't decode it at all), so we must NOT run client-side
        // compression on it — that was silently blocking phone uploads. HEIC
        // files are already small, so we upload the original and let the
        // backend normalize it to JPEG. Everything else compresses as before.
        const isHeic =
          /heic|heif/i.test(file.type) ||
          /\.(heic|heif)$/i.test(file.name);

        let toUpload = file;
        if (!isHeic) {
          setIsCompressing(true);
          toUpload = await compressImage(file);
          setIsCompressing(false);

          if (toUpload.size > maxSizeMB * 1024 * 1024) {
            setError(
              `This image is ${(toUpload.size / 1024 / 1024).toFixed(1)}MB after compression (max ${maxSizeMB}MB). Please use a smaller photo.`,
            );
            return;
          }
        }
        // HEIC uploads the original, already bounded by MAX_INPUT_MB in
        // validateFile; the backend converts + stores a compact JPEG.

        setIsUploading(true);
        const res = resolvedScope === 'business'
          ? await api.businessMedia.upload(toUpload)
          : await api.media.upload(toUpload, folder);
        onChange(res.data.url);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Upload failed';
        setError(message);
      } finally {
        setIsCompressing(false);
        setIsUploading(false);
      }
    },
    [folder, maxSizeMB, onChange, resolvedScope, validateFile],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading || isCompressing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading && !isCompressing) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemove = () => {
    onChange(undefined);
    setError(null);
  };

  // Has image — show preview
  if (value) {
    return (
      <div>
        {label && <label className="label-text">{label}</label>}
        <div className="flex items-center gap-3">
          <div className="relative group w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 shrink-0">
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-full object-contain p-1.5"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-1 -right-1 p-1 rounded-full bg-white shadow-sm border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-600 font-medium">Icon uploaded</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-ruby-600 hover:text-ruby-700 font-medium"
              >
                Replace
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />
        </div>
        {helpText && (
          <p className="text-[11px] text-gray-400 mt-1.5">{helpText}</p>
        )}
      </div>
    );
  }

  // Empty — show dropzone
  return (
    <div>
      {label && <label className="label-text">{label}</label>}
      <div
        onClick={() => !disabled && !isUploading && !isCompressing && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative flex flex-col items-center justify-center w-full h-24 rounded-lg border-2 border-dashed cursor-pointer transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : ''}
          ${isDragOver ? 'border-ruby-400 bg-ruby-50/50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100/50'}
          ${error ? 'border-red-300 bg-red-50/30' : ''}
        `}
      >
        {isCompressing || isUploading ? (
          <>
            <Loader2 className="w-5 h-5 text-ruby-500 animate-spin mb-1" />
            <p className="text-xs text-gray-500">
              {isCompressing ? 'Compressing...' : 'Uploading...'}
            </p>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-gray-400 mb-1" />
            <p className="text-xs text-gray-600 font-medium">
              Click to upload or drag and drop
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              JPEG, PNG, WebP or SVG (max {maxSizeMB}MB)
            </p>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {helpText && !error && (
        <p className="text-[11px] text-gray-400 mt-1">{helpText}</p>
      )}
    </div>
  );
}
