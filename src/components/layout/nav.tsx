import Link from "next/link"
import type { Category, Subcategory } from "@/types/database"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavProps {
  categories: (Category & { subcategories: Subcategory[] })[]
}

export function Nav({ categories }: NavProps) {
  return (
    <nav className="hidden lg:block border-b bg-background">
      <div className="container">
        <div className="flex items-center gap-0">
          {categories.map((cat) => (
            <DropdownMenu key={cat.id}>
              <DropdownMenuTrigger asChild>
                <Link
                  href={`/category/${cat.slug}`}
                  className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors border-r last:border-r-0"
                >
                  {cat.name}
                  {cat.subcategories.length > 0 && <ChevronDown className="h-3 w-3" />}
                </Link>
              </DropdownMenuTrigger>
              {cat.subcategories.length > 0 && (
                <DropdownMenuContent align="start" className="w-56">
                  {cat.subcategories.map((sub) => (
                    <DropdownMenuItem key={sub.id} asChild>
                      <Link href={`/category/${cat.slug}/${sub.slug}`}>{sub.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          ))}
        </div>
      </div>
    </nav>
  )
}
