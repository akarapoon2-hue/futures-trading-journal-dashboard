import type { ReactNode } from 'react';

interface AnalyticsPageProps {
  children: ReactNode;
}

export default function AnalyticsPage({
  children,
}: AnalyticsPageProps) {
  return <div className="space-y-8">{children}</div>;
}