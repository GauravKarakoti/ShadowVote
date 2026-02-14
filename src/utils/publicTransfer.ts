// FIX: Remove Transaction import
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
// FIX: Import TransactionOptions
import { TransactionOptions } from '@provablehq/aleo-types';
import { getFeeForFunction } from '@/utils/feeCalculator.js';

export const CREDITS_PROGRAM_ID = 'credits.aleo';
export const TRANSFER_PUBLIC_FUNCTION = 'transfer_public';

export async function publicTransfer(
  wallet: LeoWalletAdapter,
  publicKey: string,
  targetAddress: string,
  amountInMicrocredits: number,
  setTxStatus: (status: string | null) => void
): Promise<string> {
  const formattedAmount = `${amountInMicrocredits}000000u64`;

  setTxStatus('Initiating public transfer...');

  const transferInput = [targetAddress, formattedAmount];
  const fee = getFeeForFunction(TRANSFER_PUBLIC_FUNCTION);

  // FIX: Create plain object instead of Transaction class instance
  const transaction: TransactionOptions = {
    program: CREDITS_PROGRAM_ID,
    function: TRANSFER_PUBLIC_FUNCTION,
    inputs: transferInput,
    fee: fee,
    // The previous 'true' argument likely referred to feePrivate or similar settings.
    // If you need the fee to be private, you can try adding:
    // feePrivate: true 
  };

  // FIX: Use executeTransaction which returns { transactionId: string }
  const result = await wallet.executeTransaction(transaction);
  const txId = result.transactionId;
  
  setTxStatus(`Public transfer submitted: ${txId}`);

  let finalized = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const statusResponse = await wallet.transactionStatus(txId);
    
    // FIX: Ensure status is a string for comparison
    const status = String(statusResponse);
    
    if (status === 'Finalized') {
      finalized = true;
      break;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }

  if (!finalized) {
    throw new Error('Public transfer not finalized in time.');
  }

  setTxStatus('Public transfer finalized.');
  return txId;
}