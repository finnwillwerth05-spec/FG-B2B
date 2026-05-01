import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@fg/ui/styles/globals.css';

export const metadata: Metadata = {
  title: 'Family Guardian — Care Team',
  description: 'Care team console for daily check-in calls.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
