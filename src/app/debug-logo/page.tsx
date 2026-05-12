import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Debug · Logo',
  robots: { index: false, follow: false },
};

const variants = [
  {
    label: 'A — Original (com fundo F7F7F7 do SVG)',
    src: '/logo-cclx.svg',
  },
  {
    label: 'B — Limpo (sem path de fundo)',
    src: '/logo-cclx-clean.svg',
  },
];

const backgrounds = [
  { label: 'cream-bg (#FAF4EA)', className: 'bg-background' },
  { label: 'cream-card (#FBE6D4)', className: 'bg-[#fbe6d4]' },
  { label: 'branco', className: 'bg-white' },
  { label: 'ink (#1A1A1A)', className: 'bg-ink' },
];

export default function DebugLogoPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-ink text-3xl font-medium">Debug · Logo SVG</h1>
      <p className="text-muted-foreground mt-3 font-sans text-sm">
        Comparação visual das duas versões do SVG entregue pelo ministério, contra diferentes
        fundos. Ajuda a decidir qual usar no shell (`Logo` component).
      </p>

      <div className="mt-10 space-y-12">
        {variants.map((v) => (
          <div key={v.src}>
            <h2 className="text-ink font-display text-xl font-medium">{v.label}</h2>
            <p className="text-muted-foreground mt-1 font-mono text-xs">{v.src}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {backgrounds.map((bg) => (
                <div
                  key={bg.label}
                  className={`border-border flex flex-col items-center justify-center gap-2 rounded-md border p-6 ${bg.className}`}
                >
                  <Image
                    src={v.src}
                    alt={`${v.label} sobre ${bg.label}`}
                    width={1600}
                    height={913}
                    unoptimized
                    className="h-16 w-auto"
                  />
                  <span
                    className={`font-mono text-xs ${bg.className === 'bg-ink' ? 'text-white/70' : 'text-muted-foreground'}`}
                  >
                    {bg.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h2 className="text-ink font-display text-xl font-medium">Header (estado actual)</h2>
          <p className="text-muted-foreground mt-1 font-sans text-sm">
            O componente Logo no header usa actualmente <code>/logo-cclx-clean.svg</code>. Se
            achares que A é melhor, mudo para <code>/logo-cclx.svg</code>.
          </p>
        </div>
      </div>
    </section>
  );
}
