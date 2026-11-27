'use client';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { SessionProvider } from 'next-auth/react';
import { RecoilRoot } from 'recoil';

export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        disableTransitionOnChange
      >
        <RecoilRoot>{children}</RecoilRoot>
      </ThemeProvider>
    </SessionProvider>
  );
};
