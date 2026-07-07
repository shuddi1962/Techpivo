import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tech Events — TechPivo Community",
  description: "Conferences, meetups, hackathons, workshops and product launches — all in one place.",
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
