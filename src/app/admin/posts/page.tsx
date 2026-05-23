import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Plus } from "lucide-react"

export default async function AdminPostsPage() {
  const supabase = createClient()
  const { data: posts } = await supabase
    .from("posts")
    .select("*, category:categories(name)")
    .order("created_at", { ascending: false })
    .limit(50)

  const statusColors: Record<string, string> = {
    draft: "secondary",
    published: "default",
    scheduled: "indigo",
    archived: "outline",
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Posts</h1>
        <Link href="/admin/posts/new">
          <Button><Plus className="h-4 w-4 mr-2" />New Post</Button>
        </Link>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Title</th>
              <th className="text-left p-3 text-sm font-medium">Category</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
              <th className="text-left p-3 text-sm font-medium">Views</th>
              <th className="text-left p-3 text-sm font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {posts?.map((post: any) => (
              <tr key={post.id} className="border-t hover:bg-muted/50">
                <td className="p-3">
                  <Link href={`/admin/posts/${post.id}/edit`} className="font-medium hover:text-brand-indigo line-clamp-1">
                    {post.title}
                  </Link>
                </td>
                <td className="p-3 text-sm text-muted-foreground">{post.category?.name}</td>
                <td className="p-3">
                  <Badge variant={statusColors[post.status] as any}>{post.status}</Badge>
                </td>
                <td className="p-3 text-sm">{post.views}</td>
                <td className="p-3 text-sm text-muted-foreground">
                  {post.published_at ? formatDate(post.published_at) : formatDate(post.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
