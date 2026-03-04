'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  folder?: string;
  label?: string;
  helpText?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.svg';

export function ImageUpload({
  value,
  onChange,
  folder = 'uploads',
  label,
  helpText,
  maxSizeMB = 5,
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return `Invalid file type: ${file.type}. Accepted: JPEG, PNG, WebP, SVG`;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${maxSizeMB}MB`;
      }
      return null;
    },
    [maxSizeMB],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        const res = await api.media.upload(file, folder);
        onChange(res.data.url);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Upload failed';
        setError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [folder, onChange, validateFile],
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
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) setIsDragOver(true);
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
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
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
        {isUploading ? (
          <>
            <Loader2 className="w-5 h-5 text-ruby-500 animate-spin mb-1" />
            <p className="text-xs text-gray-500">Uploading...</p>
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
