import type { ReactNode } from 'react';

interface AppLayoutProps {
  sidebar: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

export default function AppLayout({
  sidebar,
  header,
  footer,
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="flex min-h-screen">
        {sidebar}

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="pointer-events-none absolute right-0 top-0 hidden p-8 md:p-12 lg:block">
            <div
              className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30"
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              Database / Sync / Live
            </div>
          </div>

          {header}

          <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>

          {footer}
        </div>
      </div>
    </div>
  );
}