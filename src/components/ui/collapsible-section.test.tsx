import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { CollapsibleSection } from './collapsible-section';

describe('CollapsibleSection', () => {
  it('renderiza title como heading nível 2', () => {
    render(
      <CollapsibleSection title="Módulos">
        <p>conteúdo</p>
      </CollapsibleSection>,
    );
    expect(screen.getByRole('heading', { level: 2, name: /^módulos$/i })).toBeInTheDocument();
  });

  it('renderiza subtitle quando fornecido', () => {
    render(
      <CollapsibleSection title="Módulos" subtitle="Gere os módulos do curso aqui">
        <p>x</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText(/gere os módulos do curso/i)).toBeInTheDocument();
  });

  it('expõe children dentro de details aberto por defeito', () => {
    const { container } = render(
      <CollapsibleSection title="Open">
        <p>conteúdo visível</p>
      </CollapsibleSection>,
    );
    const details = container.querySelector('details');
    expect(details).toHaveAttribute('open');
    expect(screen.getByText(/conteúdo visível/i)).toBeInTheDocument();
  });

  it('respeita defaultOpen=false', () => {
    const { container } = render(
      <CollapsibleSection title="Fechada" defaultOpen={false}>
        <p>oculta</p>
      </CollapsibleSection>,
    );
    const details = container.querySelector('details');
    expect(details).not.toHaveAttribute('open');
  });

  it('variant="danger" aplica border-destructive', () => {
    const { container } = render(
      <CollapsibleSection title="Zona de perigo" variant="danger">
        <p>x</p>
      </CollapsibleSection>,
    );
    const details = container.querySelector('details')!;
    expect(details.className).toMatch(/border-destructive/);
  });

  it('aplica id-heading quando id é dado', () => {
    render(
      <CollapsibleSection id="modulos" title="Módulos">
        <p>x</p>
      </CollapsibleSection>,
    );
    expect(screen.getByRole('heading', { name: /módulos/i })).toHaveAttribute(
      'id',
      'modulos-heading',
    );
  });
});
