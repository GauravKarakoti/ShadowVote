import { JSONRPCClient } from 'json-rpc-2.0';
import { SHADOWVOTE_PROGRAM_ID, CURRENT_RPC_URL } from '@/types/index.js';

export const CREDITS_PROGRAM_ID = 'credits.aleo';

// Create the JSON-RPC client
export const client = getClient(CURRENT_RPC_URL);

// Returns a string for address-based mappings
export async function fetchMappingValueString(
  mappingName: string,
  key: number
): Promise<string> {
  try {
    const result = await client.request('getMappingValue', {
      programId: SHADOWVOTE_PROGRAM_ID,
      mappingName,
      key: `${key}.public`,
    });
    return result.value;
  } catch (error) {
    console.error(`Failed to fetch mapping ${mappingName} with key ${key}:`, error);
    throw error;
  }
}

export async function fetchMappingValueRaw(
  mappingName: string,
  key: string
): Promise<string> {
  try {
    const keyString = `${key}u64`;
    const result = await client.request("getMappingValue", {
      program_id: SHADOWVOTE_PROGRAM_ID,
      mapping_name: mappingName,
      key: keyString,
    });

    if (!result) {
      throw new Error(`No result returned for mapping "${mappingName}" and key "${keyString}"`);
    }

    return result;
  } catch (error) {
    console.error(`Failed to fetch mapping "${mappingName}" with key "${key}":`, error);
    throw error;
  }
}

export async function fetchPollStatus(pollId: string) {
  try {
    const keyU64 = `${pollId}u64`;

    const statusResult = await client.request('getMappingValue', {
      program_id: SHADOWVOTE_PROGRAM_ID,
      mapping_name: 'poll_status',
      key: keyU64,
    });

    return {
      status: statusResult?.value ?? statusResult ?? null,
    };
  } catch (error) {
    console.error('Error fetching poll status from chain:', error);
    throw new Error('Failed to fetch chain data');
  }
}

/**
 * Utility to fetch program transactions
 */
export async function getProgramTransactions(
  functionName: string,
  page = 0,
  maxTransactions = 100
) {
  return client.request('aleoTransactionsForProgram', {
    programId: SHADOWVOTE_PROGRAM_ID,
    functionName,
    page,
    maxTransactions,
  });
}

/**
 * 1. Create a Poll
 */
export async function createPoll(
  caller: string,
  pollId: number,
  optionsCount: number
): Promise<string> {
  const inputs = [
    `${caller}.private`,
    `${pollId}.private`,
    `${optionsCount}.private`,
  ];
  const result = await client.request('executeTransition', {
    programId: SHADOWVOTE_PROGRAM_ID,
    functionName: 'create_poll', // Matches Leo transition
    inputs,
  });
  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}

/**
 * 2. Cast a Vote
 */
export async function castVote(
  caller: string,
  pollId: number,
  voteOption: number
): Promise<string> {
  const inputs = [
    `${caller}.private`,
    `${pollId}.private`,
    `${voteOption}.private`,
  ];
  const result = await client.request('executeTransition', {
    programId: SHADOWVOTE_PROGRAM_ID,
    functionName: 'cast_vote', // Matches Leo transition
    inputs,
  });
  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}

/**
 * Wait for Transaction Finalization
 */
export async function waitForTransactionToFinalize(
  transactionId: string
): Promise<boolean> {
  const maxRetries = 30;
  const delay = 1000;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const status = await client.request('getTransactionStatus', { id: transactionId });
      if (status === 'finalized') {
        return true;
      }
    } catch (error) {
      console.error(`Failed to get transaction status: ${error}`);
    }
    retries++;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return false; 
}

/**
 * Utility to Create JSON-RPC Client
 */
export function getClient(apiUrl: string): JSONRPCClient {
  const client: JSONRPCClient = new JSONRPCClient((jsonRPCRequest: any) =>
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(jsonRPCRequest),
    }).then((response) => {
      if (response.status === 200) {
        return response.json().then((jsonRPCResponse) =>
          client.receive(jsonRPCResponse)
        );
      }
      throw new Error(response.statusText);
    })
  );
  return client;
}