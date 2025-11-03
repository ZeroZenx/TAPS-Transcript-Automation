import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Inbox, 
  CheckSquare, 
  Library,
  DollarSign,
  GraduationCap,
  UserCheck,
  Settings,
  Users,
  Upload,
  FileSearch,
  BarChart3
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['STUDENT', 'LIBRARY', 'BURSAR', 'ACADEMIC', 'VERIFIER', 'PROCESSOR', 'ADMIN'] },
  { title: 'New Request', href: '/requests/new', icon: FileText, roles: ['STUDENT', 'VERIFIER', 'PROCESSOR', 'ADMIN'] },
  { title: 'My Requests', href: '/requests/my', icon: Inbox, roles: ['STUDENT', 'VERIFIER', 'PROCESSOR', 'ADMIN'] },
  { title: 'TS Verifier Queue', href: '/queue/verifier', icon: UserCheck, roles: ['VERIFIER', 'ADMIN'] },
  { title: 'Library Queue', href: '/queue/library', icon: Library, roles: ['LIBRARY', 'ADMIN'] },
  { title: 'Bursar Queue', href: '/queue/bursar', icon: DollarSign, roles: ['BURSAR', 'ADMIN'] },
  { title: 'Academic Queue', href: '/queue/academic', icon: GraduationCap, roles: ['ACADEMIC', 'ADMIN'] },
  { title: 'Processor', href: '/processor', icon: CheckSquare, roles: ['PROCESSOR', 'ADMIN'] },
  { title: 'User Management', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
  { title: 'Import Data', href: '/admin/import', icon: Upload, roles: ['ADMIN'] },
  { title: 'Audit Logs', href: '/admin/audit', icon: FileSearch, roles: ['ADMIN'] },
  { title: 'Reports', href: '/admin/reports', icon: BarChart3, roles: ['ADMIN'] },
  { title: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
];

interface SidebarProps {
  userRole: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation();
  
  // Debug: Log role to help troubleshoot
  console.log('Sidebar - Current user role:', userRole);
  
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(userRole)
  );
  
  console.log('Sidebar - Filtered nav items:', filteredNavItems.map(item => item.title));

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">TAPS</h1>
        <p className="text-xs text-muted-foreground mt-1">Transcript Automation and Processing Service</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
                         (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

