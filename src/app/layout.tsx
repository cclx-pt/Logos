import type { Metadata } from 'next';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { SkipLink } from '@/components/site/skip-link';
import { siteConfig } from '@/lib/site-config';
import { cormorant, inter } from './fonts';
import './globals.css';

const title = `${siteConfig.name} — ${siteConfig.organization.name}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: title,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    siteName: siteConfig.name,
    title,
    description: siteConfig.description,
    url: siteConfig.url,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `Livro — logótipo ${siteConfig.name} ${siteConfig.organization.name}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: siteConfig.description,
    images: ['/og-image.png'],
  },
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
      </body>
    </html>
  );
}
