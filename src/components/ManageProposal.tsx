import React, { useState } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

interface Props {
  proposalId: number;
  isActive: boolean;
  adminAddress: string;
  endBlock: number;
  currentBlock: number;
}

export const ManageProposal: React.FC<Props> = ({ proposalId, isActive, adminAddress, endBlock, currentBlock }) => {
  const { publicKey, requestTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  // Only show buttons if the connected wallet is the admin and the proposal is still active
  if (!publicKey || publicKey !== adminAddress || !isActive) return null;

  const handleAction = async (action: 'cancel_proposal' | 'close_proposal') => {
    if (!requestTransaction) return;
    setIsProcessing(true);

    try {
      const inputs = [`${proposalId}u64`];
      const fee = 1_000_000; // Adjust based on your network fee calculations
      
      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta, 
        'shadow_vote_v2.aleo',            
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

  const isVotingEnded = currentBlock > endBlock;

  return (
    <div className="flex gap-2 mt-4">
      {!isVotingEnded && (
        <button
          onClick={() => handleAction('cancel_proposal')}
          disabled={isProcessing}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Cancel Proposal'}
        </button>
      )}

      {isVotingEnded && (
        <button
          onClick={() => handleAction('close_proposal')}
          disabled={isProcessing}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Close & Finalize Tally'}
        </button>
      )}
    </div>
  );
};