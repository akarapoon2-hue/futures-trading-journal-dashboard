import { Bell, ChevronDown, Search } from "lucide-react";
import tradexaLogo from "../../assets/logo/logo.svg";

type DashboardHeaderProps = {
  userName?: string;
  userRole?: string;
};

export default function DashboardHeader({
  userName = "Akkaraphoun",
  userRole = "Professional Trader",
}: DashboardHeaderProps) {
  const userInitial = userName.trim().charAt(0).toUpperCase() || "T";

  return (
    <header className="h-20 border-b border-zinc-800 bg-[#090909] px-4 sm:px-6">
      <div className="flex h-full items-center justify-between gap-4">
        {/* Left: Logo and Search */}
        <div className="flex min-w-0 items-center gap-6 lg:gap-8">
          <img
            src={tradexaLogo}
            alt="TRADEXA Professional Trading Operating System"
            className="h-10 w-auto shrink-0 sm:h-11"
          />

          <div className="relative hidden lg:block">
            <Search
              size={18}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />

            <input
              type="search"
              placeholder="Search..."
              aria-label="Search dashboard"
              className="
                w-72 rounded-xl border border-zinc-700 bg-[#111111]
                py-2 pl-10 pr-4 text-sm text-white outline-none
                transition-colors placeholder:text-zinc-500
                hover:border-zinc-600
                focus:border-[#E5C158]
                focus:ring-2 focus:ring-[#E5C158]/20
              "
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            aria-label="View notifications"
            className="
              relative rounded-xl border border-transparent bg-[#111111] p-3
              transition-colors hover:border-zinc-700 hover:bg-zinc-800
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#E5C158]/60
            "
          >
            <Bell
              size={20}
              aria-hidden="true"
              className="text-zinc-300"
            />

            <span
              aria-hidden="true"
              className="
                absolute right-2 top-2 h-2.5 w-2.5 rounded-full
                bg-[#B3261E] ring-2 ring-[#090909]
              "
            />
          </button>

          <button
            type="button"
            aria-label="Open profile menu"
            className="
              flex items-center gap-3 rounded-xl border border-transparent
              bg-[#111111] px-2 py-2 transition-colors
              hover:border-zinc-700 hover:bg-zinc-800
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#E5C158]/60
              sm:px-4
            "
          >
            <div
              aria-hidden="true"
              className="
                flex h-10 w-10 items-center justify-center rounded-full
                bg-[#E5C158] font-bold text-black
              "
            >
              {userInitial}
            </div>

            <div className="hidden text-left md:block">
              <p className="max-w-40 truncate text-sm font-semibold text-white">
                {userName}
              </p>

              <p className="max-w-40 truncate text-xs text-zinc-400">
                {userRole}
              </p>
            </div>

            <ChevronDown
              size={18}
              aria-hidden="true"
              className="hidden text-zinc-400 sm:block"
            />
          </button>
        </div>
      </div>
    </header>
  );
}