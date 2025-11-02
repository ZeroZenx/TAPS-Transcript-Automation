import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../hooks/useAuth';

export function Layout() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={user?.role || 'STUDENT'} />
      <div className="flex-1 flex flex-col ml-64">
        <Header userName={user?.name} userEmail={user?.email} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

