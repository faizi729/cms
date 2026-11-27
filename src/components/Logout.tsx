'use client';

import { logout } from '@/lib/logout';
import { Button } from './ui/button';

export const Logout = () => {
  return (
    <Button
      size={'sm'}
      variant={'secondary'}
      id="navbar-default"
      onClick={() => {
        logout();
      }}
    >
      Logout
    </Button>
  );
};
