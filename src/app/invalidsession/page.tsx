'use client';

import { logout } from '@/lib/logout';
import React, { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

const page = () => {
  useEffect(() => {
    (async () => {
      toast('Too many devices connected. Logging out!', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await logout('/signin');
    })();
  }, []);

  return (
    <div>
      <Toaster />
    </div>
  );
};

export default page;
