export type ColumnType = 'number' | 'string' | 'date';

export interface ColumnInfo {
  name: string;
  type: ColumnType;
}

export interface ParsedData {
  columns: ColumnInfo[];
  rows: Record<string, any>[];
  sourceName: string;
}

export interface KPIConfig {
  id: string;
  title: string;
  column: string;
  type: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'win_rate' | 'profit_factor' | 'max_drawdown' | 'current_balance' | 'daily_loss';
  format: 'currency' | 'number' | 'percent';
  color: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'stacked-bar' | 'area' | 'pie';
  xAxisKey: string;
  yAxisKey: string;
  color: string;
}

export interface DashboardState {
  data: ParsedData | null;
  kpis: KPIConfig[];
  charts: ChartConfig[];
}

export interface AccountConfig {
  startingBalance: number;
  profitTarget: number;
  dailyLossLimit: number;
  trailingDrawdown: number;
  consistencyLimit: number;
}