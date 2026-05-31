import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TableDrop — Group Ordering',
  description: 'Order together, eat together. The modern group ordering experience.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="noise-bg min-h-screen bg-cream">
        {children}
      </body>
    </html>
  );
}
