import { PostEditorProvider } from "@/components/admin/editor/post-editor-provider"
import { PostEditorLayout } from "@/components/admin/editor/post-editor-layout"

export default function NewPostPage() {
  return (
    <PostEditorProvider>
      <PostEditorLayout />
    </PostEditorProvider>
  )
}
