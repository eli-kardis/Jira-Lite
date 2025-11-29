'use server'

import { createClient } from '@/lib/supabase/server'
import { signUpSchema, signInSchema, resetPasswordSchema, newPasswordSchema, updatePasswordSchema, updateProfileSchema } from '@/lib/utils/validation'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionResult = {
  success: boolean
  error?: string
}

// FR-001: 회원가입
export async function signUp(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
  }

  const result = signUpSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { email, password, name } = result.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { success: false, error: '이미 사용 중인 이메일입니다' }
    }
    return { success: false, error: error.message }
  }

  // 세션이 바로 반환되면 자동 로그인 불필요 (이메일 확인 비활성화 시)
  if (data.session) {
    redirect('/dashboard')
  }

  // 세션이 없으면 수동 로그인 시도
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (signInError) {
    console.error('Auto login failed:', signInError)
    redirect('/login')
  }

  redirect('/dashboard')
}

// FR-002: 로그인
export async function signIn(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const result = signInSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { email, password } = result.data

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다' }
  }

  redirect('/dashboard')
}

// FR-002: 로그아웃
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// FR-003: 비밀번호 찾기 (이메일 발송)
export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
  }

  const result = resetPasswordSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { email } = result.data

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
  })

  if (error) {
    return { success: false, error: '이메일 발송에 실패했습니다. 다시 시도해주세요.' }
  }

  return { success: true }
}

// FR-003: 새 비밀번호 설정
export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const rawData = {
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const result = newPasswordSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { password } = result.data

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { success: false, error: '비밀번호 변경에 실패했습니다. 다시 시도해주세요.' }
  }

  redirect('/login')
}

// FR-004: Google OAuth
export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    console.error('Google OAuth error:', error)
    return
  }

  if (data.url) {
    redirect(data.url)
  }
}

// FR-005: 프로필 수정
export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  const rawData = {
    name: formData.get('name') as string,
  }

  const result = updateProfileSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { name } = result.data

  const { error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', user.id)

  if (error) {
    return { success: false, error: '프로필 수정에 실패했습니다' }
  }

  revalidatePath('/profile')
  return { success: true }
}

// FR-006: 비밀번호 변경
export async function changePassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // OAuth 사용자는 비밀번호 변경 불가
  const { data: profile } = await supabase
    .from('profiles')
    .select('auth_provider')
    .eq('id', user.id)
    .single()

  if (profile?.auth_provider === 'google') {
    return { success: false, error: 'Google 계정은 비밀번호를 변경할 수 없습니다' }
  }

  const rawData = {
    currentPassword: formData.get('currentPassword') as string,
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const result = updatePasswordSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { currentPassword, newPassword } = result.data

  // 현재 비밀번호 확인
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (signInError) {
    return { success: false, error: '현재 비밀번호가 올바르지 않습니다' }
  }

  // 새 비밀번호로 변경
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    return { success: false, error: '비밀번호 변경에 실패했습니다' }
  }

  return { success: true }
}

// FR-007: 계정 삭제
export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 소유한 팀이 있는지 확인
  const { data: ownedTeams, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .limit(1)

  if (teamError) {
    return { success: false, error: '계정 삭제에 실패했습니다' }
  }

  if (ownedTeams && ownedTeams.length > 0) {
    return {
      success: false,
      error: '소유한 팀이 있어 계정을 삭제할 수 없습니다. 팀을 먼저 삭제하거나 소유권을 이전해주세요.',
    }
  }

  // OAuth가 아닌 사용자는 비밀번호 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('auth_provider')
    .eq('id', user.id)
    .single()

  if (profile?.auth_provider === 'email') {
    const password = formData.get('password') as string
    if (!password) {
      return { success: false, error: '비밀번호를 입력해주세요' }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (signInError) {
      return { success: false, error: '비밀번호가 올바르지 않습니다' }
    }
  }

  // Soft Delete
  const { error: deleteError } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', user.id)

  if (deleteError) {
    return { success: false, error: '계정 삭제에 실패했습니다' }
  }

  await supabase.auth.signOut()
  redirect('/login')
}

// 현재 사용자 정보 가져오기
export async function getCurrentUser() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .is('deleted_at', null)
    .single()

  return profile
}
