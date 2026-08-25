import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TableScroll } from './table-scroll';

const HINT = /desliza a tabela para o lado/i;

/**
 * jsdom não faz layout: `scrollWidth` e `clientWidth` são sempre 0. Para
 * simular "a tabela é mais larga que o ecrã" trocamos os getters no protótipo
 * e repomo-los no fim de cada teste.
 */
function mockWidths(scrollWidth: number, clientWidth: number) {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => scrollWidth,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  });
}

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
});

function renderTable() {
  return render(
    <TableScroll label="Tabela de utilizadores">
      <table>
        <tbody>
          <tr>
            <td>Ana</td>
          </tr>
        </tbody>
      </table>
    </TableScroll>,
  );
}

describe('TableScroll', () => {
  it('deixa o conteúdo deslizar na horizontal em vez de o cortar', () => {
    mockWidths(0, 0);
    const { container } = renderTable();

    // A correção do bug é só CSS: sem `overflow-x-auto` as colunas da direita
    // ficavam cortadas e inalcançáveis em telemóvel.
    const scroller = container.querySelector('.overflow-x-auto');
    expect(scroller).not.toBeNull();
    expect(scroller?.className).not.toMatch(/overflow-hidden/);
  });

  it('quando a tabela cabe no ecrã, não põe região focável nem dica', () => {
    mockWidths(400, 400);
    renderTable();

    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('quando a tabela é mais larga que o ecrã, expõe região focável e avisa', () => {
    mockWidths(900, 400);
    renderTable();

    // Região focável = scroll pelo teclado (WCAG 2.1.1).
    const region = screen.getByRole('region', { name: 'Tabela de utilizadores' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(screen.getByText(HINT)).toBeVisible();
  });
});
