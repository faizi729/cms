import db from '@/db';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/rbac-server';
import { PERMISSION } from '@/lib/rbac';

export const POST = async (req: NextRequest) => {
  try {
    const {
      updates,
      contentId,
      adminPassword,
    }: {
      updates: any;
      contentId: number;
      adminPassword?: string;
    } = await req.json();

    if (!(await authorizeAdminRequest(PERMISSION.CONTENT_MANAGE, adminPassword))) {
      return NextResponse.json({}, { status: 403 });
    }
    await db.videoMetadata.update({
      where: {
        contentId,
      },
      data: updates,
    });

    return NextResponse.json({}, { status: 200 });
  } catch (err) {
    return NextResponse.json({}, { status: 500 });
  }
};
