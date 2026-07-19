// =============================================
// src/utils/tradeCalculator.ts
// Shared futures trade calculations
// =============================================

import {
  SYMBOL_CONFIG,
  type Direction,
  type SymbolConfig,
} from '../constants/trading';

export type TradeCalculationInput = {
  symbol: string;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  contracts: number;
  fees: number;
};

export type TradeCalculationResult = {
  grossPnL: number;
  netPnL: number;
  risk: number;
  rMultiple: number;
  isSymbolSupported: boolean;
};

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getSymbolConfig(
  symbol: string
): SymbolConfig | null {
  const key = symbol.trim().toUpperCase();
  return SYMBOL_CONFIG[key] ?? null;
}

export function isSymbolSupported(symbol: string): boolean {
  return getSymbolConfig(symbol) !== null;
}

export function calculateGrossPnL(
  input: TradeCalculationInput
): number {
  const config = getSymbolConfig(input.symbol);

  if (!config) {
    return 0;
  }

  const entry = safeNumber(input.entryPrice);
  const exit = safeNumber(input.exitPrice);
  const contracts = safeNumber(input.contracts);

  if (entry <= 0 || exit <= 0 || contracts <= 0) {
    return 0;
  }

  const pointDifference =
    input.direction === 'LONG'
      ? exit - entry
      : entry - exit;

  return pointDifference * contracts * config.pointValue;
}

export function calculateNetPnL(
  grossPnL: number,
  fees: number
): number {
  return safeNumber(grossPnL) - safeNumber(fees);
}

export function calculateRisk(
  input: TradeCalculationInput
): number {
  const config = getSymbolConfig(input.symbol);

  if (!config) {
    return 0;
  }

  const entry = safeNumber(input.entryPrice);
  const stopLoss = safeNumber(input.stopLoss);
  const contracts = safeNumber(input.contracts);

  if (entry <= 0 || stopLoss <= 0 || contracts <= 0) {
    return 0;
  }

  const pointRisk =
    input.direction === 'LONG'
      ? entry - stopLoss
      : stopLoss - entry;

  if (pointRisk <= 0) {
    return 0;
  }

  return pointRisk * contracts * config.pointValue;
}

export function calculateRMultiple(
  netPnL: number,
  risk: number
): number {
  const safeRisk = safeNumber(risk);

  if (safeRisk <= 0) {
    return 0;
  }

  return safeNumber(netPnL) / safeRisk;
}

export function calculateAll(
  input: TradeCalculationInput
): TradeCalculationResult {
  const supported = isSymbolSupported(input.symbol);

  if (!supported) {
    return {
      grossPnL: 0,
      netPnL: 0,
      risk: 0,
      rMultiple: 0,
      isSymbolSupported: false,
    };
  }

  const grossPnL = calculateGrossPnL(input);
  const netPnL = calculateNetPnL(grossPnL, input.fees);
  const risk = calculateRisk(input);
  const rMultiple = calculateRMultiple(netPnL, risk);

  return {
    grossPnL,
    netPnL,
    risk,
    rMultiple,
    isSymbolSupported: true,
  };
}