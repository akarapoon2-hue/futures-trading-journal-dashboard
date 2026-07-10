import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layout,
  RefreshCw,
  TrendingUp,
  Download,
  Flame,
  FileText,
  Sparkles,
  Layers,
  Settings,
  HelpCircle,
  UploadCloud,
  Check,
  X
} from 'lucide-react';
import { ParsedData, KPIConfig, ChartConfig } from './types';
import { templates, Template } from './templates';
import DataImporter from './components/DataImporter';
import KPIStats from './components/KPIStats';
import DashboardCharts from './components/DashboardCharts';
import DataTable from './components/DataTable';

const LOCAL_STORAGE_KEY = 'spreadsheet-dashboard-state-v1';

export default function App() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [kpis, setKPIs] = useState<KPIConfig[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('futures');
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importString, setImportString] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Load initial state from local storage or fallback to the default Futures template
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data && Array.isArray(parsed.kpis) && Array.isArray(parsed.charts)) {
          setData(parsed.data);
          setKPIs(parsed.kpis);
          setCharts(parsed.charts);
          
          // Match selected template if possible
          const matched = templates.find(t => t.data.sourceName === parsed.data.sourceName);
          if (matched) {
            setSelectedTemplateId(matched.id);
          } else {
            setSelectedTemplateId('custom');
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Could not restore saved dashboard state:', e);
    }

    // Default Initialization (Futures trading trend template)
    const defaultTemplate = templates[0];
    setData(defaultTemplate.data);
    setKPIs(defaultTemplate.defaultKPIs);
    setCharts(defaultTemplate.defaultCharts);
    setSelectedTemplateId(defaultTemplate.id);
  }, []);

  // Sync state to local storage when updated
  useEffect(() => {
    if (data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ data, kpis, charts }));
    }
  }, [data, kpis, charts]);

  // Handle switching template presets
  const handleTemplateSwitch = (templateId: string) => {
    if (templateId === 'custom') return;
    
    const target = templates.find(t => t.id === templateId);
    if (target) {
      setData(target.data);
      setKPIs(target.defaultKPIs);
      setCharts(target.defaultCharts);
      setSelectedTemplateId(templateId);
    }
  };

  // Smart Auto-Generator for pasted custom datasets
  const handleCustomDataLoaded = (newData: ParsedData) => {
    const numericalCols = newData.columns.filter(c => c.type === 'number');
    const categoricalCols = newData.columns.filter(c => c.type === 'string' || c.type === 'date');

    const pnlCol = newData.columns.find(c => c.name.toLowerCase() === 'p&l' || c.name.toLowerCase() === 'pnl' || c.name.toLowerCase() === 'profit' || c.name.toLowerCase() === 'amount' || c.name.toLowerCase() === 'p&l accumulated');
    const rCol = newData.columns.find(c => c.name.toLowerCase() === 'r-multiple' || c.name.toLowerCase() === 'r_multiple' || c.name.toLowerCase() === 'r multiple' || c.name.toLowerCase() === 'r' || c.name.toLowerCase() === 'r-value');
    const dateCol = newData.columns.find(c => c.type === 'date' || c.name.toLowerCase() === 'date');
    const symbolCol = newData.columns.find(c => c.name.toLowerCase() === 'symbol' || c.name.toLowerCase() === 'ticker' || c.name.toLowerCase() === 'instrument' || c.name.toLowerCase() === 'contract');
    const setupCol = newData.columns.find(c => c.name.toLowerCase() === 'setup' || c.name.toLowerCase() === 'strategy' || c.name.toLowerCase() === 'pattern' || c.name.toLowerCase() === 'category');
    const sessionCol = newData.columns.find(c => c.name.toLowerCase() === 'session' || c.name.toLowerCase() === 'time' || c.name.toLowerCase() === 'period');

    if (pnlCol) {
      // It's a trading journal dataset! Let's load the full set of Prop Firm KPIs and Charts adjusted to this dataset!
      const futuresTemplate = templates.find(t => t.id === 'futures') || templates[0];
      
      const mappedKPIs = futuresTemplate.defaultKPIs.map(kpi => {
        let col = kpi.column;
        if (kpi.column === 'P&L' && pnlCol) col = pnlCol.name;
        if (kpi.column === 'R-Multiple' && rCol) col = rCol.name;
        return {
          ...kpi,
          id: `kpi-mapped-${kpi.id}-${Date.now()}`,
          column: col
        };
      });

      const mappedCharts = futuresTemplate.defaultCharts.map(chart => {
        let xAxisKey = chart.xAxisKey;
        let yAxisKey = chart.yAxisKey;

        if (chart.xAxisKey === 'Date' && dateCol) xAxisKey = dateCol.name;
        if (chart.xAxisKey === 'Setup' && setupCol) xAxisKey = setupCol.name;
        if (chart.xAxisKey === 'Session' && sessionCol) xAxisKey = sessionCol.name;
        if (chart.xAxisKey === 'P&L' && pnlCol) xAxisKey = pnlCol.name;

        if (chart.yAxisKey === 'P&L' && pnlCol) yAxisKey = pnlCol.name;

        return {
          ...chart,
          id: `chart-mapped-${chart.id}-${Date.now()}`,
          xAxisKey,
          yAxisKey
        };
      });

      setData(newData);
      setKPIs(mappedKPIs);
      setCharts(mappedCharts);
      setSelectedTemplateId('futures'); // Sync with Futures preset layout
      return;
    }
    
    const autoKPIs: KPIConfig[] = [];
    const autoCharts: ChartConfig[] = [];
    
    // 1. Generate standard sum/average cards for numeric attributes (Max 4)
    if (numericalCols.length > 0) {
      numericalCols.slice(0, 4).forEach((col, index) => {
        const nameLower = col.name.toLowerCase();
        const isRate = nameLower.includes('rate') || nameLower.includes('%') || nameLower.includes('churn') || nameLower.includes('ratio');
        const colors = ['emerald', 'indigo', 'rose', 'amber'];
        
        // Pick smart formatting
        let format: KPIConfig['format'] = 'number';
        if (nameLower.includes('$') || nameLower.includes('revenue') || nameLower.includes('sales') || nameLower.includes('amount') || nameLower.includes('price')) {
          format = 'currency';
        } else if (isRate) {
          format = 'percent';
        }

        autoKPIs.push({
          id: `kpi-auto-${col.name}-${index}-${Date.now()}`,
          title: isRate ? `Average ${col.name}` : `Total ${col.name}`,
          column: col.name,
          type: isRate ? 'avg' : 'sum',
          format,
          color: colors[index % colors.length],
        });
      });
    } else {
      // Row Counter if no numeric field is parsed
      autoKPIs.push({
        id: `kpi-auto-rows-${Date.now()}`,
        title: 'Total Records Count',
        column: newData.columns[0]?.name || '',
        type: 'count',
        format: 'number',
        color: 'indigo',
      });
    }
    
    // 2. Generate standard charts grouping first categorical by numeric metric (Max 3)
    if (categoricalCols.length > 0 && numericalCols.length > 0) {
      const xCol = categoricalCols[0];
      
      numericalCols.slice(0, 3).forEach((yCol, index) => {
        const chartTypes: Array<ChartConfig['type']> = ['bar', 'area', 'line'];
        const colors = ['#6366f1', '#10b981', '#3b82f6'];
        
        autoCharts.push({
          id: `chart-auto-${index}-${Date.now()}`,
          title: `${yCol.name} Performance by ${xCol.name}`,
          type: chartTypes[index % chartTypes.length],
          xAxisKey: xCol.name,
          yAxisKey: yCol.name,
          color: colors[index % colors.length],
        });
      });
    }

    setData(newData);
    setKPIs(autoKPIs);
    setCharts(autoCharts);
    setSelectedTemplateId('custom');
  };

  const handleResetToCurrentTemplate = () => {
    if (selectedTemplateId === 'custom') return;
    const target = templates.find(t => t.id === selectedTemplateId);
    if (target) {
      setData(target.data);
      setKPIs(target.defaultKPIs);
      setCharts(target.defaultCharts);
    }
  };

  // Export Dashboard as a JSON backup file
  const handleExportDashboard = () => {
    try {
      const stateObj = { data, kpis, charts };
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

  // Copy active dashboard configuration code to clipboard
  const handleCopyConfigCode = () => {
    try {
      const stateObj = { data, kpis, charts };
      navigator.clipboard.writeText(JSON.stringify(stateObj));
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      alert('Could not copy to clipboard.');
    }
  };

  // Import custom JSON backup string
  const handleImportConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!importString.trim()) return;
      const parsed = JSON.parse(importString.trim());
      
      if (parsed.data && Array.isArray(parsed.kpis) && Array.isArray(parsed.charts)) {
        setData(parsed.data);
        setKPIs(parsed.kpis);
        setCharts(parsed.charts);
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] antialiased font-sans pb-16 flex flex-col justify-between relative selection:bg-[#E5C158] selection:text-black">
      {/* Absolute background accent */}
      <div className="absolute top-0 right-0 p-8 md:p-12 pointer-events-none hidden lg:block">
        <div className="text-[10px] tracking-[0.4em] uppercase opacity-30 font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          Database / Sync / Live
        </div>
      </div>

      <div>
        {/* Navigation / Header */}
        <header className="bg-[#0A0A0A] border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1 flex flex-col">
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-xs font-bold tracking-[0.5em] uppercase text-[#E5C158]">FUTURES TRADING HUB</span>
                <div className="h-[1px] flex-grow bg-white/10 hidden sm:block"></div>
              </div>
              <h1 className="text-4xl md:text-7xl font-black leading-[0.85] tracking-[-0.05em] uppercase">
                FUTURES<span className="text-transparent" style={{ WebkitTextStroke: '1.5px #E5C158' }}>PROP</span>
              </h1>
              {data && (
                <p className="text-[11px] font-mono opacity-50 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E5C158] animate-ping"></span>
                  Active Source: <span className="text-[#F5F5F5] font-semibold">{data.sourceName}</span>
                </p>
              )}
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfigPanel(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-transparent hover:bg-white/5 text-[#F5F5F5] hover:text-[#E5C158] text-xs font-bold uppercase tracking-wider rounded-none border border-white/20 hover:border-[#E5C158] transition-all"
                id="btn-open-config"
                title="Backup and Restore settings"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Backup Utility</span>
              </button>

              {selectedTemplateId !== 'custom' && (
                <button
                  onClick={handleResetToCurrentTemplate}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-transparent hover:bg-white/5 text-[#F5F5F5] hover:text-[#E5C158] text-xs font-bold uppercase tracking-wider rounded-none border border-white/20 hover:border-[#E5C158] transition-all"
                  id="btn-reset-template"
                  title="Reset metric adjustments"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Revert Preset</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Master Panel Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
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
              {templates.map((tmpl) => {
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

          {/* Core Data Pasting Section */}
          <section id="importer-section" className="animate-slideIn">
            <DataImporter
              onDataLoaded={handleCustomDataLoaded}
              currentSourceName={data?.sourceName}
            />
          </section>

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
                {/* 1. KPIs Section */}
                <section id="kpis-section">
                  <KPIStats
                    data={data}
                    kpis={kpis}
                    onKPIsChange={setKPIs}
                  />
                </section>

                {/* 2. Charts Visualization Section */}
                <section id="charts-section">
                  <DashboardCharts
                    data={data}
                    charts={charts}
                    onChartsChange={setCharts}
                  />
                </section>

                {/* 3. Data Grid Explorer Section */}
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
                Paste raw comma or tab-separated data into the clipboard interpreter above to construct interactive metrics and custom layouts.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Footer Branding */}
      <footer className="text-center py-8 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 max-w-7xl mx-auto w-full px-4 border-t border-white/10 mt-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p>FUTURES PROP • REAL-TIME DATA COMPILER</p>
        <p className="font-mono text-[#E5C158]">OPERATING IN CLIENT-SIDE CONTAINER</p>
      </footer>

      {/* Backup and Custom Code Dialog */}
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
    </div>
  );
}
