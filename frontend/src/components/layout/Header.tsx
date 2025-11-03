import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils';

interface HeaderProps {
  userName?: string;
  userEmail?: string;
}

export function Header({ userName, userEmail }: HeaderProps) {
  const { instance } = useMsal();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Clear all session data
      sessionStorage.clear();
      
      // Try Azure AD logout (may fail if not logged in via Azure)
      try {
        await instance.logoutPopup();
      } catch (azureError) {
        // Not logged in via Azure, that's fine
        console.log('Not logged in via Azure AD');
      }
      
      // Navigate to login
      navigate('/login', { replace: true });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear and navigate even if there's an error
      sessionStorage.clear();
      navigate('/login', { replace: true });
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">TAPS Transcript System</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline-block">{userName || 'User'}</span>
              </button>
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={cn(
                  'min-w-[200px] rounded-md border border-border bg-card p-1 shadow-lg',
                  'data-[state=open]:animate-in data-[state=closed]:animate-out',
                  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
                )}
                sideOffset={5}
              >
                <div className="px-2 py-1.5 text-sm border-b border-border">
                  <div className="font-medium">{userName || 'User'}</div>
                  <div className="text-xs text-muted-foreground">{userEmail}</div>
                </div>
                
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent focus:bg-accent outline-none"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}

