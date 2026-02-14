// FIX: Import TransactionOptions from aleo-types
import { TransactionOptions } from "@provablehq/aleo-types";

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
): Promise<TransactionOptions> { // FIX: Return TransactionOptions
  const amountMicro = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));

  const inputs = [
    recipient, 
    `${amountMicro}u64`, 
  ];

  // FIX: Return plain object
  return {
    program: USDCX_PROGRAM_ID,
    function: "transfer_private",
    inputs: inputs,
    fee: 2_000_000 // Standard fee
  };
}

/**
 * Creates a transaction to mint USDCx (publicly) - mostly for testing/faucets
 * or bridging logic if applicable.
 */
export async function createMintsPublicTransaction(
  recipient: string,
  amount: number
): Promise<TransactionOptions> { // FIX: Return TransactionOptions
    const amountMicro = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));
    
    // FIX: Return plain object
    return {
        program: USDCX_PROGRAM_ID,
        function: "mint_public",
        inputs: [recipient, `${amountMicro}u64`],
        fee: 2_000_000
    };
}