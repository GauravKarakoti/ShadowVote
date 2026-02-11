import { JSONRPCClient } from 'json-rpc-2.0';
import { BOUNTY_PROGRAM_ID } from '@/types';
import { CURRENT_RPC_URL } from '@/types';


export const CREDITS_PROGRAM_ID = 'credits.aleo';

// Create the JSON-RPC client
export const client = getClient(CURRENT_RPC_URL);


// returns a string for address-based mappings
export async function fetchMappingValueString(
  mappingName: string,
  key: number
): Promise<string> {
  try {
    const result = await client.request('getMappingValue', {
      programId: BOUNTY_PROGRAM_ID,
      mappingName,
      key: `${key}.public`,
    });
    return result.value; // The address is stored as string in 'result.value'
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
      program_id: BOUNTY_PROGRAM_ID,
      mapping_name: mappingName,
      key: keyString,
    });

    if (!result) {
      throw new Error(
        `No result returned for mapping "${mappingName}" and key "${keyString}"`
      );
    }

    return result;
  } catch (error) {
    console.error(`Failed to fetch mapping "${mappingName}" with key "${key}":`, error);
    throw error;
  }
}


export async function fetchBountyStatusAndReward(bountyId: string) {
  try {
 
    const keyU64 = `${bountyId}u64`;


    const statusResult = await client.request('getMappingValue', {
      program_id: BOUNTY_PROGRAM_ID,
      mapping_name: 'bounty_status',
      key: keyU64,
    });

    const rewardResult = await client.request('getMappingValue', {
      program_id: BOUNTY_PROGRAM_ID,
      mapping_name: 'bounty_reward',
      key: keyU64,
    });

    return {
      status: statusResult?.value ?? statusResult ?? null,
      reward: rewardResult?.value ?? rewardResult ?? null,
    };
  } catch (error) {
    console.error('Error fetching bounty status/reward from chain:', error);
    throw new Error('Failed to fetch chain data');
  }
}

export async function readBountyMappings(bountyId: string) {
  // Fetch raw strings for all mappings
  const creator = await fetchMappingValueRaw('bounty_creator', bountyId);
  const payment = await fetchMappingValueRaw('bounty_payment', bountyId);
  const status = await fetchMappingValueRaw('bounty_status', bountyId);

  return {
    creator,  
    payment,  
    status,   
  };
}

export async function readProposalMappings(bountyId: number, proposalId: number) {
  // Ensure safe arithmetic using BigInt
  const compositeProposalId = (BigInt(bountyId) * BigInt(1_000_000) + BigInt(proposalId)).toString();

  console.log("Fetching data for Composite Proposal ID:", compositeProposalId);

  try {
    // Fetch all mappings related to the proposal
    const proposalBountyId = await fetchMappingValueRaw("proposal_bounty_id", compositeProposalId);
    const proposalProposer = await fetchMappingValueRaw("proposal_proposer", compositeProposalId);
    const proposalStatus = await fetchMappingValueRaw("proposal_status", compositeProposalId);

    return {
      proposalBountyId,
      proposalProposer,
      proposalStatus,
    };
  } catch (error) {
    console.error("Error fetching proposal mappings:", error);
    throw error;
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
    programId: BOUNTY_PROGRAM_ID,
    functionName,
    page,
    maxTransactions,
  });
}

/**
 * Transfer credits publicly between two accounts.
 */
export async function transferPublic(
  recipient: string,
  amount: string
): Promise<string> {
  const inputs = [
    `${recipient}.public`, // Recipient's public address
    `${amount}u64`,    // Amount to transfer
  ];

  const result = await client.request('executeTransition', {
    programId: CREDITS_PROGRAM_ID,
    functionName: 'transfer_public',
    inputs,
  });

  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}

/**
 * Transfer credits privately between two accounts.
 *
 * This function calls the on-chain "transfer_private" transition,
 * which exactly expects three inputs in the following order:
 *  - r0: Sender's credits record (credits.record)
 *  - r1: Recipient's address with a ".private" suffix (address.private)
 *  - r2: Transfer amount with a "u64.private" suffix (u64.private)
 *
 * It returns two credits records:
 *  - The first output is the recipient's updated credits record.
 *  - The second output is the sender's updated credits record.
 */
export async function transferPrivate(
  senderRecord: string,
  recipient: string,
  amount: string
): Promise<{ recipientRecord: string; senderRecord: string }> {
  // Exactly matching the expected input types:
  const inputs = [
    `${senderRecord}`,         // r0: credits.record
    `${recipient}.private`,    // r1: address.private
    `${amount}u64.private`,     // r2: u64.private
  ];

  const result = await client.request('executeTransition', {
    programId: CREDITS_PROGRAM_ID,
    functionName: 'transfer_private',
    inputs,
  });

  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }

  // The Aleo program returns:
  //   result.outputs[0] -> recipient's updated credits record (r4)
  //   result.outputs[1] -> sender's updated credits record (r5)
  return {
    recipientRecord: result.outputs[0],
    senderRecord: result.outputs[1],
  };
}


