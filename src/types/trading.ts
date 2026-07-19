// =============================================
// src/types/trading.ts
// Type definitions for Trading Journal
// =============================================

export interface Trade {
  id: string;
  account_id: string;

  trade_date: string;
  trade_time: string;

  symbol: string;
  direction: string;

  entry: number;
  exit: number;
  stop_loss: number;

  contracts: number;

  gross_pnl: number;
  net_pnl: number;

  r_multiple: number;

  session: string;
  setup: string;
  strategy: string;

  notes: string;
}

export interface Account {
  id: string;
  user_id: string;

  name: string;
  prop_firm: string;

  starting_balance: number;
  current_balance: number;

  profit_target: number;
  daily_loss_limit: number;
  trailing_drawdown: number;

  consistency_limit: number;

  status: string;
}

// =============================================
// Utility Types
// =============================================

export type TradeInput = Omit<Trade, 'id' | 'account_id'>;
export type TradeUpdate = Partial<Omit<Trade, 'id' | 'account_id'>>;

export type AccountInput = Omit<Account, 'id' | 'user_id' | 'current_balance'>;
export type AccountUpdate = Partial<Omit<Account, 'id' | 'user_id'>>;

// =============================================
// Enums
// =============================================

export enum Direction {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum Session {
  AM_SESSION = 'AM Session',
  LONDON_OPEN = 'London Open',
  PM_SESSION = 'PM Session',
  ASIA_SESSION = 'Asia Session',
  KILL_ZONE = 'Kill Zone',
}

export enum Setup {
  ICT_SILVER_BULLET = 'ICT Silver Bullet',
  FVG_ENTRY = 'FVG Entry',
  VWAP_DEVIATION = 'VWAP Deviation',
  ORDER_BLOCK_BOUNCE = 'Order Block Bounce',
  LIQUIDITY_SWEEP = 'Liquidity Sweep',
  BREAKER = 'Breaker',
}

export enum Result {
  WIN = 'Win',
  LOSS = 'Loss',
  BREAK_EVEN = 'Break Even',
  MISS_ENTRY = 'Miss Entry',
}

export enum AccountStatus {
  ACTIVE = 'active',
  BREACHED = 'breached',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

// =============================================
// Dashboard & Metrics Types
// ✅ มีการ export DashboardMetrics ถูกต้อง
// =============================================

export interface DashboardMetrics {
  // Basic
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  
  // P&L
  totalPnL: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  expectancy: number;
  
  // Risk
  averageR: number;
  maxDrawdown: number;
  currentDrawdown: number;
  currentBalance: number;
  peakBalance: number;
  
  // Consistency
  highestProfitDay: number;
  consistency: number;
  
  // Targets
  profitTargetProgress: number;
  dailyLossUsage: number;
  drawdownBuffer: number;
  
  // Latest
  latestDayPnL: number;
  latestTradingDay: string;
}

// =============================================
// Filter & Sort Types
// =============================================

export interface TradeFilters {
  dateRange?: { start: string; end: string };
  symbols?: string[];
  setups?: string[];
  sessions?: string[];
  directions?: Direction[];
  result?: Result;
  minR?: number;
  maxR?: number;
}

export interface TradeSort {
  field: keyof Trade;
  direction: 'asc' | 'desc';
}