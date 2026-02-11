import React, { useState, useCallback } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { useMerkleProof } from '@/hooks/useMerkleProof.js'; 
import { buildVoteInputs, computeNullifier } from '@/utils/crypto.js';
import { getFeeForFunction } from '@/utils/feeCalculator.js'; // Ensure you have this helper

interface Props {
  proposalId: number;
  optionIndex: number;
  onSuccess?: () => void;
}

// Placeholder for new root calculation
function computeNewRoot(oldRoot: string, balance: number) {
  // In a real app, you must recalculate the Merkle root off-chain 
  // by simulating the removal of the leaf.
  return oldRoot; 
}

export const CastVoteButton: React.FC<Props> = ({ proposalId, optionIndex, onSuccess }) => {
  const { publicKey, decrypt, requestTransaction } = useWallet();
  const { proof, encryptedSalt, loading: proofLoading } = useMerkleProof(publicKey || null);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = useCallback(async () => {
    if (!publicKey || !proof || !encryptedSalt || !decrypt || !requestTransaction) return;

    setIsVoting(true);
    try {
      // 1. Decrypt salt
      const decryptedSaltString = await decrypt(encryptedSalt);
      const salt = BigInt(decryptedSaltString);

      // 2. Prepare inputs
      const inputs = await buildVoteInputs({
        proposalId,
        voteOption: optionIndex,
        balance: proof.balance,
        merklePath: proof.path,
        nullifier: computeNullifier(publicKey, proposalId, salt),
        oldRoot: proof.root,
        newRoot: computeNewRoot(proof.root, proof.balance),
        salt
      });

      // 3. Create Transaction Object
      const fee = getFeeForFunction('cast_vote') || 1_000_000; // Default fee if missing
      
      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta, // Ensure this matches your network
        'shadow_vote_v2.aleo',            // Program ID
        'cast_vote',                      // Transition Name
        inputs,
        fee
      );

      // 4. Request Wallet to Prove & Broadcast
      // The wallet extension will open, generate the zero-knowledge proof, and submit.
      const txId = await requestTransaction(aleoTransaction);
      
      console.log("Vote submitted with TxID:", txId);
      onSuccess?.();
      
    } catch (error) {
      console.error('Vote failed:', error);
      alert('Failed to cast vote. See console for details.');
    } finally {
      setIsVoting(false);
    }
  }, [publicKey, proof, encryptedSalt, decrypt, requestTransaction, proposalId, optionIndex, onSuccess]);

  return (
    <button
      onClick={handleVote}
      disabled={proofLoading || isVoting}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
    >
      {isVoting ? 'Sign & Vote in Wallet...' : 'Cast Private Vote'}
    </button>
  );
};