import type { ReactNode } from 'react';

interface DashboardPageProps {
  children: ReactNode;
}

export default function DashboardPage({
  children,
}: DashboardPageProps) {
  return <>{children}</>;
}