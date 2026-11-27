import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/rbac-server';
import { PERMISSION } from '@/lib/rbac';
import db from '@/db';
import { z } from 'zod';

const requestBodySchema = z.object({
  adminSecret: z.string().optional(),
  title: z.string(),
  description: z.string(),
  imageUrl: z
    .string()
    .url({ message: 'URL should be valid image url' })
    .or(z.string()),
  id: z.string(),
  slug: z.string(),
  appxCourseId: z.string(),
  discordRoleId: z.string(),
});

export async function POST(req: NextRequest) {
  const parseResult = requestBodySchema.safeParse(await req.json());

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.message },
      { status: 400 },
    );
  }

  const {
    adminSecret,
    title,
    description,
    imageUrl,
    id,
    slug,
    appxCourseId,
    discordRoleId,
  } = parseResult.data;

  if (!(await authorizeAdminRequest(PERMISSION.CONTENT_MANAGE, adminSecret))) {
    return NextResponse.json({}, { status: 401 });
  }

  await db.course.create({
    data: {
      title,
      imageUrl,
      slug,
      description,
      id: parseInt(id, 10),
      appxCourseId: parseInt(appxCourseId, 10).toString(),
      discordRoleId,
    },
  });

  return NextResponse.json(
    {
      message: 'Course is successfully added',
    },
    {
      status: 200,
    },
  );
}
