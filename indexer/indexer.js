import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AleoNetworkClient } from '@provablehq/sdk/mainnet.js';
import pkg from 'pg';
const { Pool } = pkg;
import { MerkleTree } from './merkle.js';

dotenv.config();

// ---------- PostgreSQL connection ----------
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false // This bypasses strict certificate validation, which is common for many managed DBs
  }
});

// ---------- Aleo connection ----------
const client = new AleoNetworkClient(process.env.ALEO_API_URL || 'https://api.explorer.provable.com/v2');

// ---------- In‑memory Merkle tree ----------
const merkleTree = new MerkleTree(20); // depth 20

// ---------- Load persisted leaves from DB on startup ----------
async function loadLeaves() {
  const res = await pool.query('SELECT address, balance, salt, encrypted_salt FROM voters');
  for (const row of res.rows) {
    await merkleTree.insert(row.address, Number(row.balance), BigInt(row.salt));
    // Also store encrypted_salt for API delivery
    merkleTree.setEncryptedSalt(row.address, row.encrypted_salt);
  }
  console.log(`Loaded ${res.rows.length} voters from DB`);
}
await loadLeaves();

let lastProcessedHeight = 0; 

async function startPolling() {
  try {
    // FIX: Changed from getLatestBlockHeight() to getLatestHeight()
    const currentHeight = await client.getLatestHeight();
    
    // If we just started, optionally start from the current height or a specific block
    if (lastProcessedHeight === 0) {
      lastProcessedHeight = currentHeight;
    }

    while (lastProcessedHeight <= currentHeight) {
      const block = await client.getBlock(lastProcessedHeight);
      
      // Look for transactions in the block
      if (block.transactions) {
        for (const tx of block.transactions) {
          // Check if transaction was accepted and executed
          if (tx.status === 'accepted' && tx.type === 'execute' && tx.transaction.execution) {
            const execution = tx.transaction.execution;
            
            for (const transition of execution.transitions) {
              // Match your program and the function you want to index
              if (transition.program === 'shadow_vote_v3.aleo') {
                if (transition.function === 'cast_vote') {
                  console.log(`Found cast_vote at block ${lastProcessedHeight}`);
                  
                  // Extract the parameters from the transition inputs/outputs
                  const address = transition.inputs[0]?.value; 
                  const amount = transition.inputs[1]?.value; 
                  
                  const eventData = {
                    address: address,
                    amount: amount,
                    salt: "0",             
                    encrypted_salt: "..."  
                  };

                  await processDeposit({ data: eventData, block_height: lastProcessedHeight });
                } else if (transition.function === 'cancel_proposal' || transition.function === 'close_proposal') {
                  // The proposal_id is the first input in both functions
                  const rawProposalId = transition.inputs[0]?.value; 
                  const proposalId = parseInt(rawProposalId.replace('u64', ''), 10);
                  
                  console.log(`Found ${transition.function} for proposal ${proposalId} at block ${lastProcessedHeight}`);
                  
                  // Mark proposal as inactive in the database
                  await pool.query(
                    `UPDATE proposals SET is_active = false, updated_at = NOW() WHERE id = $1`,
                    [proposalId]
                  );
                }
              }
            }
          }
        }
      }
      lastProcessedHeight++;
    }
  } catch (error) {
    console.error("Error polling blocks:", error.message);
  }
  
  // Poll again every 10 seconds
  setTimeout(startPolling, 10000);
}

// Start the polling loop after loading leaves
await loadLeaves();
startPolling();

async function processDeposit(event) {
  const { address, amount, salt, encrypted_salt } = event.data;
  // Insert or update in DB
  await pool.query(
    `INSERT INTO voters (address, balance, salt, encrypted_salt, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (address) DO UPDATE SET balance = $2, salt = $3, encrypted_salt = $4, updated_at = NOW()`,
    [address, amount, salt, encrypted_salt]
  );
  // Update Merkle tree
  await merkleTree.insert(address, Number(amount), BigInt(salt));
  merkleTree.setEncryptedSalt(address, encrypted_salt);
  console.log(`Processed deposit for ${address}, amount ${amount}`);
}

// Similar for withdraw events...

// ---------- Express API ----------
const app = express();
app.use(cors());
app.use(express.json());

app.get('/root', (req, res) => {
  res.json({ root: merkleTree.root.toString() });
});

app.get('/proposals', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM proposals ORDER BY id DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/proof/:address', async (req, res) => {
  const address = req.params.address;
  try {
    const proof = merkleTree.getProof(address);
    const encryptedSalt = merkleTree.getEncryptedSalt(address);
    if (!proof) throw new Error('Address not found');
    res.json({
      proof: proof.path.map(p => p.toString()),
      indices: proof.indices,
      encrypted_salt: encryptedSalt,
      root: merkleTree.root.toString()
    });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Indexer running on port ${PORT}`));