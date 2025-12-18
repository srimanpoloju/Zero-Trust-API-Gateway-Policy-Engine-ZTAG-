import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "../components/Navbar";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZTAG Control Plane",
  description: "Manage policies and view audits for ZTAG",
};

// This component will handle redirection based on auth status
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-4">{children}</main>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AuthWrapper>{children}</AuthWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
