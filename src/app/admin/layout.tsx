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
      <div className="flex min-h-screen">
        <SessionTimeout />
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader />
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
