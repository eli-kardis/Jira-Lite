export const queryKeys = {
  issues: {
    all: ['issues'] as const,
    byProject: (projectId: string) => ['issues', 'project', projectId] as const,
    detail: (issueId: string) => ['issues', 'detail', issueId] as const,
    comments: (issueId: string) => ['issues', issueId, 'comments'] as const,
    history: (issueId: string) => ['issues', issueId, 'history'] as const,
  },
  projects: {
    all: ['projects'] as const,
    detail: (projectId: string) => ['projects', projectId] as const,
  },
} as const
