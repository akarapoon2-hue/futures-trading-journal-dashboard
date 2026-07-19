// =============================================
// src/constants/trading.ts
// Trading constants and shared types
// =============================================

export type Direction = 'LONG' | 'SHORT';

export type Result =
  | 'Win'
  | 'Loss'
  | 'Break Even'
  | 'Miss Entry';

export type SymbolConfig = {
  symbol: string;
  pointValue: number;
  tickSize: number;
  tickValue: number;
};

export const SYMBOL_CONFIG: Record<string, SymbolConfig> = {
  MNQ: {
    symbol: 'MNQ',
    pointValue: 2,
    tickSize: 0.25,
    tickValue: 0.5,
  },
  NQ: {
    symbol: 'NQ',
    pointValue: 20,
    tickSize: 0.25,
    tickValue: 5,
  },
  MES: {
    symbol: 'MES',
    pointValue: 5,
    tickSize: 0.25,
    tickValue: 1.25,
  },
  ES: {
    symbol: 'ES',
    pointValue: 50,
    tickSize: 0.25,
    tickValue: 12.5,
  },
  MGC: {
    symbol: 'MGC',
    pointValue: 10,
    tickSize: 0.1,
    tickValue: 1,
  },
  GC: {
    symbol: 'GC',
    pointValue: 100,
    tickSize: 0.1,
    tickValue: 10,
  },
  MYM: {
    symbol: 'MYM',
    pointValue: 0.5,
    tickSize: 1,
    tickValue: 0.5,
  },
  YM: {
    symbol: 'YM',
    pointValue: 5,
    tickSize: 1,
    tickValue: 5,
  },
  MCL: {
    symbol: 'MCL',
    pointValue: 100,
    tickSize: 0.01,
    tickValue: 1,
  },
  CL: {
    symbol: 'CL',
    pointValue: 1000,
    tickSize: 0.01,
    tickValue: 10,
  },
};

export const SYMBOL_OPTIONS: string[] =
  Object.keys(SYMBOL_CONFIG);

export const DIRECTION_OPTIONS: Array<{
  value: Direction;
  label: string;
}> = [
  { value: 'LONG', label: 'Long' },
  { value: 'SHORT', label: 'Short' },
];

export const RESULT_OPTIONS: Result[] = [
  'Win',
  'Loss',
  'Break Even',
  'Miss Entry',
];

export const SESSION_OPTIONS: string[] = [
  'Asia',
  'London',
  'New York AM',
  'New York PM',
  'Kill Zone',
  'Pre-Market',
  'Post-Market',
  'Custom',
];

// ✅ แก้ไข SETUP_OPTIONS
export const SETUP_OPTIONS: string[] = [
  'Follow External',
  'Follow Internal',
  'Reversal External',
  'Reversal Internal',
  'Order Block',
];

export const EMOTION_OPTIONS: Array<{
  value: string;
  label: string;
}> = [
  { value: 'Calm', label: 'Calm' },
  { value: 'Confident', label: 'Confident' },
  { value: 'Neutral', label: 'Neutral' },
  { value: 'Nervous', label: 'Nervous' },
  { value: 'Fear', label: 'Fear' },
  { value: 'FOMO', label: 'FOMO' },
  { value: 'Revenge', label: 'Revenge Trading' },
];

export const MISTAKE_OPTIONS: string[] = [
  'No Mistake',
  'FOMO',
  'Overtrade',
  'Moved Stop Loss',
  'No Stop Loss',
  'Early Exit',
  'Late Entry',
  'Oversized Position',
  'News Trade',
  'Did Not Follow Plan',
  'Custom',
];