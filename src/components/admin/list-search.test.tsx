import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import { ListSearch } from './list-search';

function renderList() {
  return render(
    <ListSearch label="Pesquisar curso" placeholder="Pesquisar...">
      <ul>
        <li data-search-text="marcos" data-testid="row-marcos">
          Marcos
        </li>
        <li data-search-text="lucas" data-testid="row-lucas">
          Lucas
        </li>
        <li data-search-text="romanos" data-testid="row-romanos">
          Romanos
        </li>
      </ul>
    </ListSearch>,
  );
}

describe('ListSearch', () => {
  it('renderiza input com label acessível', () => {
    renderList();
    expect(screen.getByLabelText(/pesquisar curso/i)).toBeInTheDocument();
  });

  it('todos os itens visíveis quando query está vazia', () => {
    renderList();
    expect(screen.getByTestId('row-marcos')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('row-lucas')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('row-romanos')).not.toHaveAttribute('hidden');
  });

  it('filtra por substring case-insensitive', async () => {
    const user = userEvent.setup();
    renderList();
    const input = screen.getByLabelText(/pesquisar curso/i);
    await user.type(input, 'MAR');
    expect(screen.getByTestId('row-marcos')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('row-lucas')).toHaveAttribute('hidden');
    expect(screen.getByTestId('row-romanos')).toHaveAttribute('hidden');
  });

  it('mostra emptyMessage quando nada bate', async () => {
    const user = userEvent.setup();
    renderList();
    await user.type(screen.getByLabelText(/pesquisar curso/i), 'hebreu');
    expect(screen.getByRole('status')).toHaveTextContent(/sem resultados/i);
  });

  it('limpar input torna a mostrar tudo e esconde emptyMessage', async () => {
    const user = userEvent.setup();
    renderList();
    const input = screen.getByLabelText(/pesquisar curso/i);
    await user.type(input, 'xyz');
    expect(screen.getByRole('status')).toBeInTheDocument();
    await user.clear(input);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-marcos')).not.toHaveAttribute('hidden');
  });

  it('ignora espaços à volta da query', async () => {
    const user = userEvent.setup();
    renderList();
    await user.type(screen.getByLabelText(/pesquisar curso/i), '   lucas   ');
    expect(screen.getByTestId('row-marcos')).toHaveAttribute('hidden');
    expect(screen.getByTestId('row-lucas')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('row-romanos')).toHaveAttribute('hidden');
  });
});
