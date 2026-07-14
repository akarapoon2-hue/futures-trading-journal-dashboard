import React, { useState, useCallback } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, Check, X } from 'lucide-react';
import { ParsedData } from '../types';

interface DataImporterProps {
  onDataLoaded: (data: ParsedData) => void;
  currentSourceName?: string;
}

export default function DataImporter({ 
  onDataLoaded, 
  currentSourceName 
}: DataImporterProps) {
  const [pasteText, setPasteText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Parse CSV/TSV data
  const parseData = useCallback((text: string): ParsedData | null => {
    try {
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('Data must have at least a header row and one data row');
      }

      // Detect delimiter (comma or tab)
      const firstLine = lines[0];
      const delimiter = firstLine.includes('\t') ? '\t' : ',';

      // Parse headers
      const headers = firstLine.split(delimiter).map(h => h.trim());
      
      // Parse rows
      const rows = lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.trim());
        const row: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      // Detect column types
      const columns = headers.map((name, index) => {
        const sampleValues = rows.slice(0, 100).map(row => row[name]);
        let type: 'string' | 'number' | 'date' = 'string';
        
        // Check if all sample values are numbers
        const allNumbers = sampleValues.every(v => {
          const num = parseFloat(String(v).replace(/[$,%\s,()]/g, ''));
          return !isNaN(num) && String(v).trim() !== '';
        });
        
        if (allNumbers && sampleValues.length > 0) {
          type = 'number';
        } else {
          // Check if all sample values are dates
          const allDates = sampleValues.every(v => {
            const date = new Date(String(v));
            return !isNaN(date.getTime()) && String(v).trim() !== '';
          });
          if (allDates && sampleValues.length > 0) {
            type = 'date';
          }
        }
        
        return { name, type };
      });

      return {
        sourceName: currentSourceName || 'Pasted Data',
        columns,
        rows
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to parse data');
    }
  }, [currentSourceName]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pasteText.trim()) {
      setError('Please paste some data first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const parsed = parseData(pasteText);
      if (parsed) {
        onDataLoaded(parsed);
        setSuccess(true);
        setPasteText('');
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse data');
    } finally {
      setIsLoading(false);
    }
  }, [pasteText, parseData, onDataLoaded]);

  const handleClear = useCallback(() => {
    setPasteText('');
    setError(null);
    setSuccess(false);
  }, []);

  return (
    <div className="bg-[#121212] border border-white/10 p-6 rounded-none space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#E5C158]" />
            Data Importer
          </h3>
          {currentSourceName && (
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Current Source: <span className="text-[#E5C158] font-bold">{currentSourceName}</span>
            </p>
          )}
        </div>
        
        {success && (
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono">
            <Check className="w-4 h-4" />
            Data loaded successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
            Paste CSV or TSV Data
          </label>
          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setError(null);
            }}
            placeholder="Paste your data here (CSV or TSV format)&#10;Example:&#10;Date,P&L,Symbol&#10;2024-01-01,1000,ES&#10;2024-01-02,-500,NQ"
            className="w-full h-48 p-3 text-[11px] font-mono border border-white/10 rounded-none bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158] resize-none"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!pasteText.trim() || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E5C158] hover:bg-[#C9A23E] text-black font-black uppercase tracking-wider text-xs rounded-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UploadCloud className="w-4 h-4 text-black" />
            {isLoading ? 'Loading...' : 'Import Data'}
          </button>
          
          {pasteText && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2.5 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-none border border-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </form>

      <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider border-t border-white/10 pt-3">
        Supports: CSV (comma-separated) or TSV (tab-separated) • First row must be headers
      </div>
    </div>
  );
}