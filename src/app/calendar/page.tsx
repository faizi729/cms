import { redirect } from 'next/navigation';
import React from 'react';
import CalendarPageComponent from '@/components/big-calendar/calendar';
import { getCurrentUser } from '@/lib/rbac-server';
import { hasPermission, PERMISSION } from '@/lib/rbac';

const CalendarPage = async () => {
  const user = await getCurrentUser();
  if (!user) {
    return redirect('/signin');
  }

  const isAdmin = hasPermission(user.role, PERMISSION.EVENT_MANAGE);

  return (
    <div className="wrapper flex min-h-screen">
      <CalendarPageComponent isAdmin={isAdmin} />
    </div>
  );
};

export default CalendarPage;