/**
 * 1. Post Bounty
 */
export async function postBounty(
  caller: string,
  bountyId: number,
  reward: number
): Promise<string> {
  const inputs = [
    `${caller}.private`,
    `${bountyId}.private`,
    `${caller}.private`,
    `${reward}.private`,
  ];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'post_bounty',
    inputs,
  });
  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}

/**
 * 2. View Bounty by ID
 */
export async function viewBountyById(
  bountyId: number
): Promise<{ payment: number; status: number }> {
  const inputs = [`${bountyId}.private`];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'view_bounty_by_id',
    inputs,
  });

  // Fetch finalized data from the mappings
  const payment = await fetchMappingValue('bounty_output_payment', bountyId);
  const status = await fetchMappingValue('bounty_output_status', bountyId);

  return { payment, status };
}

/**
 * 3. Submit Proposal
 */
export async function submitProposal(
  caller: string,
  bountyId: number,
  proposalId: number,
  proposer: string
): Promise<string> {
  const inputs = [
    `${caller}.private`,
    `${bountyId}.private`,
    `${proposalId}.private`,
    `${proposer}.private`,
  ];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'submit_proposal',
    inputs,
  });
  return result.transactionId;
}

/**
 * 4. Accept Proposal
 */
export async function acceptProposal(
  caller: string,
  bountyId: number,
  proposalId: number,
  creator: string,
  reward: number
): Promise<string> {
  const inputs = [
    `${caller}.private`,
    `${bountyId}.private`,
    `${proposalId}.private`,
    `${creator}.private`,
    `${reward}.private`,
  ];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'accept_proposal',
    inputs,
  });
  return result.transactionId;
}

/**
 * 5. Delete Bounty
 */
export async function deleteBounty(
  caller: string,
  bountyId: number
): Promise<string> {
  const inputs = [`${caller}.private`, `${bountyId}.private`];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'delete_bounty',
    inputs,
  });
  return result.transactionId;
}

/**
 * 6. Wait for Transaction Finalization
 */
export async function waitForTransactionToFinalize(
  transactionId: string
): Promise<boolean> {
  const maxRetries = 30;
  const delay = 1000; // 1 second
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

  return false; // Return false if transaction is not finalized
}


/**
 * 7. Transfer Payment
 */
export async function transfer(
  caller: string,
  receiver: string,
  amount: number
): Promise<string> {
  const inputs = [`${caller}.private`, `${receiver}.private`, `${amount}.private`];
  const result = await client.request('executeTransition', {
    programId: BOUNTY_PROGRAM_ID,
    functionName: 'transfer',
    inputs,
  });
  if (!result.transactionId) {
    throw new Error('Transaction failed: No transactionId returned.');
  }
  return result.transactionId;
}


/**
 * Helper to Fetch Mapping Values
 */
export async function fetchMappingValue(
  mappingName: string,
  key: string | number // Allow both string and number
): Promise<number> {
  try {
    // Convert `key` to string if it's a number
    const keyString = typeof key === 'number' ? `${key}.public` : `${key}.public`;

    const result = await client.request('getMappingValue', {
      programId: BOUNTY_PROGRAM_ID,
      mappingName,
      key: keyString, // Always pass as a string
    });

    return parseInt(result.value, 10); // Parse as integer
  } catch (error) {
    console.error(
      `Failed to fetch mapping ${mappingName} with key ${key}:`,
      error
    );
    throw error;
  }
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

/**
 * Get Verifying Key for a Function
 */
async function getDeploymentTransaction(programId: string): Promise<any> {
  const response = await fetch(`${CURRENT_RPC_URL}find/transactionID/deployment/${programId}`);
  const deployTxId = await response.json();
  const txResponse = await fetch(`${CURRENT_RPC_URL}transaction/${deployTxId}`);
  const tx = await txResponse.json();
  return tx;
}

export async function getVerifyingKey(
  programId: string,
  functionName: string
): Promise<string> {
  const deploymentTx = await getDeploymentTransaction(programId);

  const allVerifyingKeys = deploymentTx.deployment.verifying_keys;
  const verifyingKey = allVerifyingKeys.filter((vk: any) => vk[0] === functionName)[0][1][0];
  return verifyingKey;
}

export async function getProgram(programId: string, apiUrl: string): Promise<string> {
  const client = getClient(apiUrl);
  const program = await client.request('program', {
    id: programId
  });
  return program;
}


//Deny a proposal

export async function denyProposal(
  caller: string,
  bountyId: number,
  proposalId: number
): Promise<string> {
  const inputs = [
    `${caller}.private`,   
    `${bountyId}.private`, 
    `${proposalId}.private` 
  ];
    
    const result = await client.request('executeTransition', {
      programId: BOUNTY_PROGRAM_ID,
      functionName: 'deny_proposal', 
      inputs, 
    });

    return result.transactionId;
}