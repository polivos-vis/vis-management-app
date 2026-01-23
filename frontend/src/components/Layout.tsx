import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LayoutDashboard, LogOut, User, Briefcase } from 'lucide-react';
import { NotificationPanel } from './NotificationPanel';

export const Layout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const appVersion = import.meta.env.VITE_APP_VERSION || 'dev';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <LayoutDashboard className="w-8 h-8 text-primary-700" />
                <span className="text-xl font-bold tracking-[0.22em] text-gray-900">INSAIDEM</span>
              </Link>
              
              <nav className="hidden md:flex space-x-4">
                <Link
                  to="/workspaces"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/workspaces')
                      ? 'bg-primary-50 text-primary-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Workspaces</span>
                </Link>
                <Link
                  to="/my-tasks"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/my-tasks')
                      ? 'bg-primary-50 text-primary-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>My Tasks</span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationPanel />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-secondary-900 font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user?.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:block">Logout</span>
              </button>
            </div>
          </div>
          <div className="md:hidden py-3 border-t border-gray-100">
            <nav className="flex items-center gap-2">
              <Link
                to="/workspaces"
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/workspaces')
                    ? 'bg-primary-50 text-primary-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Workspaces</span>
              </Link>
              <Link
                to="/my-tasks"
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/my-tasks')
                    ? 'bg-primary-50 text-primary-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <User className="w-4 h-4" />
                <span>My Tasks</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="text-xs text-gray-400 text-right">v{appVersion}</div>
      </div>
    </div>
  );
};
