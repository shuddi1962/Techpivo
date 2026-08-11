import Link from "next/link"

export function CategoriesWidget({ categories }: { categories: any[] }) {
  if (!categories.length) return null
  return (
    <div className="sidebar-card">
      <div className="sidebar-card-header">
        <span className="sidebar-card-icon">◈</span>
        <span className="sidebar-card-title">Categories</span>
      </div>
      <div className="cat-loop-wrap">
        <ul className="cat-list cat-loop">
          {[...categories, ...categories, ...categories].slice(0, 30).map((cat, i) => (
            <li key={`${cat.id}-${i}`} className="cat-row">
              <Link href={`/category/${cat.slug}`} className="cat-row-left">
                <span className="cat-dot" style={{ background: cat.color || "hsl(var(--accent))" }} />
                <span className="cat-row-name">{cat.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
