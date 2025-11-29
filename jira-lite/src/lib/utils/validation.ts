import { z } from 'zod'

// === 인증 관련 스키마 ===
export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다')
    .max(255, '이메일은 255자 이하여야 합니다'),
  password: z
    .string()
    .min(6, '비밀번호는 6자 이상이어야 합니다')
    .max(100, '비밀번호는 100자 이하여야 합니다'),
  name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(50, '이름은 50자 이하여야 합니다'),
})

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
})

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
    newPassword: z
      .string()
      .min(6, '새 비밀번호는 6자 이상이어야 합니다')
      .max(100, '새 비밀번호는 100자 이하여야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '새 비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, '비밀번호는 6자 이상이어야 합니다')
      .max(100, '비밀번호는 100자 이하여야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  })

// === 프로필 관련 스키마 ===
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(50, '이름은 50자 이하여야 합니다'),
})

// === 팀 관련 스키마 ===
export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, '팀 이름을 입력해주세요')
    .max(50, '팀 이름은 50자 이하여야 합니다'),
})

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(1, '팀 이름을 입력해주세요')
    .max(50, '팀 이름은 50자 이하여야 합니다'),
})

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
})

export const changeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER'], {
    errorMap: () => ({ message: '올바른 역할을 선택해주세요' }),
  }),
})

// === 프로젝트 관련 스키마 ===
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, '프로젝트 이름을 입력해주세요')
    .max(100, '프로젝트 이름은 100자 이하여야 합니다'),
  description: z
    .string()
    .max(2000, '프로젝트 설명은 2000자 이하여야 합니다')
    .optional(),
})

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, '프로젝트 이름을 입력해주세요')
    .max(100, '프로젝트 이름은 100자 이하여야 합니다')
    .optional(),
  description: z
    .string()
    .max(2000, '프로젝트 설명은 2000자 이하여야 합니다')
    .nullable()
    .optional(),
})

// === 이슈 관련 스키마 ===
export const createIssueSchema = z.object({
  title: z
    .string()
    .min(1, '이슈 제목을 입력해주세요')
    .max(200, '이슈 제목은 200자 이하여야 합니다'),
  description: z
    .string()
    .max(5000, '이슈 설명은 5000자 이하여야 합니다')
    .optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  label_ids: z
    .array(z.string().uuid())
    .max(5, '라벨은 최대 5개까지 선택할 수 있습니다')
    .optional(),
})

export const updateIssueSchema = z.object({
  title: z
    .string()
    .min(1, '이슈 제목을 입력해주세요')
    .max(200, '이슈 제목은 200자 이하여야 합니다')
    .optional(),
  description: z
    .string()
    .max(5000, '이슈 설명은 5000자 이하여야 합니다')
    .nullable()
    .optional(),
  status_id: z.string().uuid().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  label_ids: z
    .array(z.string().uuid())
    .max(5, '라벨은 최대 5개까지 선택할 수 있습니다')
    .optional(),
})

// === 서브태스크 관련 스키마 ===
export const createSubtaskSchema = z.object({
  title: z
    .string()
    .min(1, '서브태스크 제목을 입력해주세요')
    .max(200, '서브태스크 제목은 200자 이하여야 합니다'),
})

export const updateSubtaskSchema = z.object({
  title: z
    .string()
    .min(1, '서브태스크 제목을 입력해주세요')
    .max(200, '서브태스크 제목은 200자 이하여야 합니다')
    .optional(),
  is_completed: z.boolean().optional(),
})

// === 댓글 관련 스키마 ===
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, '댓글 내용을 입력해주세요')
    .max(1000, '댓글은 1000자 이하여야 합니다'),
})

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, '댓글 내용을 입력해주세요')
    .max(1000, '댓글은 1000자 이하여야 합니다'),
})

// === 라벨 관련 스키마 ===
export const createLabelSchema = z.object({
  name: z
    .string()
    .min(1, '라벨 이름을 입력해주세요')
    .max(30, '라벨 이름은 30자 이하여야 합니다'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '올바른 HEX 색상 형식이 아닙니다'),
})

export const updateLabelSchema = z.object({
  name: z
    .string()
    .min(1, '라벨 이름을 입력해주세요')
    .max(30, '라벨 이름은 30자 이하여야 합니다')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '올바른 HEX 색상 형식이 아닙니다')
    .optional(),
})

// === 상태 관련 스키마 ===
export const createStatusSchema = z.object({
  name: z
    .string()
    .min(1, '상태 이름을 입력해주세요')
    .max(30, '상태 이름은 30자 이하여야 합니다'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '올바른 HEX 색상 형식이 아닙니다')
    .optional(),
  wip_limit: z
    .number()
    .int()
    .min(1, 'WIP 제한은 1 이상이어야 합니다')
    .max(50, 'WIP 제한은 50 이하여야 합니다')
    .nullable()
    .optional(),
})

export const updateStatusSchema = z.object({
  name: z
    .string()
    .min(1, '상태 이름을 입력해주세요')
    .max(30, '상태 이름은 30자 이하여야 합니다')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '올바른 HEX 색상 형식이 아닙니다')
    .nullable()
    .optional(),
  wip_limit: z
    .number()
    .int()
    .min(1, 'WIP 제한은 1 이상이어야 합니다')
    .max(50, 'WIP 제한은 50 이하여야 합니다')
    .nullable()
    .optional(),
})

// 타입 추출
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type NewPasswordInput = z.infer<typeof newPasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>
export type CreateLabelInput = z.infer<typeof createLabelSchema>
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>
export type CreateStatusInput = z.infer<typeof createStatusSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
