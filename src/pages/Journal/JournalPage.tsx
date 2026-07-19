import type { ReactNode } from 'react';

interface JournalPageProps {
  children: ReactNode;
}

export default function JournalPage({
  children,
}: JournalPageProps) {
  return (
    <div className="space-y-8">
      {children}
    </div>
  );
}