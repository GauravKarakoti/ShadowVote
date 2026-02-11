// Helper to format BigInt/numbers to Aleo field strings
const toField = (val: string | number | bigint) => `${val}field`;
const toU64 = (val: string | number | bigint) => `${val}u64`;
const toU8 = (val: string | number | bigint) => `${val}u8`;

export async function buildVoteInputs(params: {
  proposalId: number;
  voteOption: number;
  balance: number;
  merklePath: string[]; // Array of decimal strings from indexer
  nullifier: bigint;
  oldRoot: string;
  newRoot: string;
  salt: bigint;
}) {
  // Format the Merkle path as a standard Aleo array string: "[1field, 2field, ...]"
  const pathString = `[${params.merklePath.map((p) => toField(p)).join(', ')}]`;

  // Return the array of strings exactly as the Leo transition expects
  return [
    toU64(params.proposalId),
    toU8(params.voteOption),
    toU64(params.balance),
    pathString,           // merkle_path: [field; 20]
    toField(params.nullifier),
    toField(params.oldRoot),
    toField(params.newRoot),
    toField(params.salt)
  ];
}

export function computeNullifier(address: string, proposalId: number, salt: bigint): bigint {
  // In a real app, use the Poseidon hash from the SDK or a WASM module.
  // This is a placeholder as used previously.
  // Ideally: return Poseidon.hash([address, proposalId, salt]);
  // For now, ensuring it returns a BigInt:
  return BigInt(123456789); // REPLACE with actual hashing logic
}