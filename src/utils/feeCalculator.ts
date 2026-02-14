export interface FeeMapping {
    [functionName: string]: number;
}

export const defaultFeeValues: FeeMapping = {
    transfer_public: 0.04406,
    transfer_private: 0.04406,
    // Added fees based on typical Aleo functionality costs (estimates)
    cast_vote: 0.1,         // Complex transaction with Merkle proof
    create_proposal: 0.5,   // Storage heavy
    tally_proposal: 0.2,    // Computation heavy
    cancel_proposal: 0.05,
    close_proposal: 0.05,
};

export function getFeeForFunction(functionName: string): number {
    const feeInCredits = defaultFeeValues[functionName];
    if (feeInCredits === undefined) {
      // Fallback or throw
      console.warn(`No fee defined for ${functionName}, using default 1.0`);
      return 1_000_000;
    }
    return feeInCredits * 1_000_000;
}