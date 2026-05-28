import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { CourseImage } from './course-image';

describe('CourseImage', () => {
  it('renderiza o banner quando bannerUrl está presente', () => {
    render(
      <CourseImage
        bannerUrl="https://cdn.example/banner.jpg"
        iconSlug="cross"
        alt="Marcos"
        variant="card"
      />,
    );
    const banner = screen.getByTestId('course-image-banner');
    expect(banner).toBeInTheDocument();
    expect(screen.queryByTestId('course-image-icon')).not.toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'Marcos' });
    expect(img).toHaveAttribute('src', expect.stringContaining('banner.jpg'));
  });

  it('renderiza o icon fallback quando bannerUrl é null', () => {
    render(<CourseImage bannerUrl={null} iconSlug="cross" alt="Marcos" variant="card" />);
    expect(screen.getByTestId('course-image-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('course-image-banner')).not.toBeInTheDocument();
  });

  it('aplica wrapper de hero quando variant=hero', () => {
    const { container } = render(
      <CourseImage bannerUrl={null} iconSlug="cross" alt="Marcos" variant="hero" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/aspect-video/);
    expect(wrapper.className).toMatch(/rounded-2xl/);
  });

  it('aplica wrapper de card quando variant=card', () => {
    const { container } = render(
      <CourseImage bannerUrl={null} iconSlug="cross" alt="Marcos" variant="card" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/aspect-video/);
    expect(wrapper.className).toMatch(/rounded-xl/);
  });

  it('aplica wrapper de card-split: aspect-video em mobile, sm:aspect-auto + sm:h-full em desktop', () => {
    const { container } = render(
      <CourseImage bannerUrl={null} iconSlug="cross" alt="Marcos" variant="card-split" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/aspect-video/);
    expect(wrapper.className).toMatch(/sm:aspect-auto/);
    expect(wrapper.className).toMatch(/sm:h-full/);
    // card-split não arredonda — o pai CourseCard é que clipa via overflow-hidden.
    expect(wrapper.className).not.toMatch(/rounded-/);
  });

  it('passa className extra para o wrapper', () => {
    const { container } = render(
      <CourseImage
        bannerUrl={null}
        iconSlug="cross"
        alt="Marcos"
        variant="hero"
        className="mb-6"
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/mb-6/);
  });
});
