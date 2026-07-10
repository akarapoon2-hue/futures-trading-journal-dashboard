import React, { useState, useRef, useEffect } from 'react';
import { Upload, Clipboard, Check, AlertCircle, Sparkles, Link, RefreshCw, Radio } from 'lucide-react';
import { ParsedData, ColumnInfo, ColumnType } from '../types';

interface DataImporterProps {
  onDataLoaded: (data: ParsedData) => void;
  currentSourceName?: string;
}

export default function DataImporter({ onDataLoaded, currentSourceName }: DataImporterProps) {
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Sheet states
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('prop_firm_gsheet_url') || '');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('prop_firm_gsheet_autosync') === 'true');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Handle auto-sync interval
  useEffect(() => {
    if (!autoSync || !sheetUrl) return;

    // Trigger initial fetch
    fetchGoogleSheet(sheetUrl, true);

    const intervalId = setInterval(() => {
      fetchGoogleSheet(sheetUrl, true);
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(intervalId);
  }, [autoSync, sheetUrl]);

  const parseRawText = (text: string, sourceName: string) => {
    try {
      if (!text.trim()) {
        throw new Error('Please enter some data or upload a file.');
      }

      // Split into lines and filter out empty lines
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        throw new Error('Data must contain at least a header row and one data row.');
      }

      // Determine delimiter: detect tabs (common for copy-paste from Google Sheets) or commas
      const firstLine = lines[0];
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const delimiter = tabCount >= commaCount ? '\t' : ',';

      // Parse headers
      const headers = splitLine(firstLine, delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
      if (headers.some(h => !h)) {
        throw new Error('Some columns are missing header names. Please ensure all columns have a header.');
      }

      const rows: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = splitLine(lines[i], delimiter);
        const rowObj: Record<string, any> = {};
        
        headers.forEach((header, index) => {
          let value = cells[index] !== undefined ? cells[index].trim() : '';
          value = value.replace(/^["']|["']$/g, '');
          rowObj[header] = value;
        });
        
        rows.push(rowObj);
      }

      // Infer Column Types
      const columns: ColumnInfo[] = headers.map(header => {
        let numCount = 0;
        let dateCount = 0;
        let filledCount = 0;

        rows.forEach(row => {
          const val = row[header];
          if (val !== undefined && val !== '') {
            filledCount++;
            
            const cleanedVal = val.replace(/[\$,%\s]/g, '');
            if (!isNaN(Number(cleanedVal)) && cleanedVal !== '') {
              numCount++;
            }
            
            const isDatePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(val) || 
                                  /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(val);
            if (isDatePattern && !isNaN(Date.parse(val))) {
              dateCount++;
            }
          }
        });

        let type: ColumnType = 'string';
        if (filledCount > 0) {
          if (numCount / filledCount >= 0.8) {
            type = 'number';
          } else if (dateCount / filledCount >= 0.8) {
            type = 'date';
          }
        }

        return { name: header, type };
      });

      // Post-process rows: convert number columns to real javascript numbers
      const formattedRows = rows.map(row => {
        const newRow = { ...row };
        columns.forEach(col => {
          if (col.type === 'number') {
            const val = row[col.name];
            if (val !== undefined && val !== '') {
              const cleaned = val.replace(/[\$,\s%]/g, '');
              newRow[col.name] = Number(cleaned);
            } else {
              newRow[col.name] = 0;
            }
          }
        });
        return newRow;
      });

      onDataLoaded({
        columns,
        rows: formattedRows,
        sourceName
      });

      setError(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to parse spreadsheet data.');
    }
  };

  // Helper to split CSV/TSV correctly respecting double quotes
  const splitLine = (line: string, delimiter: string): string[] => {
    if (delimiter === '\t') {
      return line.split('\t');
    }
    
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseRawText(text, file.name);
    };
    reader.onerror = () => {
      setError('Error reading file.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.name.endsWith('.tsv'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseRawText(text, file.name);
      };
      reader.readAsText(file);
    } else {
      setError('Please drop a valid CSV or TSV file.');
    }
  };

  // Google Sheet Link fetcher
  const fetchGoogleSheet = async (urlToFetch: string, isSilent = false) => {
    if (!urlToFetch) return;
    
    let targetUrl = urlToFetch.trim();
    
    // Auto-convert standard Google Sheet links to CSV published link if possible
    if (targetUrl.includes('docs.google.com/spreadsheets') && !targetUrl.includes('output=csv')) {
      // Extract sheet ID
      const matches = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (matches && matches[1]) {
        targetUrl = `https://docs.google.com/spreadsheets/d/${matches[1]}/pub?output=csv`;
      }
    }

    if (!isSilent) setIsFetchingSheet(true);
    setError(null);

    try {
      // Fetch public csv content
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error('Network response failed. Ensure your Google Sheet is Published to the Web as CSV.');
      }
      
      const csvText = await response.text();
      parseRawText(csvText, 'Google Sheet (Synced)');
      
      localStorage.setItem('prop_firm_gsheet_url', urlToFetch.trim());
      setLastSyncedTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      if (!isSilent) {
        setError(`Google Sheet Sync Error: ${err.message || 'Check if link is published as CSV and accessible.'}`);
      }
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const handleConnectSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;
    fetchGoogleSheet(sheetUrl);
  };

  const toggleAutoSync = () => {
    const nextState = !autoSync;
    setAutoSync(nextState);
    localStorage.setItem('prop_firm_gsheet_autosync', String(nextState));
  };

  return (
    <div className="bg-[#121212] border border-white/10 rounded-none p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-wider text-[#E5C158] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#E5C158] animate-pulse" />
            เชื่อมโยง Google Sheets / เครื่องมือนำเข้าข้อมูล
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Connect your live Google Sheet directly or paste raw trading spreadsheet rows from Excel/Sheets.
          </p>
        </div>
        
        {currentSourceName && (
          <div className="px-3 py-1.5 bg-[#E5C158]/10 border border-[#E5C158]/20 text-[#E5C158] text-[10px] font-mono uppercase tracking-widest rounded-none self-start md:self-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E5C158] animate-pulse"></span>
            เชื่อมโยงอยู่: <span className="font-bold">{currentSourceName}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Google Sheet Live Connection */}
        <div className="bg-[#0A0A0A] border border-white/5 p-5 flex flex-col justify-between">
          <div>
            <label className="text-[10px] font-black text-[#E5C158] uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-[#E5C158]" />
              เชื่อม Google Sheets จริง
            </label>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
              กรอก URL ของ Google Sheet ที่เผยแพร่เป็นไฟล์ CSV เพื่อแสดงผลและอัปเดตข้อมูลแบบสด!
            </p>

            <form onSubmit={handleConnectSheet} className="space-y-3">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="w-full p-2.5 text-xs font-mono border border-white/10 rounded-none bg-[#121212] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
              />
              <button
                type="submit"
                disabled={isFetchingSheet || !sheetUrl.trim()}
                className="w-full py-2.5 px-4 bg-[#E5C158] hover:bg-[#C9A23E] text-black font-black uppercase tracking-wider text-[11px] rounded-none transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSheet ? 'animate-spin' : ''}`} />
                <span>{isFetchingSheet ? 'Syncing...' : 'เชื่อมต่อ Google Sheet'}</span>
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-white/5 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${autoSync ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="text-[10px] font-mono uppercase text-slate-400">อัปเดตอัตโนมัติ (Live Sync)</span>
              </div>
              <button
                onClick={toggleAutoSync}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoSync ? 'bg-emerald-500' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#0A0A0A] shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoSync ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {lastSyncedTime && (
              <p className="text-[9px] font-mono text-slate-500 text-right uppercase">
                อัปเดตล่าสุด: <span className="text-emerald-400 font-bold">{lastSyncedTime}</span>
              </p>
            )}
          </div>
        </div>

        {/* Paste Area */}
        <div className="flex flex-col h-full bg-[#0a0a0a]/50 p-5 border border-white/5">
          <label className="text-[10px] font-black text-[#E5C158] uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Clipboard className="w-3.5 h-3.5" />
            คัดลอก/วางเซลล์ข้อมูลโดยตรง
          </label>
          <div className="relative flex-1 flex flex-col justify-between">
            <textarea
              className="w-full flex-1 p-2.5 text-[10px] font-mono border border-white/10 rounded-none bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158] resize-none min-h-[100px]"
              placeholder="Date&#9;Symbol&#9;Direction&#9;Setup&#9;P&L&#10;2026-07-01&#9;MNQ&#9;Long&#9;ICT Silver Bullet&#9;1250&#10;...คัดลอกเซลล์จาก Google Sheets และกด Ctrl+V ที่นี่!"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              id="spreadsheet-paste-area"
            />
            <button
              onClick={() => {
                parseRawText(pasteText, 'คัดลอกเซลล์วาง (Pasted Cells)');
                setPasteText('');
              }}
              disabled={!pasteText.trim()}
              className="mt-3 w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-white rounded-none border border-white/15 hover:border-white/40 font-bold uppercase tracking-wider text-[11px] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              id="btn-process-pasted-data"
            >
              Analyze & Populate Journal
            </button>
          </div>
        </div>

        {/* Upload/Drag Area */}
        <div className="flex flex-col justify-between bg-[#0a0a0a]/50 p-5 border border-white/5">
          <div>
            <span className="text-[10px] font-black text-[#E5C158] uppercase tracking-widest mb-2 block flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              ลากและวางไฟล์สำรอง (.csv)
            </span>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-white/15 hover:border-[#E5C158] bg-[#0A0A0A] hover:bg-white/5 rounded-none p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[100px] group"
              id="file-drop-zone"
            >
              <Upload className="w-6 h-6 text-slate-500 group-hover:text-[#E5C158] transition-colors mb-2 group-hover:scale-110 transform duration-300" />
              <p className="text-[10px] font-black uppercase tracking-wider text-[#F5F5F5]">อัปโหลดไฟล์สำรองข้อมูล</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Supports CSV, TSV or trading exports</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="file-uploader-input"
              />
            </div>
          </div>

          <div className="p-3 bg-[#0A0A0A] border border-white/5 rounded-none text-[10px] text-slate-400 flex flex-col gap-1 font-mono">
            <p className="font-bold text-[#E5C158] uppercase tracking-widest flex items-center gap-1">
              คู่มือแชร์ Google Sheet:
            </p>
            <p className="leading-relaxed">
              1. ใน Google Sheet กด <strong>ไฟล์ (File) &gt; แชร์ (Share) &gt; เผยแพร่ทางเว็บ (Publish to web)</strong>
            </p>
            <p className="leading-relaxed">
              2. เลือกชีตของคุณและเปลี่ยนจาก "หน้าเว็บ" เป็น <strong>"ค่าที่คั่นด้วยจุลภาค (.csv)"</strong>
            </p>
            <p className="leading-relaxed">
              3. กดเผยแพร่ คัดลอกลิงก์มาวางในช่อง <strong>เชื่อม Google Sheets</strong> ด้านบน
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mt-4 p-4 bg-transparent border border-rose-500/40 text-rose-400 text-xs font-mono rounded-none flex items-start gap-3.5 animate-fadeIn" id="importer-error-alert">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider">เกิดข้อผิดพลาดในการนำเข้า</p>
            <p className="opacity-90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-transparent border border-emerald-500/40 text-emerald-400 text-xs font-mono rounded-none flex items-center gap-3.5 animate-fadeIn" id="importer-success-alert">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold uppercase tracking-wider">อัปโหลดและอัปเดตข้อมูลสำเร็จ // ทำการซิงค์ข้อมูลกับแดชบอร์ดแล้ว</span>
        </div>
      )}
    </div>
  );
}
