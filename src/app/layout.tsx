import type { Metadata } from 'next';
import { cormorant, inter } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Logos — CCLX',
    template: '%s · Logos',
  },
  description: 'Plataforma de estudo bíblico da CCLX.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT" className={`${cormorant.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
