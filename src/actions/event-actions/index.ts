'use server';

import prisma from '@/db';
import { Event } from '@prisma/client';
import { PERMISSION } from '@/lib/rbac';
import { getUserWithPermission } from '@/lib/rbac-server';

import { revalidatePath } from 'next/cache';

async function isAdmin() {
  return !!(await getUserWithPermission(PERMISSION.EVENT_MANAGE));
}

export async function fetchEvents() {
  return await prisma.event.findMany();
}

export async function addEvent(
  event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>,
) {
  if (!(await isAdmin())) {
    return { error: 'Unauthorized' };
  }

  await prisma.event.create({ data: event });
  revalidatePath('/');
}

export async function updateEvent(event: Event) {
  if (!(await isAdmin())) {
    return { error: 'Unauthorized' };
  }

  await prisma.event.update({
    where: { id: event.id },
    data: event,
  });
  revalidatePath('/');
}

export async function deleteEvent(id: number) {
  if (!(await isAdmin())) {
    return { error: 'Unauthorized' };
  }

  await prisma.event.delete({ where: { id } });
  revalidatePath('/');
}
