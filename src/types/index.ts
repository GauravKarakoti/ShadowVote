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
  title: string;
  description: string;
  creatorAddress: string;
  deadline: number; // Block height
  isActive: boolean;
  // NEW FIELDS
  quorum: number;
  isFinalized: boolean;
  winningOption?: number; // Optional, only present if finalized
  votes?: VoteData[];
};

export const SHADOWVOTE_PROGRAM_ID = 'shadow_vote_v3.aleo';