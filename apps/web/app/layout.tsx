import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CostTracking CRM',
  description: 'Enterprise internal CRM and cloud management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased dark`}>
      <body className="min-h-full bg-slate-950 text-slate-100 flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
