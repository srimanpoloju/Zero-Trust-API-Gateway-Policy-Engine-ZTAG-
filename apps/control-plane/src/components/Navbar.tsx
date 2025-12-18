// apps/control-plane/src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', href: '/' },
    { name: 'Policies', href: '/policies' },
    { name: 'Audit Logs', href: '/audits' },
    { name: 'Simulator', href: '/simulator' },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-2xl font-bold">
          ZTAG Control Plane
        </Link>
        {isAuthenticated && (
          <ul className="flex space-x-4">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`text-white hover:text-gray-300 ${
                    pathname === item.href ? 'border-b-2 border-white' : ''
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="text-white flex items-center">
          {isAuthenticated ? (
            <>
              <span className="mr-4">Welcome, {user?.email}</span>
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
