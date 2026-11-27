'use client';
import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const MAX_BYTES = 5 * 1024 * 1024; // keep in sync with MAX_IMAGE_BYTES in lib/s3.ts
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

type Props = {
  /** Current image URL ('' when none). */
  value: string;
  /** Called with the S3 URL after a successful upload, or '' when removed. */
  onChange: (url: string) => void;
  /** S3 folder: 'courses' for course covers, 'thumbnails' for content. */
  folder: 'courses' | 'thumbnails';
  /** Lets a parent disable its submit button while an upload is running. */
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
};

export default function ImageUpload({
  value,
  onChange,
  folder,
  onUploadingChange,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const setBusy = (busy: boolean) => {
    setUploading(busy);
    onUploadingChange?.(busy);
  };

  const upload = async (file: File) => {
    if (!ACCEPT.split(',').includes(file.type)) {
      toast.error('Only JPG, PNG, WebP or GIF images are allowed.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image is too large. Max size is 5 MB.');
      return;
    }

    const body = new FormData();
    body.append('file', file);
    body.append('folder', folder);

    setBusy(true);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        toast.error(data.message || 'Upload failed. Please try again.');
        return;
      }
      onChange(data.url);
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed. Check your connection and try again.');
    } finally {
      setBusy(false);
      // Allow choosing the same file again after a failure or removal.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) upload(file);
  };

  const isDisabled = disabled || uploading;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={isDisabled}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {value ? (
        <div className="relative w-full overflow-hidden rounded-lg border-2">
          <img
            src={value}
            alt="Uploaded image preview"
            className="h-40 w-full object-cover"
          />
          <div className="absolute right-2 top-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isDisabled}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : 'Replace'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isDisabled}
              onClick={() => onChange('')}
              aria-label="Remove image"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!isDisabled) handleFiles(e.dataTransfer.files);
          }}
          className={`flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-gray-500 transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-500/5' : 'hover:border-blue-500'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <ImagePlus className="size-6" />
              <span>Click or drag an image here</span>
              <span className="text-xs">JPG, PNG, WebP or GIF, up to 5 MB</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
