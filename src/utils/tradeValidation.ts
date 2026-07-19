// =============================================
// src/utils/tradeValidation.ts
// Shared trade form validation
// =============================================

import {
  SYMBOL_CONFIG,
  type Direction,
  type Result,
} from '../constants/trading';

export type TradeValidationInput = {
  accountId: string;
  userId: string;
  tradeDate: string;
  symbol: string;
  direction: Direction;

  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  contracts: number;

  result: Result;

  grossPnL: number;  // ✅ เพิ่ม
  netPnL: number;
  risk: number;
};

export type TradeValidationResult = {
  isValid: boolean;
  error?: string;
};

export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function invalid(error: string): TradeValidationResult {
  return {
    isValid: false,
    error,
  };
}

export function validateTrade(
  input: TradeValidationInput
): TradeValidationResult {
  const symbol = input.symbol.trim().toUpperCase();

  if (!input.accountId) {
    return invalid('ไม่พบ Trading Account');
  }

  if (!input.userId) {
    return invalid('ไม่พบ User ID กรุณาเข้าสู่ระบบใหม่');
  }

  if (!isValidUUID(input.accountId)) {
    return invalid('Account ID ไม่ถูกต้อง');
  }

  if (!isValidUUID(input.userId)) {
    return invalid('User ID ไม่ถูกต้อง');
  }

  if (!input.tradeDate) {
    return invalid('กรุณาเลือกวันที่เทรด');
  }

  if (!symbol || !SYMBOL_CONFIG[symbol]) {
    return invalid(`Symbol "${symbol}" ไม่รองรับ`);
  }

  if (input.entryPrice <= 0) {
    return invalid('Entry Price ต้องมากกว่า 0');
  }

  if (input.exitPrice <= 0) {
    return invalid('Exit Price ต้องมากกว่า 0');
  }

  if (
    !Number.isInteger(input.contracts) ||
    input.contracts < 1
  ) {
    return invalid(
      'Contracts ต้องเป็นจำนวนเต็มและมากกว่าหรือเท่ากับ 1'
    );
  }

  if (input.stopLoss <= 0) {
    return invalid('กรุณากรอก Stop Loss');
  }

  if (
    input.direction === 'LONG' &&
    input.stopLoss >= input.entryPrice
  ) {
    return invalid(
      'สำหรับ Long ค่า Stop Loss ต้องน้อยกว่า Entry Price'
    );
  }

  if (
    input.direction === 'SHORT' &&
    input.stopLoss <= input.entryPrice
  ) {
    return invalid(
      'สำหรับ Short ค่า Stop Loss ต้องมากกว่า Entry Price'
    );
  }

  if (input.risk <= 0) {
    return invalid(
      'Risk ต้องมากกว่า 0 กรุณาตรวจสอบ Entry และ Stop Loss'
    );
  }

  // ✅ ใช้ grossPnL ตรวจสอบ Result
  if (input.result === 'Win' && input.grossPnL <= 0) {
    return invalid(
      'Result เป็น Win แต่ Gross P&L ต้องมากกว่า 0'
    );
  }

  if (input.result === 'Loss' && input.grossPnL >= 0) {
    return invalid(
      'Result เป็น Loss แต่ Gross P&L ต้องน้อยกว่า 0'
    );
  }

  if (
    (input.result === 'Break Even' ||
      input.result === 'Miss Entry') &&
    Math.abs(input.grossPnL) > 0.0001
  ) {
    return invalid(
      `${input.result} ต้องมี Gross P&L เท่ากับ 0`
    );
  }

  return {
    isValid: true,
  };
}