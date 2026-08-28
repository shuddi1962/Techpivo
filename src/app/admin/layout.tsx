import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { SessionTimeout } from "@/components/admin/session-timeout"
import { SidebarProvider } from "@/components/admin/sidebar-context"
import { createClient } from "@/lib/supabase/server"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user = null
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Not authenticated
  }

  if (!user) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen md:min-h-dvh">
        <SessionTimeout />
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <AdminHeader />
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
