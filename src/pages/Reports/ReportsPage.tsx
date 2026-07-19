import type { ReactNode } from 'react';

interface ReportsPageProps {
  children: ReactNode;
}

export default function ReportsPage({
  children,
}: ReportsPageProps) {
  return <div className="space-y-8">{children}</div>;
}