import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react';

import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { templates, type Template } from '../templates';
import type {
  AccountConfig,
  ChartConfig,
  KPIConfig,
  ParsedData,
} from '../types';

const LOCAL_STORAGE_KEY = 'spreadsheet-dashboard-state-v1';

const DEFAULT_ACCOUNT_CONFIG: AccountConfig = {
  startingBalance: 100000,
  profitTarget: 6000,
  dailyLossLimit: 1000,
  trailingDrawdown: 3000,
  consistencyLimit: 40
};

export function useTradingDashboard(
  session: Session | null,
) {
  // =============================================
  // 1. Dashboard State
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

  const [accountInfo, setAccountInfo] = useState<{
    name: string;
    startingBalance: number;
    currentBalance: number;
    tradeCount: number;
    totalPnL: number;
    lastSync: string;
  } | null>(null);

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);

  // =============================================
  // 2. Load Trades from Supabase
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

      const activeAccount = accounts?.[0];

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

      const futuresTemplate = templates[0];

      const totalPnL = (trades ?? []).reduce((sum, trade) => {
        return sum + Number(trade.net_pnl ?? 0);
      }, 0);

      const startingBalance = Number(activeAccount.starting_balance ?? 0);
      const currentBalance = startingBalance + totalPnL;

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
  // Initial Load เมื่อ Login หรือ Session เปลี่ยน
  // =============================================
  useEffect(() => {
    if (!session?.user) {
      setAccountLoading(false);
      return;
    }

    void loadTradesFromSupabase();
  }, [session?.user?.id, loadTradesFromSupabase]);

  // =============================================
  // 3. Realtime Sync
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
  // 4. Save to Local Storage (Backup)
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
  // 5. Handlers
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

  const handleImportConfig = (e: FormEvent) => {
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
  // 6. Return
  // =============================================
  return {
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
    setKPIs,
    setCharts,
    setAccountConfig,
    setShowConfigPanel,
    setShowAccountSettings,
    setImportString,
    setImportError,
    loadTradesFromSupabase,
    handleTemplateSwitch,
    handleCustomDataLoaded,
    handleResetToCurrentTemplate,
    handleExportDashboard,
    handleCopyConfigCode,
    handleImportConfig,
  };
}