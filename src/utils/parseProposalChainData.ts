import { ProposalStatus, ProposalStatusLabels } from './constants.js';

interface RawChainData {
  creator: string;  // e.g., "aleo1dv6fre2y82gzw58aqga20v8mkjcjm8dj77s8fjfnnflcuhhx6y8qp9ml66"
  status: string;   // e.g., "0u8", "1u8"
}

interface ParsedChainData {
  creator: string;
  status: string;   // e.g., "Pending", "Active", "Unknown"
}

export function parseProposalChainData(raw: RawChainData): ParsedChainData {
  // 1. Parse status: Remove 'u8' and convert to number to map to the enum
  const statusCode = parseInt(raw.status.replace('u8', ''), 10) as ProposalStatus;
  
  // 2. Look up the human-readable label or fallback to 'Unknown'
  const status = ProposalStatusLabels[statusCode] || 'Unknown';

  return {
    creator: raw.creator,
    status,
  };
}