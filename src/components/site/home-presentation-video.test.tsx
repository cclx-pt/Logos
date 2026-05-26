import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { HomePresentationVideo } from './home-presentation-video';

describe('HomePresentationVideo', () => {
  it('é uma section identificada como vídeo de apresentação do LOGOS', () => {
    render(<HomePresentationVideo />);
    expect(screen.getByLabelText(/^vídeo de apresentação do LOGOS$/i)).toBeInTheDocument();
  });

  it('renderiza placeholder "em preparação" quando o videoId está vazio', () => {
    render(<HomePresentationVideo videoId="" />);
    expect(screen.getByText(/Vídeo de apresentação em preparação/i)).toBeInTheDocument();
    expect(screen.queryByTitle(/Vídeo de apresentação do LOGOS/i)).not.toBeInTheDocument();
  });

  it('renderiza iframe YouTube quando o videoId está definido', () => {
    render(<HomePresentationVideo videoId="dQw4w9WgXcQ" />);
    const iframe = screen.getByTitle(/Vídeo de apresentação do LOGOS/i);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
    );
    expect(iframe).toHaveAttribute('loading', 'lazy');
    expect(iframe).toHaveAttribute('allowFullScreen');
  });
});
