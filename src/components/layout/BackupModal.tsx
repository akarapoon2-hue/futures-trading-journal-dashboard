import type { ReactNode } from 'react';

interface BackupModalProps {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}

export default function BackupModal({
  open,
  onClose,
  children,
}: BackupModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-[#111] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#E5C158]">
            Backup Manager
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}