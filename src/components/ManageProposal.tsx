import React, { useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { SHADOWVOTE_PROGRAM_ID } from '@/types/index'; // Import the ID constant

interface Props {
  proposalId: number;
  isActive: boolean;
  isFinalized?: boolean;
  adminAddress: string;
  endBlock: number;
  currentBlock: number;
}

export const ManageProposal: React.FC<Props> = ({ 
  proposalId, 
  isActive, 
  isFinalized, 
  adminAddress, 
  endBlock, 
  currentBlock 
}) => {
  const { publicKey, requestTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  // Conditions to render:
  // 1. Voting ended AND Proposal is not yet finalized -> Show "Tally" (Anyone can call, but usually admin)
  // 2. Voting active AND User is Admin -> Show "Cancel"
  
  const isVotingEnded = currentBlock > endBlock;
  const isAdmin = publicKey === adminAddress;

  if (!publicKey) return null;

  const handleAction = async (action: 'cancel_proposal' | 'tally_proposal') => {
    if (!requestTransaction) return;
    setIsProcessing(true);

    try {
      const inputs = [`${proposalId}u64`];
      const fee = 1_000_000; 
      
      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta, 
        SHADOWVOTE_PROGRAM_ID,            
        action,                      
        inputs,
        fee
      );

      const txId = await requestTransaction(aleoTransaction);
      console.log(`${action} submitted with TxID:`, txId);
      alert(`Transaction submitted! ID: ${txId}`);
    } catch (error) {
      console.error(`${action} failed:`, error);
      alert(`Failed to ${action}. Check console.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-2 mt-4">
      {/* Admin can cancel if still active and time remains */}
      {isActive && !isVotingEnded && isAdmin && (
        <button
          onClick={() => handleAction('cancel_proposal')}
          disabled={isProcessing}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50 transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Cancel Proposal'}
        </button>
      )}

      {/* Anyone can tally after voting ends, provided it's not already finalized */}
      {isVotingEnded && !isFinalized && (
        <button
          onClick={() => handleAction('tally_proposal')}
          disabled={isProcessing}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50 transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Tally Votes & Finalize'}
        </button>
      )}

      {isFinalized && (
        <div className="text-gray-500 font-semibold italic">
          Proposal Finalized
        </div>
      )}
    </div>
  );
};