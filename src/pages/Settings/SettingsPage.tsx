import type { ReactNode } from 'react';

interface SettingsPageProps {
  children: ReactNode;
}

export default function SettingsPage({
  children,
}: SettingsPageProps) {
  return <div className="space-y-8">{children}</div>;
}