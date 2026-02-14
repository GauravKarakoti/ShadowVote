import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

export const CURRENT_NETWORK: WalletAdapterNetwork = WalletAdapterNetwork.TestnetBeta;
export const CURRENT_RPC_URL = "https://testnetbeta.aleorpc.com";

export type NextPageWithLayout<P = {}> = NextPage<P> & {
  authorization?: boolean;
  getLayout?: (page: ReactElement) => ReactNode;
};

export type VoteData = {
  proposalId: number;
  voterAddress: string;
  voteOption: number;
};

export type ProposalData = {
  id: number;
  title: string; // Note: The contract uses 'description' as a field. This might need mapping.
  description: string;
  creatorAddress: string;
  deadline: number;
  isActive: boolean;
  quorum: number;
  isFinalized: boolean;
  winningOption?: number;
  votes?: VoteData[];
  // ADDED: Options array matching the contract's structure
  options: string[]; 
};

export const SHADOWVOTE_PROGRAM_ID = 'shadow_vote_v3.aleo';
export const USDC_PROGRAM_ID = 'test_usdcx_stablecoin.aleo';