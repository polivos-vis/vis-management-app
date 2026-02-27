import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const DesktopAuthBridgePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      navigate('/desktop', { replace: true });
      return;
    }

    navigate('/login?client=desktop', { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-6">
      <p className="text-gray-700 text-sm">Finishing desktop sign-in...</p>
    </div>
  );
};
