import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CCA Dashboard MVP',
  description: 'Client content calendar, review approval page, and internal CCA review queue.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
