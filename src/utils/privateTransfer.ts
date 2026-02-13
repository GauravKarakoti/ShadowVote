import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { CURRENT_NETWORK } from '@/types/index.js';
import { getFeeForFunction } from '@/utils/feeCalculator.js';

export const CREDITS_PROGRAM_ID = 'credits.aleo';
export const TRANSFER_PRIVATE_FUNCTION = 'transfer_private';

export async function privateTransfer(
  wallet: LeoWalletAdapter,
  publicKey: string,
  targetAddress: string,
  amountInMicrocredits: number,
  setTxStatus: (status: string | null) => void
): Promise<string> {
  const formattedAmount = `${amountInMicrocredits}000000u64`; 

  const allRecords = await wallet.requestRecords(CREDITS_PROGRAM_ID);
  if (!allRecords || allRecords.length === 0) {
    throw new Error('No credits records found.');
  }

  const privateRecords = allRecords.filter(
    (record: any) => record.data?.microcredits && record.data.microcredits.endsWith('u64.private')
  );
  const unspentRecords = privateRecords.filter((record: any) => record.spent === false);

  if (unspentRecords.length === 0) {
    throw new Error('No unspent private records available.');
  }

  const extractValue = (valueStr: string): number => {
    const match = valueStr.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  
  const neededAmount = extractValue(formattedAmount);

  const transferCandidates = unspentRecords.filter((record: any) => {
    const recordValue = extractValue(record.data.microcredits);
    return recordValue >= neededAmount;
  });

  if (transferCandidates.length === 0) {
    throw new Error('No single record can cover the required transfer amount.');
  }

  const chosenRecord = transferCandidates[0];
  const txInputs = [chosenRecord, targetAddress, formattedAmount];
  const fee = getFeeForFunction(TRANSFER_PRIVATE_FUNCTION);

  const transaction = Transaction.createTransaction(
    publicKey,
    CURRENT_NETWORK,
    CREDITS_PROGRAM_ID,
    TRANSFER_PRIVATE_FUNCTION,
    txInputs,
    fee,
    true   
  );

  const txId = await wallet.requestTransaction(transaction);
  setTxStatus(`Private transfer submitted: ${txId}`);

  let finalized = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const status = await wallet.transactionStatus(txId);
    setTxStatus(`Attempt ${attempt + 1}: ${status}`);

    if (status === 'Finalized') {
      finalized = true;
      break;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }

  if (!finalized) {
    setTxStatus('Private transfer not finalized in time.');
    throw new Error('Private transfer not finalized in time.');
  } else {
    setTxStatus('Private transfer finalized.');
  }

  return txId;
}