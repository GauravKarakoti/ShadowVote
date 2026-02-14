import React, { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
// Import types from aleo-types. Install if missing: npm install @provablehq/aleo-types
import { TransactionOptions } from '@provablehq/aleo-types';
import { SHADOWVOTE_PROGRAM_ID } from '@/types/index';

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
  // Destructure executeTransaction (new) or requestTransaction (old/alias)
  // Casting to 'any' helps bypass strict type checks if the react adapter types are slightly out of sync
  const { publicKey, requestTransaction, executeTransaction } = useWallet() as any;
  const [isProcessing, setIsProcessing] = useState(false);

  const isVotingEnded = currentBlock > endBlock;
  const isAdmin = publicKey === adminAddress;

  if (!publicKey) return null;

  const handleAction = async (action: 'cancel_proposal' | 'tally_proposal') => {
    // Check for availability of either method
    const submitTransaction = executeTransaction || requestTransaction;

    if (!submitTransaction) {
        alert("Wallet does not support transaction submission");
        return;
    }

    setIsProcessing(true);

    try {
      const inputs = [`${proposalId}u64`];
      const fee = 1_000_000; 
      
      // REPLACEMENT: Create a plain object instead of using Transaction.createTransaction
      const aleoTransaction: TransactionOptions = {
        program: SHADOWVOTE_PROGRAM_ID,
        function: action,
        inputs: inputs,
        fee: fee 
        // Note: You can add 'network: WalletAdapterNetwork.TestnetBeta' here if strictly required by your wallet version,
        // but typically the wallet handles the network selection.
      };

      // Submit the object directly
      const result = await submitTransaction(aleoTransaction);
      
      // Handle result (which might be an object { transactionId: ... } or a string ID)
      const txId = typeof result === 'string' ? result : result?.transactionId;

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