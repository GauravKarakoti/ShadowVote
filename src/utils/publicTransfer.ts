import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { CURRENT_NETWORK } from '@/types/index.js';
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

  const transTx = Transaction.createTransaction(
    publicKey,
    CURRENT_NETWORK,
    CREDITS_PROGRAM_ID,
    TRANSFER_PUBLIC_FUNCTION,
    transferInput,
    fee,
    true
  );

  const txId = await wallet.requestTransaction(transTx);
  setTxStatus(`Public transfer submitted: ${txId}`);

  let finalized = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const status = await wallet.transactionStatus(txId);
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