import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'sonner';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { FirstVisitTutorialGate } from '@/components/site/first-visit-tutorial-gate';
import { SkipLink } from '@/components/site/skip-link';
import { siteConfig } from '@/lib/site-config';
import { cormorant, inter } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} · ${siteConfig.organization.name}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT" className={`${cormorant.variable} ${inter.variable} h-full antialiased`}>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <SkipLink />
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
        <FirstVisitTutorialGate />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ classNames: { toast: 'font-sans' } }}
        />
        <Analytics />
      </body>
    </html>
  );
}
