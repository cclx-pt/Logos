import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EscolaBiblicaContent } from './escola-biblica-content';

describe('EscolaBiblicaContent', () => {
  it('apresenta heading "Escola Bíblica" e nota "Em breve"', () => {
    render(<EscolaBiblicaContent />);
    expect(
      screen.getByRole('heading', { level: 1, name: /^escola bíblica$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^em breve$/i)).toBeInTheDocument();
  });
});
