import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('é aria-hidden por defeito (não anunciado a leitores de ecrã)', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const node = container.querySelector('[data-slot="skeleton"]');
    expect(node).not.toBeNull();
    expect(node).toHaveAttribute('aria-hidden', 'true');
  });

  it('aplica animate-pulse + bg-muted', () => {
    const { container } = render(<Skeleton />);
    const node = container.querySelector('[data-slot="skeleton"]')!;
    expect(node.className).toMatch(/animate-pulse/);
    expect(node.className).toMatch(/bg-muted/);
  });

  it('mantém className extra', () => {
    const { container } = render(<Skeleton className="h-12 w-12 rounded-xl" />);
    const node = container.querySelector('[data-slot="skeleton"]')!;
    expect(node.className).toMatch(/h-12/);
    expect(node.className).toMatch(/w-12/);
    expect(node.className).toMatch(/rounded-xl/);
  });
});
