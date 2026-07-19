// =============================================
// src/App.tsx
// แก้ไขฟิลด์ตาม SQL จริง + เพิ่ม Debug Logs + TradeForm
// ปรับ Header เป็นโลโก้ TRADEXA
// เพิ่ม Sidebar (TradexaSidebar) และปรับ Layout เป็น Flex
// =============================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Login from './components/auth/Login';
import {
  RefreshCw,
  TrendingUp,
  Download,
  FileText,
  Layers,
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
import { ParsedData, KPIConfig, ChartConfig, type AccountConfig } from './types';
import { templates, type Template } from './templates';
import DataImporter from './components/DataImporter';
import KPIStats from './components/KPIStats';
import DashboardCharts from './components/DashboardCharts';
import DataTable from './components/DataTable';
import TradingHeatmap from './components/TradingHeatmap';
import DailyLossTracker from './components/DailyLossTracker';
import TrailingDrawdownTracker from './components/TrailingDrawdownTracker';
import ConsistencyTracker from './components/ConsistencyTracker';
import ProfitTargetTracker from './components/ProfitTargetTracker';
import DashboardSettings from './components/DashboardSettings';
import FirstAccountSetup from './components/accounts/FirstAccountSetup';
import TradeForm from './components/trades/TradeForm';

// ✅ เพิ่ม Import โลโก้ (ตำแหน่งสัมพันธ์กับ src/App.tsx)
import tradexaLogo from "./assets/logo/logo.svg";

// ✅ ✅ เพิ่ม Import Sidebar
import TradexaSidebar from "./components/layout/TradexaSidebar";

const LOCAL_STORAGE_KEY = 'spreadsheet-dashboard-state-v1';

const DEFAULT_ACCOUNT_CONFIG: AccountConfig = {
  startingBalance: 100000,
  profitTarget: 6000,
  dailyLossLimit: 1000,
  trailingDrawdown: 3000,
  consistencyLimit: 40
};

// ✅ เปิด/ปิด DataImporter
const ENABLE_IMPORT = false;

export default function App() {
  // =============================================
  // 1. Auth State
  // =============================================
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // =============================================
  // 2. Dashboard State
  // =============================================
  const [data, setData] = useState<ParsedData | null>(null);
  const [kpis, setKPIs] = useState<KPIConfig[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('futures');
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importString, setImportString] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountConfig, setAccountConfig] = useState<AccountConfig>(DEFAULT_ACCOUNT_CONFIG);

  // ✅ state สำหรับ Header Info
  const [accountInfo, setAccountInfo] = useState<{
    name: string;
    startingBalance: number;
    currentBalance: number;
    tradeCount: number;
    totalPnL: number;
    lastSync: string;
  } | null>(null);

  // ✅ state สำหรับ activeAccountId
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  // ✅ state สำหรับ Loading
  const [accountLoading, setAccountLoading] = useState(true);

  // =============================================
  // 3. Auth Effect - ตรวจสอบ Session
  // =============================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // =============================================
  // 4. Load Trades from Supabase
  // =============================================
  const loadTradesFromSupabase = useCallback(async () => {
    if (!session?.user) {
      setAccountLoading(false);
      return;
    }

    setAccountLoading(true);
    console.log('🔄 Loading trades from Supabase...');

    try {
      const { data: accounts, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (accountError) {
        console.error('❌ Load account error:', accountError);
        setAccountLoading(false);
        return;
      }

      console.log('📋 Accounts:', accounts);
      
      const activeAccount = accounts?.[0];
      
      console.log('📋 Active Account:', activeAccount);
      console.log('📋 Active Account ID:', activeAccount?.id);
      console.log('📋 Active Account Name:', activeAccount?.name);

      if (!activeAccount) {
        console.log('ℹ️ No account found, showing empty state');
        const futuresTemplate = templates[0];

        setData({
          ...futuresTemplate.data,
          sourceName: 'Supabase Cloud — No Trading Account',
          rows: [],
        });

        setKPIs(futuresTemplate.defaultKPIs);
        setCharts(futuresTemplate.defaultCharts);
        setSelectedTemplateId('futures');
        setAccountInfo(null);
        setActiveAccountId(null);
        setAccountLoading(false);
        return;
      }

      console.log('✅ Active account:', activeAccount.name);
      setActiveAccountId(activeAccount.id);

      const { data: trades, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('account_id', activeAccount.id)
        .order('trade_date', { ascending: true })
        .order('trade_time', { ascending: true });

      if (tradeError) {
        console.error('❌ Load trades error:', tradeError);
        setAccountLoading(false);
        return;
      }

      console.log('📊 Trades:', trades);
      console.log(`✅ Loaded ${trades?.length || 0} trades`);

      if (trades && trades.length > 0) {
        console.log('📊 First trade structure:', trades[0]);
        console.log('📊 Trade keys:', Object.keys(trades[0]));
      }

      const futuresTemplate = templates[0];

      // ✅ คำนวณ Current Balance
      const totalPnL = (trades ?? []).reduce((sum, trade) => {
        return sum + Number(trade.net_pnl ?? 0);
      }, 0);

      const startingBalance = Number(activeAccount.starting_balance ?? 0);
      const currentBalance = startingBalance + totalPnL;

      // ✅ หาเวลาล่าสุดจากการอัปเดต
      let lastSyncTime = new Date().toLocaleTimeString();
      
      if (trades && trades.length > 0) {
        const latestTrade = trades.reduce((latest, trade) => {
          const latestDate = latest.updated_at ? new Date(latest.updated_at).getTime() : 0;
          const tradeDate = trade.updated_at ? new Date(trade.updated_at).getTime() : 0;
          return tradeDate > latestDate ? trade : latest;
        }, trades[0]);
        
        if (latestTrade?.updated_at) {
          lastSyncTime = new Date(latestTrade.updated_at).toLocaleTimeString();
        }
      } else if (activeAccount.updated_at) {
        lastSyncTime = new Date(activeAccount.updated_at).toLocaleTimeString();
      }

      // ✅ map ทุกฟิลด์จากตาราง trades
      const mappedRows = (trades ?? []).map((trade) => ({
        Date: trade.trade_date,
        Symbol: trade.symbol,
        Direction: trade.direction,
        Side: trade.direction,
        Setup: trade.setup || '',
        Session: trade.session_name || '',
        Contracts: Number(trade.contracts ?? 0),
        'P&L': Number(trade.net_pnl ?? 0),
        'R-Multiple': Number(trade.r_multiple ?? 0),
        
        Entry: Number(trade.entry_price ?? 0),
        Exit: Number(trade.exit_price ?? 0),
        Stop: Number(trade.stop_loss ?? 0),
        
        Gross: Number(trade.gross_pnl ?? 0),
        Fee: Number(trade.fees ?? 0),
        Net: Number(trade.net_pnl ?? 0),
        
        Holding: '',
        'Trade Duration': '',
        
        Emotion: trade.emotion || '',
        Mistake: trade.mistake || '',
        Notes: trade.notes || '',
        Result: trade.result || '',
        WinLoss: trade.result || '',
        
        Day: trade.trade_date ? new Date(trade.trade_date).toLocaleDateString('en-US', { weekday: 'short' }) : '',
        Account: activeAccount.name || '',
        
        TradeId: trade.id,
        AccountId: trade.account_id,
        TradeDate: trade.trade_date,
        TradeTime: trade.trade_time,
        CreatedAt: trade.created_at,
        UpdatedAt: trade.updated_at,
      }));

      console.log('📊 Mapped rows sample:', mappedRows[0]);
      console.log('📊 Mapped rows count:', mappedRows.length);

      // ✅ อัปเดต Account Info
      setAccountInfo({
        name: activeAccount.name || 'Unknown Account',
        startingBalance: startingBalance,
        currentBalance: currentBalance,
        tradeCount: trades?.length || 0,
        totalPnL: totalPnL,
        lastSync: lastSyncTime,
      });

      setData({
        ...futuresTemplate.data,
        sourceName: `${activeAccount.name} (Supabase Cloud Sync)`,
        rows: mappedRows,
      });

      setKPIs(futuresTemplate.defaultKPIs);
      setCharts(futuresTemplate.defaultCharts);

      setAccountConfig({
        startingBalance: startingBalance,
        profitTarget: Number(activeAccount.profit_target ?? 0),
        dailyLossLimit: Number(activeAccount.daily_loss_limit ?? 0),
        trailingDrawdown: Number(activeAccount.trailing_drawdown ?? 0),
        consistencyLimit: Number(activeAccount.consistency_limit ?? 40),
      });

      setSelectedTemplateId('futures');

    } catch (error) {
      console.error('❌ Unexpected error:', error);
    } finally {
      setAccountLoading(false);
    }
  }, [session]);

  // =============================================
  // 5. Load Dashboard State from Supabase
  // =============================================
  useEffect(() => {
    if (!session) return;
    loadTradesFromSupabase();
  }, [session, loadTradesFromSupabase]);

  // =============================================
  // 6. Realtime Sync
  // =============================================
  useEffect(() => {
    if (!session?.user || !activeAccountId) return;

    const tradesChannel = supabase
      .channel(`dashboard-trades-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `account_id=eq.${activeAccountId}`,
        },
        () => {
          console.log('🔄 Realtime update detected (trades), reloading...');
          loadTradesFromSupabase();
        }
      )
      .subscribe();

    const accountsChannel = supabase
      .channel(`dashboard-accounts-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          console.log('🔄 Realtime update detected (accounts), reloading...');
          loadTradesFromSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(accountsChannel);
    };
  }, [session, activeAccountId, loadTradesFromSupabase]);

  // =============================================
  // 7. Save to Local Storage (Backup)
  // =============================================
  useEffect(() => {
    if (data && session) {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          data,
          kpis,
          charts,
          accountConfig,
          version: "2.0",
          lastSync: new Date().toISOString()
        })
      );
    }
  }, [data, kpis, charts, accountConfig, session]);

  // =============================================
  // 8. Handlers
  // =============================================

  const handleTemplateSwitch = (templateId: string) => {
    if (templateId === 'custom') return;
    
    const target = templates.find(
      (t: Template) => t.id === templateId
    );
    
    if (target) {
      setSelectedTemplateId(templateId);

      if (templateId === 'futures') {
        loadTradesFromSupabase();
        return;
      }

      setData(target.data);
      setKPIs(target.defaultKPIs);
      setCharts(target.defaultCharts);
      setAccountConfig(target.accountConfig ?? DEFAULT_ACCOUNT_CONFIG);
    }
  };

  const handleCustomDataLoaded = useCallback((newData: ParsedData) => {
    const numericalCols = newData.columns.filter(c => c.type === 'number');
    const categoricalCols = newData.columns.filter(c => c.type === 'string' || c.type === 'date');

    const pnlCol = newData.columns.find(c => 
      ['p&l', 'pnl', 'profit', 'loss', 'amount', 'net', 'p&l accumulated'].some(k => 
        c.name.toLowerCase().includes(k)
      )
    );
    
    const rCol = newData.columns.find(c => 
      ['r-multiple', 'r_multiple', 'r multiple', 'r', 'r-value'].some(k => 
        c.name.toLowerCase().includes(k)
      )
    );
    
    const dateCol = newData.columns.find(c => 
      c.type === 'date' || ['date', 'day', 'tradedate', 'entrydate'].some(k => 
        c.name.toLowerCase().includes(k)
      )
    );
    
    const setupCol = newData.columns.find(c => 
      ['setup', 'strategy', 'pattern', 'category'].some(k => 
        c.name.toLowerCase().includes(k)
      )
    );
    
    const sessionCol = newData.columns.find(c =>
      ['session', 'period', 'market session', 'time'].some(k =>
        c.name.toLowerCase().includes(k)
      )
    );

    if (pnlCol) {
      const futuresTemplate =
        templates.find((t: Template) => t.id === 'futures') ||
        templates[0];
      
      const mappedKPIs = futuresTemplate.defaultKPIs.map(
        (kpi: KPIConfig) => {
          let col = kpi.column;

          if (kpi.column === 'P&L' && pnlCol) {
            col = pnlCol.name;
          }

          if (kpi.column === 'R-Multiple' && rCol) {
            col = rCol.name;
          }

          return {
            ...kpi,
            id: `kpi-mapped-${kpi.id}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 6)}`,
            column: col
          };
        }
      );

      const mappedCharts = futuresTemplate.defaultCharts.map(
        (chart: ChartConfig) => {
          let xAxisKey = chart.xAxisKey;
          let yAxisKey = chart.yAxisKey;

          if (chart.xAxisKey === 'Date' && dateCol) {
            xAxisKey = dateCol.name;
          }

          if (chart.xAxisKey === 'Setup' && setupCol) {
            xAxisKey = setupCol.name;
          }

          if (chart.xAxisKey === 'Session' && sessionCol) {
            xAxisKey = sessionCol.name;
          }

          if (chart.xAxisKey === 'P&L' && pnlCol) {
            xAxisKey = pnlCol.name;
          }

          if (chart.yAxisKey === 'P&L' && pnlCol) {
            yAxisKey = pnlCol.name;
          }

          return {
            ...chart,
            id: `chart-mapped-${chart.id}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 6)}`,
            xAxisKey,
            yAxisKey
          };
        }
      );

      setData(newData);
      setKPIs(mappedKPIs);
      setCharts(mappedCharts);
      setSelectedTemplateId('futures');
      return;
    }
    
    // === NON-TRADING DATA ===
    const autoKPIs: KPIConfig[] = [];
    const autoCharts: ChartConfig[] = [];
    
    if (numericalCols.length > 0) {
      numericalCols.slice(0, 4).forEach(
        (
          col: ParsedData['columns'][number],
          index: number
        ) => {
          const nameLower = col.name.toLowerCase();
          const isRate = ['rate', '%', 'churn', 'ratio'].some(k => nameLower.includes(k));
          const isCurrency = ['$', 'revenue', 'sales', 'amount', 'price'].some(k => nameLower.includes(k));
          const colors = ['emerald', 'indigo', 'rose', 'amber'];
          
          let format: KPIConfig['format'] = 'number';
          if (isCurrency) format = 'currency';
          else if (isRate) format = 'percent';

          autoKPIs.push({
            id: `kpi-auto-${col.name}-${index}-${Date.now()}`,
            title: isRate ? `Average ${col.name}` : `Total ${col.name}`,
            column: col.name,
            type: isRate ? 'avg' : 'sum',
            format,
            color: colors[index % colors.length],
          });
        }
      );
    } else {
      autoKPIs.push({
        id: `kpi-auto-rows-${Date.now()}`,
        title: 'Total Records Count',
        column: newData.columns[0]?.name || '',
        type: 'count',
        format: 'number',
        color: 'indigo',
      });
    }
    
    if (categoricalCols.length > 0 && numericalCols.length > 0) {
      const xCol = categoricalCols[0];
      const chartTypes: Array<ChartConfig['type']> = ['bar', 'line', 'area'];
      const colors = ['#6366f1', '#10b981', '#3b82f6'];
      
      numericalCols.slice(0, 3).forEach(
        (
          yCol: ParsedData['columns'][number],
          index: number
        ) => {
          autoCharts.push({
            id: `chart-auto-${index}-${Date.now()}`,
            title: `${yCol.name} by ${xCol.name}`,
            type: chartTypes[index % chartTypes.length],
            xAxisKey: xCol.name,
            yAxisKey: yCol.name,
            color: colors[index % colors.length],
          });
        }
      );
    }

    setData(newData);
    setKPIs(autoKPIs);
    setCharts(autoCharts);
    setSelectedTemplateId('custom');
  }, []);

  const handleResetToCurrentTemplate = () => {
    if (selectedTemplateId === 'custom') return;

    const target = templates.find(
      (t: Template) => t.id === selectedTemplateId
    );

    if (!target) return;

    if (selectedTemplateId === 'futures') {
      loadTradesFromSupabase();
      return;
    }

    setData(target.data);
    setKPIs(target.defaultKPIs);
    setCharts(target.defaultCharts);
    setAccountConfig(target.accountConfig ?? DEFAULT_ACCOUNT_CONFIG);
  };

  const handleExportDashboard = () => {
    try {
      const stateObj = {
        version: "2.0",
        createdAt: new Date().toISOString(),
        data,
        kpis,
        charts,
        accountConfig
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${data?.sourceName || 'spreadsheet'}-dashboard.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (e) {
      alert('Failed to export state.');
    }
  };

  const handleCopyConfigCode = () => {
    try {
      const stateObj = {
        version: "2.0",
        createdAt: new Date().toISOString(),
        data,
        kpis,
        charts,
        accountConfig
      };
      navigator.clipboard.writeText(JSON.stringify(stateObj));
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      alert('Could not copy to clipboard.');
    }
  };

  const handleImportConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!importString.trim()) return;
      const parsed = JSON.parse(importString.trim());
      
      if (parsed.version && parsed.version !== "2.0") {
        setImportError(`Unsupported version: ${parsed.version}. Expected version 2.0.`);
        return;
      }
      
      if (parsed.data && Array.isArray(parsed.kpis) && Array.isArray(parsed.charts)) {
        setData(parsed.data);
        setKPIs(parsed.kpis);
        setCharts(parsed.charts);
        if (parsed.accountConfig) {
          setAccountConfig({
            ...DEFAULT_ACCOUNT_CONFIG,
            ...parsed.accountConfig
          });
        }
        setSelectedTemplateId('custom');
        setImportString('');
        setImportError(null);
        setShowConfigPanel(false);
      } else {
        setImportError('Invalid JSON format. Check that data, kpis, and charts properties exist.');
      }
    } catch (err) {
      setImportError('JSON parsing error. Please check the pasted backup string.');
    }
  };

  // =============================================
  // 9. Loading State
  // =============================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#E5C158] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm uppercase tracking-widest text-slate-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  // =============================================
  // 10. Login Screen
  // =============================================
  if (!session) {
    return <Login />;
  }

  // =============================================
  // 11. Check: No Account → Show Setup
  // =============================================
  if (!accountLoading && !activeAccountId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-4 flex items-center justify-center">
        <FirstAccountSetup
          userId={session.user.id}
          onCreated={() => {
            loadTradesFromSupabase();
          }}
        />
      </div>
    );
  }

  // =============================================
  // 12. Dashboard (Main App) - ปรับโครงสร้าง Layout ใหม่
  // =============================================
  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="flex min-h-screen">
        
        {/* ✅ ส่วน Sidebar */}
        <TradexaSidebar activePage="journal" />

        {/* ✅ ส่วน Main Content (Right Panel) */}
        <div className="min-w-0 flex-1 flex flex-col relative">
          
          {/* Absolute background accent (ปรับย้ายมาอยู่ในคอลัมน์ขวา) */}
          <div className="absolute top-0 right-0 p-8 md:p-12 pointer-events-none hidden lg:block">
            <div className="text-[10px] tracking-[0.4em] uppercase opacity-30 font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              Database / Sync / Live
            </div>
          </div>

          {/* ✅ Header เดิม (ย้ายมาอยู่ใน flex-1) */}
          <header className="bg-[#0A0A0A] border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex items-center">
                <img
                  src={tradexaLogo}
                  alt="TRADEXA Professional Trading Operating System"
                  className="h-16 w-auto"
                />
              </div>

              {/* Cloud Status & Account Info */}
              {accountLoading ? (
                <div className="flex items-center gap-2 bg-[#121212] border border-white/10 px-6 py-3">
                  <div className="w-4 h-4 border-2 border-[#E5C158] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-mono text-slate-400">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-6 flex-wrap bg-[#121212] border border-white/10 px-6 py-3 rounded-none">
                  {/* Cloud Sync Status */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Wifi className="w-4 h-4 text-[#10b981]" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></span>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#10b981]">Live</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-mono text-[#F5F5F5]">
                      {accountInfo?.name || 'No Account'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Coins className="w-3.5 h-3.5 text-[#E5C158]" />
                    <span className="text-xs font-mono text-[#E5C158]">
                      ${accountInfo?.currentBalance?.toLocaleString() || '0'}
                    </span>
                  </div>

                  <div className={`flex items-center gap-2 ${(accountInfo?.totalPnL || 0) >= 0 ? 'text-[#10b981]' : 'text-red-400'}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono">
                      {(accountInfo?.totalPnL || 0) >= 0 ? '+' : ''}{accountInfo?.totalPnL?.toLocaleString() || '0'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-mono text-slate-400">
                      {accountInfo?.tradeCount || 0} trades
                    </span>
                  </div>

                  <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-mono text-slate-500">
                      {accountInfo?.lastSync || '--:--:--'}
                    </span>
                  </div>
                </div>
              )}

              {/* Top Toolbar Actions */}
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

          {/* ✅ Master Panel Content (Main) เดิม */}
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
                {/* TradeForm */}
                {activeAccountId && (
                  <section id="trade-form-section" className="space-y-4">
                    <TradeForm
                      accountId={activeAccountId}
                      userId={session.user.id}
                      onSaved={loadTradesFromSupabase}
                    />
                  </section>
                )}

                {/* Preset Selector Panel */}
                <section className="bg-[#121212] border border-white/10 rounded-none p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#E5C158] tracking-[0.2em] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        Active Dataset Preset
                      </span>
                      <h2 className="text-xl font-bold uppercase tracking-tight text-[#F5F5F5] mt-1.5 italic">
                        Choose a Pre-compiled Dataset Template
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {templates.map((tmpl: Template) => {
                      const isActive = selectedTemplateId === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          onClick={() => handleTemplateSwitch(tmpl.id)}
                          className={`p-5 rounded-none border text-left transition-all relative ${
                            isActive
                              ? 'bg-[#E5C158] border-[#E5C158] text-black font-black'
                              : 'bg-[#0A0A0A] hover:bg-white/5 border-white/10 text-[#F5F5F5]'
                          }`}
                        >
                          <h3 className="text-xs font-black uppercase tracking-wider">
                            {tmpl.name}
                          </h3>
                          <p className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                            {tmpl.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* DataImporter */}
                {ENABLE_IMPORT && (
                  <section id="importer-section" className="animate-slideIn">
                    <DataImporter
                      onDataLoaded={handleCustomDataLoaded}
                      currentSourceName={data?.sourceName}
                    />
                  </section>
                )}

                {data ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={data.sourceName}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-8"
                    >
                      {/* Risk Management Section */}
                      <section id="risk-section" className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          <DailyLossTracker
                            data={data}
                            dailyLossLimit={accountConfig.dailyLossLimit}
                          />
                          <TrailingDrawdownTracker
                            data={data}
                            startingBalance={accountConfig.startingBalance}
                            drawdownAmount={accountConfig.trailingDrawdown}
                          />
                        </div>

                        <ConsistencyTracker
                          data={data}
                          consistencyLimit={accountConfig.consistencyLimit}
                        />

                        <ProfitTargetTracker
                          data={data}
                          profitTarget={accountConfig.profitTarget}
                        />
                      </section>

                      {/* KPIs Section */}
                      <section id="kpis-section">
                        <KPIStats
                          data={data}
                          kpis={kpis}
                          onKPIsChange={setKPIs}
                          startingBalance={accountConfig.startingBalance}
                        />
                      </section>

                      {/* Charts Section */}
                      <section id="charts-section" className="space-y-8">
                        <DashboardCharts
                          data={data}
                          charts={charts}
                          onChartsChange={setCharts}
                          startingBalance={accountConfig.startingBalance}
                        />
                      </section>

                      {/* Heatmap Section */}
                      <section id="heatmap-section" className="space-y-8">
                        <TradingHeatmap data={data} />
                      </section>

                      {/* Data Grid Explorer Section */}
                      <section id="table-section">
                        <DataTable data={data} />
                      </section>
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="text-center py-20 bg-[#121212] border border-dashed border-white/20 rounded-none">
                    <TrendingUp className="w-12 h-12 text-[#E5C158] mx-auto mb-4" />
                    <p className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">No active dataset initialized</p>
                    <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                      Loading data from Supabase Cloud...
                    </p>
                  </div>
                )}
              </>
            )}
          </main>

          {/* ✅ Footer Branding (ย้ายมาไว้ใน flex-1 เพื่อไม่ให้ไปชน Sidebar) */}
          <footer className="text-center py-8 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 max-w-7xl mx-auto w-full px-4 border-t border-t-white/10 mt-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p>TRADEXA • PROFESSIONAL TRADING OPERATING SYSTEM</p>
            <p className="font-mono text-[#E5C158]">OPERATING IN CLIENT-SIDE CONTAINER</p>
          </footer>

          {/* Modals (Backup & Account Settings) */}
          {showConfigPanel && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="config-backup-modal">
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