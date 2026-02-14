import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';
// FIX: Import Network from aleo-types
import { Network } from '@provablehq/aleo-types'; 

// FIX: Update usage to Network.Testnet (or appropriate enum member)
export const CURRENT_NETWORK: Network = Network.TESTNET;
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
  title: string; 
  description: string;
  creatorAddress: string;
  deadline: number;
  isActive: boolean;
  quorum: number;
  isFinalized: boolean;
  winningOption?: number;
  votes?: VoteData[];
  options: string[]; 
};

export const SHADOWVOTE_PROGRAM_ID = 'shadow_vote_v3.aleo';
export const USDC_PROGRAM_ID = 'test_usdcx_stablecoin.aleo';