import type { ReactNode } from 'react';

interface AppShellProps {
  sidebar: ReactNode;
  header?: ReactNode;
  children: ReactNode;
}

export default function AppShell({
  sidebar,
  header,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="flex min-h-screen">
        {sidebar}

        <div className="min-w-0 flex-1">
          {header}

          <main className="min-h-screen">{children}</main>
        </div>
      </div>
    </div>
  );
}