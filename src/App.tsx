// =============================================
// src/App.tsx
// =============================================

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Login from './components/auth/Login';
import {
  RefreshCw,
  TrendingUp,
  Download,
  FileText,
  Settings,
  UploadCloud,
  Check,
  X,
  LogOut,
  Database,
  Wifi,
  Clock,
  User,
  Coins,
  Activity
} from 'lucide-react';
import DashboardSettings from './components/DashboardSettings';
import FirstAccountSetup from './components/accounts/FirstAccountSetup';

// ✅ Import Page Components
import DashboardPage from './pages/Dashboard/DashboardPage';
import JournalPage from './pages/Journal/JournalPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import CalendarPage from './pages/Calendar/CalendarPage';
import ReportsPage from './pages/Reports/ReportsPage';
import SettingsPage from './pages/Settings/SettingsPage';

// ✅ Import JournalContent
import JournalContent from './features/journal/JournalContent';

// ✅ Import Logo & Sidebar
import tradexaLogo from "./assets/logo/logo.svg";
import TradexaSidebar from "./components/layout/TradexaSidebar";

// ✅ Import Custom Hook (named export)
import { useTradingDashboard } from './hooks/useTradingDashboard';

const ENABLE_IMPORT = false;

export default function App() {
  // =============================================
  // 1. Auth State
  // =============================================
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // =============================================
  // 2. Trading Dashboard Logic
  // =============================================
  const {
    data,
    kpis,
    charts,
    accountConfig,
    accountInfo,
    activeAccountId,
    accountLoading,
    selectedTemplateId,
    showConfigPanel,
    exportSuccess,
    importString,
    importError,
    showAccountSettings,

    // Actions
    loadTradesFromSupabase,
    handleTemplateSwitch,
    handleCustomDataLoaded,
    handleResetToCurrentTemplate,
    handleExportDashboard,
    handleCopyConfigCode,
    handleImportConfig,
    setShowConfigPanel,
    setImportString,
    setImportError,
    setShowAccountSettings,
    setAccountConfig,
    setKPIs,
    setCharts,
  } = useTradingDashboard(session);

  // ✅ state สำหรับ activePage
  const [activePage, setActivePage] = useState<string>('journal');

  // =============================================
  // 3. Loading State
  // =============================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#E5C158] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm uppercase tracking-widest text-slate-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  // =============================================
  // 4. Login Screen
  // =============================================
  if (!session) {
    return <Login />;
  }

  // =============================================
  // 5. No Account → Show Setup
  // =============================================
  if (!accountLoading && !activeAccountId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-4 flex items-center justify-center">
        <FirstAccountSetup
          userId={session.user.id}
          onCreated={loadTradesFromSupabase}
        />
      </div>
    );
  }

  // =============================================
  // 6. Dashboard
  // =============================================
  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="flex min-h-screen">
        
        <TradexaSidebar activePage={activePage} />

        <div className="min-w-0 flex-1 flex flex-col relative">
          
          <div className="absolute top-0 right-0 p-8 md:p-12 pointer-events-none hidden lg:block">
            <div className="text-[10px] tracking-[0.4em] uppercase opacity-30 font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              Database / Sync / Live
            </div>
          </div>

          {/* Header */}
          <header className="bg-[#0A0A0A] border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex items-center">
                <img src={tradexaLogo} alt="TRADEXA" className="h-16 w-auto" />
              </div>

              {accountLoading ? (
                <div className="flex items-center gap-2 bg-[#121212] border border-white/10 px-6 py-3">
                  <div className="w-4 h-4 border-2 border-[#E5C158] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-mono text-slate-400">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-6 flex-wrap bg-[#121212] border border-white/10 px-6 py-3 rounded-none">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Wifi className="w-4 h-4 text-[#10b981]" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#10b981]">Live</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-mono text-[#F5F5F5]">{accountInfo?.name || 'No Account'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Coins className="w-3.5 h-3.5 text-[#E5C158]" />
                    <span className="text-xs font-mono text-[#E5C158]">${accountInfo?.currentBalance?.toLocaleString() || '0'}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${(accountInfo?.totalPnL || 0) >= 0 ? 'text-[#10b981]' : 'text-red-400'}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono">
                      {(accountInfo?.totalPnL || 0) >= 0 ? '+' : ''}{accountInfo?.totalPnL?.toLocaleString() || '0'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-mono text-slate-400">{accountInfo?.tradeCount || 0} trades</span>
                  </div>

                  <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-mono text-slate-500">{accountInfo?.lastSync || '--:--:--'}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-none">
                  <div className="w-6 h-6 rounded-full bg-[#E5C158] flex items-center justify-center text-black font-bold text-xs">
                    {session.user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-mono text-slate-400 truncate max-w-[100px]">
                    {session.user.email}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAccountSettings(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-white/5 text-[#F5F5F5] hover:text-[#E5C158] text-xs font-bold uppercase tracking-wider rounded-none border border-white/10 hover:border-[#E5C158] transition-all"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={() => setShowConfigPanel(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-white/5 text-[#F5F5F5] hover:text-[#E5C158] text-xs font-bold uppercase tracking-wider rounded-none border border-white/10 hover:border-[#E5C158] transition-all"
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>Backup</span>
                </button>

                {selectedTemplateId !== 'custom' && (
                  <button
                    onClick={handleResetToCurrentTemplate}
                    className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-white/5 text-[#F5F5F5] hover:text-[#E5C158] text-xs font-bold uppercase tracking-wider rounded-none border border-white/10 hover:border-[#E5C158] transition-all"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-white/5 text-[#F5F5F5] hover:text-red-400 text-xs font-bold uppercase tracking-wider rounded-none border border-white/10 hover:border-red-400 transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
            
            {accountLoading ? (
              <section className="border border-white/10 bg-[#121212] py-20 text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#E5C158] border-t-transparent" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Loading trading account...
                </p>
              </section>
            ) : (
              <>
                {activePage === 'journal' && (
                  <JournalPage>
                    <JournalContent
                      activeAccountId={activeAccountId}
                      userId={session.user.id}
                      data={data}
                      kpis={kpis}
                      charts={charts}
                      selectedTemplateId={selectedTemplateId}
                      accountConfig={accountConfig}
                      enableImport={ENABLE_IMPORT}
                      onTradeSaved={loadTradesFromSupabase}
                      onTemplateSwitch={handleTemplateSwitch}
                      onCustomDataLoaded={handleCustomDataLoaded}
                      setKPIs={setKPIs}
                      setCharts={setCharts}
                    />
                  </JournalPage>
                )}

                {activePage === 'dashboard' && (
                  <DashboardPage>
                    <div className="text-center py-20">
                      <p className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Dashboard Page</p>
                      <p className="text-xs text-slate-400 mt-2">Coming soon...</p>
                    </div>
                  </DashboardPage>
                )}

                {activePage === 'analytics' && (
                  <AnalyticsPage>
                    <div className="text-center py-20">
                      <p className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Analytics Page</p>
                      <p className="text-xs text-slate-400 mt-2">Coming soon...</p>
                    </div>
                  </AnalyticsPage>
                )}

                {activePage === 'calendar' && (
                  <CalendarPage>
                    <div className="text-center py-20">
                      <p className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Calendar Page</p>
                      <p className="text-xs text-slate-400 mt-2">Coming soon...</p>
                    </div>
                  </CalendarPage>
                )}

                {activePage === 'reports' && (
                  <ReportsPage>
                    <div className="text-center py-20">
                      <p className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Reports Page</p>
                      <p className="text-xs text-slate-400 mt-2">Coming soon...</p>
                    </div>
                  </ReportsPage>
                )}

                {activePage === 'settings' && (
                  <SettingsPage>
                    <div className="text-center py-20">
                      <p className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Settings Page</p>
                      <p className="text-xs text-slate-400 mt-2">Coming soon...</p>
                    </div>
                  </SettingsPage>
                )}
              </>
            )}
          </main>

          <footer className="text-center py-8 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 max-w-7xl mx-auto w-full px-4 border-t border-t-white/10 mt-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p>TRADEXA • PROFESSIONAL TRADING OPERATING SYSTEM</p>
            <p className="font-mono text-[#E5C158]">OPERATING IN CLIENT-SIDE CONTAINER</p>
          </footer>

          {/* Backup Modal */}
          {showConfigPanel && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-[#121212] rounded-none border border-white/20 p-8 max-w-lg w-full shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-[#E5C158]" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Backup & Sync Console</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowConfigPanel(false);
                      setImportError(null);
                    }}
                    className="p-1 hover:bg-white/5 text-slate-400 hover:text-[#F5F5F5] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                  <p>
                    Export or share your complete analytical config including spreadsheet structures, metric formulas, and active chart components to load them instantly.
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button
                      type="button"
                      onClick={handleExportDashboard}
                      className="py-3 px-4 bg-transparent hover:bg-white/5 text-[#F5F5F5] font-bold uppercase tracking-wider rounded-none border border-white/20 hover:border-[#E5C158] transition-colors flex items-center justify-center gap-1.5 text-xs"
                    >
                      <Download className="w-4 h-4" />
                      Save Backup
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyConfigCode}
                      className="py-3 px-4 bg-[#E5C158] hover:bg-[#C9A23E] text-black font-black uppercase tracking-wider rounded-none transition-colors flex items-center justify-center gap-1.5 text-xs"
                    >
                      {exportSuccess ? <Check className="w-4 h-4 text-black" /> : <FileText className="w-4 h-4 text-black" />}
                      {exportSuccess ? 'Copied State!' : 'Copy Code'}
                    </button>
                  </div>

                  <form onSubmit={handleImportConfig} className="space-y-3 border-t border-white/10 pt-6 mt-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Paste Workspace JSON Configuration
                    </label>
                    <textarea
                      value={importString}
                      onChange={(e) => setImportString(e.target.value)}
                      placeholder="Paste backup JSON string here..."
                      className="w-full h-28 p-3 text-[11px] font-mono border border-white/10 rounded-none bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158] resize-none"
                    />
                    {importError && (
                      <p className="text-[#E5C158] font-bold text-[11px] font-mono animate-fadeIn">
                        CRITICAL ERROR: {importError}
                      </p>
                    )}
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={!importString.trim()}
                        className="px-5 py-3 bg-[#E5C158] hover:bg-[#C9A23E] text-black font-black uppercase tracking-wider rounded-none transition-colors disabled:opacity-40 flex items-center gap-2 text-xs"
                      >
                        <UploadCloud className="w-4 h-4 text-black" />
                        Deploy Backup
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          <DashboardSettings
            open={showAccountSettings}
            config={accountConfig}
            onClose={() => setShowAccountSettings(false)}
            onSave={setAccountConfig}
          />
        </div>
      </div>
    </div>
  );
}