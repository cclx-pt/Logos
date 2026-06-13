import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { LiveBadge } from './live-badge';

describe('LiveBadge', () => {
  it('mostra "Ao vivo" com o ponto a pulsar no estado live', () => {
    const { container } = render(<LiveBadge live />);
    expect(screen.getByText('Ao vivo')).toBeInTheDocument();
    expect(container.querySelector('.animate-live-pulse')).not.toBeNull();
  });

  it('mostra "Offline" sem animação no estado offline', () => {
    const { container } = render(<LiveBadge live={false} />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(container.querySelector('.animate-live-pulse')).toBeNull();
  });
});
