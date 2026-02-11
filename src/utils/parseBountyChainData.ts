// utils/parseBountyChainData.ts

import { BountyStatusCode, BountyStatusLabels } from './constants';

interface RawChainData {
  creator: string;  // e.g., "aleo1dv6fre2y82gzw58aqga20v8mkjcjm8dj77s8fjfnnflcuhhx6y8qp9ml66"
  payment: string;  // e.g., "15u64"
  status: string;   // e.g., "0u8"
}

interface ParsedChainData {
  creator: string;
  payment: number;
  status: string; // e.g., "Open", "Completed", "Unknown"
}

export function parseBountyChainData(raw: RawChainData): ParsedChainData {
  // 1. Parse payment: Remove 'u64' and convert to number
  const payment = parseInt(raw.payment.replace('u64', ''), 10);

  // 2. Parse status: Remove 'u8' and map to label
  const statusCode = parseInt(raw.status.replace('u8', ''), 10) as BountyStatusCode;
  const status = BountyStatusLabels[statusCode] || 'Unknown';

  return {
    creator: raw.creator,
    payment,
    status,
  };
}
