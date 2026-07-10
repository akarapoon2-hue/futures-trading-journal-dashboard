import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronsUpDown, Calendar, Hash, CaseSensitive, Download, Filter, RefreshCw } from 'lucide-react';
import { ParsedData, ColumnInfo } from '../types';

interface DataTableProps {
  data: ParsedData;
}

export default function DataTable({ data }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default to 10 for better journal visibility

  // Filter states
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedSetup, setSelectedSetup] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null); // Reset sorting
      }
    } else {
      setSortColumn(columnName);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getColIcon = (type: ColumnInfo['type']) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3.5 h-3.5 text-slate-400" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-slate-400" />;
      default:
        return <CaseSensitive className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Extract unique symbols found in data
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>();
    data.rows.forEach(row => {
      const val = row['Symbol'] || row['symbol'] || row['Contract'] || '';
      if (val) symbols.add(String(val));
    });
    return Array.from(symbols).sort();
  }, [data.rows]);

  // Extract unique setups found in data
  const uniqueSetups = useMemo(() => {
    const setups = new Set<string>();
    data.rows.forEach(row => {
      const val = row['Setup'] || row['setup'] || row['Category'] || '';
      if (val) setups.add(String(val));
    });
    return Array.from(setups).sort();
  }, [data.rows]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSymbol('');
    setSelectedSetup('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Filter and sort the rows
  const processedRows = useMemo(() => {
    let result = [...data.rows];

    // 1. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(row => {
        return Object.values(row).some(val => 
          String(val).toLowerCase().includes(q)
        );
      });
    }

    // 2. Filter by Symbol
    if (selectedSymbol) {
      result = result.filter(row => {
        const val = row['Symbol'] || row['symbol'] || row['Contract'] || '';
        return String(val) === selectedSymbol;
      });
    }

    // 3. Filter by Setup
    if (selectedSetup) {
      result = result.filter(row => {
        const val = row['Setup'] || row['setup'] || row['Category'] || '';
        return String(val) === selectedSetup;
      });
    }

    // 4. Filter by Date range
    if (startDate) {
      const startMs = Date.parse(startDate);
      if (!isNaN(startMs)) {
        result = result.filter(row => {
          const rDateStr = row['Date'] || row['date'] || '';
          const rMs = Date.parse(rDateStr);
          return !isNaN(rMs) && rMs >= startMs;
        });
      }
    }
    if (endDate) {
      const endMs = Date.parse(endDate);
      if (!isNaN(endMs)) {
        result = result.filter(row => {
          const rDateStr = row['Date'] || row['date'] || '';
          const rMs = Date.parse(rDateStr);
          return !isNaN(rMs) && rMs <= endMs;
        });
      }
    }

    // 5. Sort rows
    if (sortColumn) {
      const colType = data.columns.find(c => c.name === sortColumn)?.type;
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === undefined || valA === '') return 1;
        if (valB === undefined || valB === '') return -1;

        if (colType === 'number') {
          return sortDirection === 'asc' 
            ? Number(valA) - Number(valB)
            : Number(valB) - Number(valA);
        } else if (colType === 'date') {
          return sortDirection === 'asc'
            ? Date.parse(valA) - Date.parse(valB)
            : Date.parse(valB) - Date.parse(valA);
        } else {
          return sortDirection === 'asc'
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return result;
  }, [data.rows, data.columns, searchQuery, selectedSymbol, selectedSetup, startDate, endDate, sortColumn, sortDirection]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedRows.slice(startIndex, startIndex + pageSize);
  }, [processedRows, currentPage, pageSize]);

  const totalPages = Math.ceil(processedRows.length / pageSize) || 1;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getSortIcon = (columnName: string) => {
    if (sortColumn !== columnName) {
      return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 text-slate-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 text-[#E5C158] font-bold" />
      : <ChevronDown className="w-3.5 h-3.5 text-[#E5C158] font-bold" />;
  };

  // Export current filtered rows to CSV
  const handleExportCSV = () => {
    try {
      const headerNames = data.columns.map(c => c.name);
      const csvRows = [headerNames.join(',')];

      processedRows.forEach(row => {
        const values = data.columns.map(col => {
          const val = row[col.name];
          const escaped = String(val !== undefined ? val : '').replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `trading_journal_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Could not export CSV data.');
    }
  };

  // Check if active filters are applied
  const isFilterActive = searchQuery || selectedSymbol || selectedSetup || startDate || endDate;

  return (
    <div className="bg-[#121212] rounded-none border border-white/10 p-6 space-y-6">
      {/* Table Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#E5C158] flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#E5C158]"></span>
            รายการเทรดทั้งหมด (Futures Trading Log)
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 uppercase font-mono tracking-wider">
            Audit logs and performance coordinates from your spreadsheet dataset.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-transparent hover:bg-white/5 text-[#E5C158] text-xs font-bold uppercase tracking-wider border border-[#E5C158]/30 hover:border-[#E5C158] transition-all rounded-none"
            title="Export spreadsheet entries"
            id="btn-export-csv"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-white/5 text-rose-400 hover:text-rose-300 text-xs font-mono uppercase rounded-none border border-rose-500/20 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-2 border border-white/10 rounded-none text-xs font-mono bg-[#0A0A0A] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158]"
            id="table-size-select"
          >
            <option value={5}>5 ROWS / PG</option>
            <option value={10}>10 ROWS / PG</option>
            <option value={25}>25 ROWS / PG</option>
            <option value={50}>50 ROWS / PG</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-[#0A0A0A] p-4 border border-white/5">
        {/* Date Filters */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[9px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#E5C158]" /> Filter วันที่ (Date Range)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 border border-white/10 text-[11px] font-mono bg-[#121212] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158] w-full"
              placeholder="Start"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 border border-white/10 text-[11px] font-mono bg-[#121212] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158] w-full"
              placeholder="End"
            />
          </div>
        </div>

        {/* Symbol Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-mono uppercase text-slate-400">Filter Symbol</label>
          <select
            value={selectedSymbol}
            onChange={(e) => {
              setSelectedSymbol(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-white/10 text-[11px] font-mono bg-[#121212] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158] w-full"
          >
            <option value="">ALL SYMBOLS</option>
            {uniqueSymbols.map(sym => (
              <option key={sym} value={sym}>{sym.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Setup Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-mono uppercase text-slate-400">Filter Setup</label>
          <select
            value={selectedSetup}
            onChange={(e) => {
              setSelectedSetup(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-white/10 text-[11px] font-mono bg-[#121212] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158] w-full"
          >
            <option value="">ALL SETUPS</option>
            {uniqueSetups.map(setup => (
              <option key={setup} value={setup}>{setup}</option>
            ))}
          </select>
        </div>

        {/* Text Query Filter */}
        <div className="flex flex-col gap-1 justify-end">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search keyword..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 border border-white/10 text-[11px] font-mono bg-[#121212] text-[#F5F5F5] focus:outline-none focus:border-[#E5C158] w-full"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border border-white/10 rounded-none">
        <table className="w-full text-left border-collapse" id="data-explorer-table">
          <thead>
            <tr className="bg-[#0A0A0A] border-b border-white/10">
              {data.columns.map((col) => (
                <th
                  key={col.name}
                  onClick={() => handleSort(col.name)}
                  className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-white/5 hover:text-[#F5F5F5] select-none transition-colors border-r border-white/10 last:border-r-0"
                >
                  <div className="flex items-center gap-2">
                    {getColIcon(col.type)}
                    <span className="truncate max-w-[150px] font-mono">{col.name}</span>
                    {getSortIcon(col.name)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs font-mono text-slate-300">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={data.columns.length} className="text-center py-12 text-slate-500 uppercase tracking-wider text-[11px]">
                  No matching entries located in registry cache.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  {data.columns.map((col) => {
                    const cellVal = row[col.name];
                    const isPLCol = col.name.toLowerCase() === 'p&l' || col.name.toLowerCase() === 'revenue' || col.name.toLowerCase() === 'profit/loss';
                    const isDirectionCol = col.name.toLowerCase() === 'direction' || col.name.toLowerCase() === 'type';
                    const isRMultipleCol = col.name.toLowerCase() === 'r-multiple' || col.name.toLowerCase() === 'r_multiple';

                    return (
                      <td key={col.name} className="px-4 py-3.5 border-r border-white/5 last:border-r-0 max-w-[200px] truncate">
                        {isPLCol && typeof cellVal === 'number' ? (
                          <span className={cellVal > 0 ? "text-emerald-400 font-bold" : cellVal < 0 ? "text-rose-400 font-bold" : "text-slate-400"}>
                            {cellVal > 0 ? '+' : ''}
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cellVal)}
                          </span>
                        ) : isDirectionCol ? (
                          <span className={`px-2 py-0.5 text-[10px] font-bold ${
                            String(cellVal).toLowerCase() === 'long' || String(cellVal).toLowerCase() === 'buy'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {String(cellVal).toUpperCase()}
                          </span>
                        ) : isRMultipleCol && typeof cellVal === 'number' ? (
                          <span className={cellVal > 0 ? "text-emerald-400 font-bold" : cellVal < 0 ? "text-rose-400 font-bold" : "text-slate-400"}>
                            {cellVal > 0 ? `+${cellVal.toFixed(1)}R` : `${cellVal.toFixed(1)}R`}
                          </span>
                        ) : col.type === 'number' && typeof cellVal === 'number' ? (
                          <span className="text-slate-200 font-black">
                            {cellVal.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </span>
                        ) : col.type === 'date' ? (
                          <span className="text-slate-400 font-medium">{String(cellVal)}</span>
                        ) : (
                          <span className="text-[#F5F5F5]">{cellVal !== undefined ? String(cellVal) : '-'}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
          Showing {processedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, processedRows.length)} of {processedRows.length} RECORDS
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-white/10 hover:border-[#E5C158] text-slate-400 hover:text-white hover:bg-white/5 rounded-none disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-wider transition-all"
            id="btn-table-prev"
          >
            Prev
          </button>
          <span className="px-3 font-mono text-xs text-[#E5C158] font-bold">
            {currentPage} OF {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-white/10 hover:border-[#E5C158] text-slate-400 hover:text-white hover:bg-white/5 rounded-none disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-wider transition-all"
            id="btn-table-next"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
