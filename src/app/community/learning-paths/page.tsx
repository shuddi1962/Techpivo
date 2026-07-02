import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Users, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Learning Paths — TechPivo Community',
  description: 'Structured learning journeys to master technology skills.',
};

const LEARNING_PATHS = [
  {
    id: 'python',
    title: 'Learn Python',
    description: 'From zero to productive Python developer',
    icon: '🐍',
    color: 'from-blue-500 to-yellow-500',
    difficulty: 'Beginner',
    duration: '4 weeks',
    lessons: 12,
    students: 1250,
    modules: [
      { title: 'Variables & Types', completed: false },
      { title: 'Control Flow', completed: false },
      { title: 'Functions', completed: false },
      { title: 'Lists & Dicts', completed: false },
      { title: 'File I/O', completed: false },
      { title: 'Error Handling', completed: false },
      { title: 'Classes & OOP', completed: false },
      { title: 'Modules & Packages', completed: false },
      { title: 'Testing', completed: false },
      { title: 'Virtual Environments', completed: false },
      { title: 'Web Scraping', completed: false },
      { title: 'Final Project', completed: false },
    ],
  },
  {
    id: 'web-dev',
    title: 'Web Development',
    description: 'HTML, CSS, JavaScript and modern frameworks',
    icon: '🌐',
    color: 'from-orange-500 to-pink-500',
    difficulty: 'Beginner',
    duration: '6 weeks',
    lessons: 20,
    students: 980,
    modules: [
      { title: 'HTML Basics', completed: false },
      { title: 'CSS Fundamentals', completed: false },
      { title: 'Responsive Design', completed: false },
      { title: 'JavaScript Basics', completed: false },
      { title: 'DOM Manipulation', completed: false },
      { title: 'Fetch API', completed: false },
      { title: 'React Basics', completed: false },
      { title: 'Components & State', completed: false },
      { title: 'Next.js Introduction', completed: false },
      { title: 'Final Project', completed: false },
    ],
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity Basics',
    description: 'Protect systems and networks from threats',
    icon: '🛡',
    color: 'from-red-500 to-orange-500',
    difficulty: 'Intermediate',
    duration: '5 weeks',
    lessons: 15,
    students: 750,
    modules: [
      { title: 'Security Fundamentals', completed: false },
      { title: 'Network Security', completed: false },
      { title: 'Cryptography', completed: false },
      { title: 'Web Security', completed: false },
      { title: 'Final Project', completed: false },
    ],
  },
  {
    id: 'ai-intro',
    title: 'Introduction to AI',
    description: 'Understanding artificial intelligence and machine learning',
    icon: '🤖',
    color: 'from-purple-500 to-blue-500',
    difficulty: 'Beginner',
    duration: '3 weeks',
    lessons: 10,
    students: 1500,
    modules: [
      { title: 'What is AI?', completed: false },
      { title: 'Machine Learning Basics', completed: false },
      { title: 'Neural Networks', completed: false },
      { title: 'Working with APIs', completed: false },
      { title: 'Final Project', completed: false },
    ],
  },
  {
    id: 'linux',
    title: 'Linux Mastery',
    description: 'Command line, administration, and server management',
    icon: '🐧',
    color: 'from-yellow-500 to-green-500',
    difficulty: 'Intermediate',
    duration: '4 weeks',
    lessons: 14,
    students: 620,
    modules: [
      { title: 'Linux Basics', completed: false },
      { title: 'File System', completed: false },
      { title: 'Shell Scripting', completed: false },
      { title: 'User Management', completed: false },
      { title: 'Services & Systemd', completed: false },
      { title: 'Networking', completed: false },
      { title: 'Final Project', completed: false },
    ],
  },
  {
    id: 'javascript',
    title: 'JavaScript Deep Dive',
    description: 'Master modern JavaScript from fundamentals to advanced patterns',
    icon: '⚡',
    color: 'from-yellow-400 to-yellow-600',
    difficulty: 'Intermediate',
    duration: '5 weeks',
    lessons: 18,
    students: 890,
    modules: [
      { title: 'Variables & Scope', completed: false },
      { title: 'Functions & Closures', completed: false },
      { title: 'Arrays & Methods', completed: false },
      { title: 'Objects & Prototypes', completed: false },
      { title: 'Async/Await', completed: false },
      { title: 'DOM & Events', completed: false },
      { title: 'Final Project', completed: false },
    ],
  },
];

export default function LearningPathsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Community
        </Link>

        <div className="text-center mb-8">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-blue-500" />
          <h1 className="text-3xl font-bold">Learning Paths</h1>
          <p className="text-muted-foreground mt-1">Structured courses to master technology skills</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LEARNING_PATHS.map((path) => (
            <Card key={path.id} className="hover:shadow-lg transition-all group cursor-pointer overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${path.color}`} />
              <CardContent className="p-6">
                <div className="text-4xl mb-3">{path.icon}</div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{path.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{path.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">{path.difficulty}</Badge>
                  <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> {path.duration}</Badge>
                  <Badge variant="outline">{path.lessons} lessons</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Users className="h-4 w-4" />
                  <span>{path.students.toLocaleString()} students</span>
                </div>
                <div className="space-y-1.5">
                  {path.modules.slice(0, 4).map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{m.title}</span>
                    </div>
                  ))}
                  {path.modules.length > 4 && (
                    <div className="text-sm text-muted-foreground">
                      +{path.modules.length - 4} more modules
                    </div>
                  )}
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Start Learning <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
