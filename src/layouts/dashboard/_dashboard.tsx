import cn from 'classnames';
import React from 'react';
import { Header } from '@/layouts/_layout';
import Footer from '@/components/ui/Footer';
require('@demox-labs/aleo-wallet-adapter-reactui/dist/styles.css');

interface DashboardLayoutProps {
  contentClassName?: string;
}

export default function Layout({
  children,
  contentClassName,
}: React.PropsWithChildren<DashboardLayoutProps>) {
  return (
    <div>
      <Header />
      
      <main
        className={cn(
          'min-h-[100vh] px-4 pt-24 pb-16 sm:px-6 sm:pb-20 lg:px-8 xl:px-10 xl:pb-24 3xl:px-12',
          contentClassName
        )}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
