import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@fg/ui/styles/globals.css';

export const metadata: Metadata = {
  title: 'Family Guardian — AI Daily Check-ins for At-Risk Patients',
  description:
    'Risk-bearing healthcare buyers use Family Guardian to deliver daily AI check-in calls that catch deterioration before it becomes a readmission.',
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
