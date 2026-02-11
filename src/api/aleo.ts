import { CURRENT_RPC_URL } from '@/types/index.js';

export async function submitVoteTransaction(proofResult: any): Promise<string> {
  // logic to broadcast the transaction using the RPC or Wallet Adapter
  // If 'proofResult' is a fully formed transaction object from the worker:
  try {
     const response = await fetch(`${CURRENT_RPC_URL}/testnet3/transaction/broadcast`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(proofResult),
     });
     
     if(!response.ok) {
         throw new Error("Failed to broadcast transaction");
     }
     
     const txId = await response.json();
     return txId;
  } catch (err) {
      console.error(err);
      throw err;
  }
}