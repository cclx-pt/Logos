import { describe, it, expect } from 'vitest';

import { tutorialSteps } from './tutorial';
import { extractYoutubeId } from './courses/youtube';

describe('tutorialSteps', () => {
  it('tem pelo menos uma entrada', () => {
    expect(tutorialSteps.length).toBeGreaterThan(0);
  });

  it('slugs são únicos e em kebab-case', () => {
    const slugs = tutorialSteps.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('título e descrição não vazios', () => {
    for (const step of tutorialSteps) {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('youtubeUrl é null ou uma URL YouTube válida', () => {
    for (const step of tutorialSteps) {
      if (step.youtubeUrl !== null) {
        expect(extractYoutubeId(step.youtubeUrl)).not.toBeNull();
      }
    }
  });
});
