import { CurrentUserProvider } from '@/features/auth/context/current-user-context'
import { Header } from '@/components/layout/Header'
import { AppBreadcrumb } from '@/components/layout/AppBreadcrumb'
import { Toaster } from '@/components/ui/sonner'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CurrentUserProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <AppBreadcrumb />
          {children}
        </main>
      </div>
      <Toaster />
    </CurrentUserProvider>
  )
}
