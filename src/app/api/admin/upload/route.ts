import { NextRequest, NextResponse } from 'next/server';
import { PERMISSION } from '@/lib/rbac';
import { authorizeAdminRequest } from '@/lib/rbac-server';
import {
  detectImageType,
  isS3Configured,
  MAX_IMAGE_BYTES,
  UPLOAD_FOLDERS,
  UploadFolder,
  uploadImageToS3,
} from '@/lib/s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Upload an image (course cover / content thumbnail) to S3.
 * Body: multipart/form-data with `file` and optional `folder`.
 * Returns: { url } — the public URL to store as imageUrl / thumbnail.
 */
export async function POST(req: NextRequest) {
  if (!(await authorizeAdminRequest(PERMISSION.CONTENT_MANAGE))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { message: 'Image upload is not configured on the server (S3 env vars missing).' },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: 'Invalid upload request.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ message: 'No file was uploaded.' }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ message: 'The file is empty.' }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { message: `Image is too large. Max size is ${MAX_IMAGE_BYTES / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  const rawFolder = form.get('folder');
  const folder: UploadFolder = UPLOAD_FOLDERS.includes(rawFolder as UploadFolder)
    ? (rawFolder as UploadFolder)
    : 'thumbnails';

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) {
    return NextResponse.json(
      { message: 'Only JPG, PNG, WebP or GIF images are allowed.' },
      { status: 415 },
    );
  }

  try {
    const { url } = await uploadImageToS3(bytes, type, folder);
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error('S3 upload failed', error);
    return NextResponse.json(
      { message: 'Upload to S3 failed. Please try again.' },
      { status: 502 },
    );
  }
}
