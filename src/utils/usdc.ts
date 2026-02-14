import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

export const USDCX_PROGRAM_ID = "test_usdcx_stablecoin.aleo"; 

export const USDC_DECIMALS = 6;

/**
 * Creates a transaction to transfer USDCx privately.
 * @param recipient The Aleo address of the recipient.
 * @param amount The amount of USDCx to send (in human readable format, e.g., 10.5).
 */
export async function createUSDCxTransferTransaction(
  recipient: string,
  amount: number
): Promise<Transaction> {
  const amountMicro = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));

  const inputs = [
    recipient, 
    `${amountMicro}u64`, 
  ];

  return Transaction.createTransaction(
    recipient,
    WalletAdapterNetwork.TestnetBeta,
    USDCX_PROGRAM_ID,
    "transfer_private", // Assuming private transfer is the default goal
    inputs,
    2_000_000 // Standard fee, adjust as needed
  );
}

/**
 * Creates a transaction to mint USDCx (publicly) - mostly for testing/faucets
 * or bridging logic if applicable.
 */
export async function createMintsPublicTransaction(
  recipient: string,
  amount: number
): Promise<Transaction> {
    const amountMicro = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));
    
    return Transaction.createTransaction(
        recipient,
        WalletAdapterNetwork.TestnetBeta,
        USDCX_PROGRAM_ID,
        "mint_public",
        [recipient, `${amountMicro}u64`],
        2_000_000
    );
}