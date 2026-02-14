import React, { useState, useCallback } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { useMerkleProof } from '@/hooks/useMerkleProof'; 
import { buildVoteInputs, computeNullifier } from '@/utils/crypto';
import { getFeeForFunction } from '@/utils/feeCalculator'; 

interface Props {
  proposalId: number;
  optionIndex: number;
  balance: number; // <--- ADDED: Pass the user's voting balance in as a prop
  onSuccess?: () => void;
}

// Placeholder for new root calculation
function computeNewRoot(oldRoot: string, balance: number) {
  // In a real app, you must recalculate the Merkle root off-chain 
  // by simulating the removal of the leaf.
  return oldRoot; 
}

export const CastVoteButton: React.FC<Props> = ({ proposalId, optionIndex, balance, onSuccess }) => {
  const { publicKey, decrypt, requestTransaction } = useWallet();
  // <--- EXTRACTION FIXED: Grab `root` from the hook
  const { proof, indices, encryptedSalt, root, loading: proofLoading } = useMerkleProof(publicKey || null);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = useCallback(async () => {
    // <--- NULL CHECK FIXED: Added `indices` and `root` to ensure they aren't null for TypeScript
    if (!publicKey || !proof || !indices || !encryptedSalt || !root || !decrypt || !requestTransaction) return;

    setIsVoting(true);
    try {
      // 1. Decrypt salt
      const decryptedSaltString = await decrypt(encryptedSalt);
      const salt = BigInt(decryptedSaltString);

      // 2. Prepare inputs
      const inputs = await buildVoteInputs({
        proposalId,
        voteOption: optionIndex,
        balance: balance,        // <--- BALANCE FIXED: Using the prop instead of proof.balance
        merklePath: proof, 
        pathIndices: indices, 
        nullifier: computeNullifier(publicKey, proposalId, salt),
        oldRoot: root,           // <--- ROOT FIXED: Using the root destructured from the hook
        newRoot: computeNewRoot(root, balance),
        salt
      });

      // 3. Create Transaction Object
      const fee = getFeeForFunction('cast_vote') || 1_000_000; 
      
      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta, 
        'shadow_vote_v3.aleo',            
        'cast_vote',                      
        inputs,
        fee
      );

      // 4. Request Wallet to Prove & Broadcast
      const txId = await requestTransaction(aleoTransaction);
      
      console.log("Vote submitted with TxID:", txId);
      onSuccess?.();
      
    } catch (error) {
      console.error('Vote failed:', error);
      alert('Failed to cast vote. See console for details.');
    } finally {
      setIsVoting(false);
    }
  }, [publicKey, proof, indices, encryptedSalt, root, decrypt, requestTransaction, proposalId, optionIndex, balance, onSuccess]);

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