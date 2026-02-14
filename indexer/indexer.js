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
    rejectUnauthorized: false
  }
});

// ---------- Aleo connection ----------
const client = new AleoNetworkClient(process.env.ALEO_API_URL || 'https://api.explorer.provable.com/v2');
const PROGRAM_ID = 'shadow_vote_v3.aleo'; // Update to v3

// ---------- In‑memory Merkle tree ----------
const merkleTree = new MerkleTree(20); 

// ---------- Load persisted leaves from DB on startup ----------
async function loadLeaves() {
  const res = await pool.query('SELECT address, balance, salt, encrypted_salt FROM voters');
  for (const row of res.rows) {
    await merkleTree.insert(row.address, Number(row.balance), BigInt(row.salt));
    merkleTree.setEncryptedSalt(row.address, row.encrypted_salt);
  }
  console.log(`Loaded ${res.rows.length} voters from DB`);
}

let lastProcessedHeight = 0; 

async function startPolling() {
  try {
    const currentHeight = await client.getLatestHeight();
    
    if (lastProcessedHeight === 0) {
      lastProcessedHeight = currentHeight;
    }

    while (lastProcessedHeight <= currentHeight) {
      const block = await client.getBlock(lastProcessedHeight);
      
      if (block.transactions) {
        for (const tx of block.transactions) {
          if (tx.status === 'accepted' && tx.type === 'execute' && tx.transaction.execution) {
            const execution = tx.transaction.execution;
            
            for (const transition of execution.transitions) {
              if (transition.program === PROGRAM_ID) {
                
                // 1. Handle Voting
                if (transition.function === 'cast_vote') {
                  console.log(`Found cast_vote at block ${lastProcessedHeight}`);
                  const address = transition.inputs[0]?.value; 
                  const amount = transition.inputs[1]?.value; 
                  
                  // Note: In a real app, you decrypt the actual values or use the public inputs 
                  // associated with the proof. For this demo, we assume inputs are visible or 
                  // handled via off-chain communication.
                  const eventData = {
                    address: address,
                    amount: amount,
                    salt: "0",             
                    encrypted_salt: "..."  
                  };
                  await processDeposit({ data: eventData });

                // 2. Handle Proposal Cancellation
                } else if (transition.function === 'cancel_proposal') {
                  const rawProposalId = transition.inputs[0]?.value; 
                  const proposalId = parseInt(rawProposalId.replace('u64', ''), 10);
                  console.log(`Proposal ${proposalId} cancelled`);
                  
                  await pool.query(
                    `UPDATE proposals SET is_active = false, updated_at = NOW() WHERE id = $1`,
                    [proposalId]
                  );

                // 3. Handle Tally / Finalization (NEW)
                } else if (transition.function === 'tally_proposal') {
                  const rawProposalId = transition.inputs[0]?.value;
                  const proposalId = parseInt(rawProposalId.replace('u64', ''), 10);
                  console.log(`Proposal ${proposalId} tallied and finalized`);

                  // In a production indexer, you would parse the transition outputs 
                  // or state writes to get the 'winning_option'. 
                  // For now, we mark it finalized so the frontend knows to fetch the result.
                  await pool.query(
                    `UPDATE proposals SET is_active = false, is_finalized = true, updated_at = NOW() WHERE id = $1`,
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
  
  setTimeout(startPolling, 10000);
}

await loadLeaves();
startPolling();

async function processDeposit(event) {
  const { address, amount, salt, encrypted_salt } = event.data;
  await pool.query(
    `INSERT INTO voters (address, balance, salt, encrypted_salt, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (address) DO UPDATE SET balance = $2, salt = $3, encrypted_salt = $4, updated_at = NOW()`,
    [address, amount, salt, encrypted_salt]
  );
  await merkleTree.insert(address, Number(amount), BigInt(salt));
  merkleTree.setEncryptedSalt(address, encrypted_salt);
}

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