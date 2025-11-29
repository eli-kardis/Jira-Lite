'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../actions/notification-actions'
import { toast } from 'sonner'
import { Loader2, Bell, Mail, Smartphone } from 'lucide-react'

interface Settings {
  email_enabled: boolean
  push_enabled: boolean
  issue_assigned: boolean
  issue_mentioned: boolean
  issue_status_changed: boolean
  issue_comment: boolean
  issue_due_soon: boolean
  team_invited: boolean
}

export function NotificationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    email_enabled: true,
    push_enabled: true,
    issue_assigned: true,
    issue_mentioned: true,
    issue_status_changed: true,
    issue_comment: true,
    issue_due_soon: true,
    team_invited: true,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const data = await getNotificationSettings()
    if (data) {
      setSettings({
        email_enabled: data.email_enabled,
        push_enabled: data.push_enabled,
        issue_assigned: data.issue_assigned,
        issue_mentioned: data.issue_mentioned,
        issue_status_changed: data.issue_status_changed,
        issue_comment: data.issue_comment,
        issue_due_soon: data.issue_due_soon,
        team_invited: data.team_invited,
      })
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const formData = new FormData()

    Object.entries(settings).forEach(([key, value]) => {
      formData.set(key, String(value))
    })

    const result = await updateNotificationSettings(formData)

    if (result.success) {
      toast.success('알림 설정이 저장되었습니다')
    } else {
      toast.error(result.error || '설정 저장에 실패했습니다')
    }
    setSaving(false)
  }

  function updateSetting(key: keyof Settings, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          알림 설정
        </CardTitle>
        <CardDescription>
          알림 수신 방법과 알림 유형을 설정하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 알림 채널 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">알림 채널</h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>이메일 알림</Label>
                <p className="text-xs text-muted-foreground">
                  이메일로 알림을 받습니다
                </p>
              </div>
            </div>
            <Switch
              checked={settings.email_enabled}
              onCheckedChange={(checked) => updateSetting('email_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>푸시 알림</Label>
                <p className="text-xs text-muted-foreground">
                  브라우저 푸시 알림을 받습니다
                </p>
              </div>
            </div>
            <Switch
              checked={settings.push_enabled}
              onCheckedChange={(checked) => updateSetting('push_enabled', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* 알림 유형 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">알림 유형</h4>

          <div className="space-y-3">
            {[
              { key: 'issue_assigned', label: '이슈 할당', desc: '새 이슈가 나에게 할당되었을 때' },
              { key: 'issue_mentioned', label: '멘션', desc: '이슈나 댓글에서 멘션되었을 때' },
              { key: 'issue_status_changed', label: '상태 변경', desc: '내 이슈의 상태가 변경되었을 때' },
              { key: 'issue_comment', label: '댓글', desc: '내 이슈에 댓글이 달렸을 때' },
              { key: 'issue_due_soon', label: '마감 임박', desc: '마감일이 가까워졌을 때' },
              { key: 'team_invited', label: '팀 초대', desc: '팀에 초대되었을 때' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <Label>{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={settings[item.key as keyof Settings]}
                  onCheckedChange={(checked) => updateSetting(item.key as keyof Settings, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
