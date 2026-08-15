import {
  Atom,
  Bot,
  Braces,
  Brain,
  Briefcase,
  Cloud,
  Code,
  Container,
  Cpu,
  Database,
  DatabaseZap,
  FileCode2,
  Gamepad2,
  GitBranch,
  Globe,
  Hash,
  Hexagon,
  Lock,
  Network,
  Palette,
  Plug,
  Server,
  Shield,
  Smartphone,
  Terminal,
  Triangle,
  type LucideIcon,
} from 'lucide-react';

const TOPIC_ICONS: Record<string, LucideIcon> = {
  Atom,
  Bot,
  Braces,
  Brain,
  Briefcase,
  Cloud,
  Code,
  Container,
  Cpu,
  Database,
  DatabaseZap,
  FileCode2,
  Gamepad2,
  GitBranch,
  Globe,
  Hexagon,
  Lock,
  Network,
  Palette,
  Plug,
  Server,
  Shield,
  Smartphone,
  Terminal,
  Triangle,
};

export function TopicIcon({
  name,
  className,
  fallback,
}: {
  name?: string | null;
  className?: string;
  fallback?: LucideIcon;
}) {
  const Icon = (name ? TOPIC_ICONS[name] : null) ?? fallback ?? Hash;
  return <Icon className={className} aria-hidden />;
}
