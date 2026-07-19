import type { ReactNode } from 'react';

interface CalendarPageProps {
  children: ReactNode;
}

export default function CalendarPage({
  children,
}: CalendarPageProps) {
  return <div className="space-y-8">{children}</div>;
}