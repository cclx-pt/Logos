import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/courses/enrollment', () => ({
  enrollAction: vi.fn(),
}));

import { EnrollCourseCta } from './enroll-course-cta';

describe('EnrollCourseCta', () => {
  it('convida a adicionar a “Meus cursos” (inscrever não é navegar para uma aula)', () => {
    render(<EnrollCourseCta courseId="11111111-1111-1111-1111-111111111111" />);
    expect(screen.getByRole('button', { name: /adicionar a “meus cursos”/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /começar curso/i })).not.toBeInTheDocument();
  });
});
