import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetCurrentUser, mockRedirect, mockNotFound } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockRedirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  mockNotFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
  notFound: mockNotFound,
}));

// As helpers nunca são chamadas nos testes deste ficheiro (o auth-gate
// rejeita antes), mas vi.mock evita resolução de módulos pesados.
vi.mock('@/lib/courses/detail', () => ({
  getCourseDetailById: vi.fn(),
  getLessonDetailById: vi.fn(),
  getModuleLessonNavigation: vi.fn(),
}));
vi.mock('@/lib/courses/youtube', () => ({ extractYoutubeId: vi.fn() }));
vi.mock('@/lib/courses/access-actions', () => ({ getLessonPdfSignedUrlAction: vi.fn() }));
vi.mock('@/lib/courses/completion', () => ({
  getCompletedLessonIds: vi.fn(),
  getNextModuleWithLessons: vi.fn(),
  isModuleComplete: vi.fn(),
}));
vi.mock('./pdf-download-button', () => ({ PdfDownloadButton: () => null }));
vi.mock('./mark-complete-button', () => ({ MarkCompleteButton: () => null }));

import LessonPage from './page';

const courseId = '11111111-1111-1111-1111-111111111111';
const lessonId = '22222222-2222-2222-2222-222222222222';

describe('LessonPage — login-gate (V3.1 T7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
    mockNotFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('redirige anónimos para a página do curso', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(LessonPage({ params: Promise.resolve({ courseId, lessonId }) })).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(mockRedirect).toHaveBeenCalledWith(`/conteudos/${courseId}`);
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it('chama notFound() quando o courseId não é UUID — UUID check vem antes do auth check', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(
      LessonPage({ params: Promise.resolve({ courseId: 'not-a-uuid', lessonId }) }),
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(mockNotFound).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
