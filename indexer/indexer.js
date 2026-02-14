import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AleoNetworkClient } from '@provablehq/sdk/testnet.js';
import pkg from 'pg';
const { Pool } = pkg;
import { MerkleTree } from './merkle.js';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// FIX 1: Use the correct API URL for Testnet Beta. 
// This must match the network your wallet is using.
const ALEO_API_URL = process.env.ALEO_API_URL || 'https://api.explorer.provable.com/v2';
const client = new AleoNetworkClient(ALEO_API_URL);

const PROGRAM_ID = 'shadow_vote_v3.aleo';
const merkleTree = new MerkleTree(20); 

// Helper to parse Aleo array strings like "[123field, 456field]" into JS arrays
const parseAleoArray = (aleoString) => {
  if (!aleoString) return [];
  return aleoString
    .replace(/[\[\]]/g, '')
    .split(',')
    .map(item => item.trim().replace('field', ''))
    .filter(item => item !== "0"); // Filter out padding
};

async function loadLeaves() {
  const res = await pool.query('SELECT address, balance, salt, encrypted_salt FROM voters');
  for (const row of res.rows) {
    await merkleTree.insert(row.address, Number(row.balance), BigInt(row.salt));
    merkleTree.setEncryptedSalt(row.address, row.encrypted_salt);
  }
  console.log(`Loaded ${res.rows.length} voters from DB`);
}

// FIX 2: Allow start block to be configured via ENV, default to a safe recent height.
// If you just deployed, set this to your deployment height to save time.
let lastProcessedHeight = process.env.START_BLOCK ? parseInt(process.env.START_BLOCK) : 0;

async function startPolling() {
  try {
    const currentHeight = await client.getLatestHeight();
    
    // FIX 3: Safety check - if local height is ahead of network (e.g. after a network reset), reset it.
    if (lastProcessedHeight > currentHeight) {
      console.warn(`⚠️ Local height (${lastProcessedHeight}) is ahead of network (${currentHeight}). Resetting to current head.`);
      lastProcessedHeight = currentHeight - 5; // Go back slightly to be safe
      if (lastProcessedHeight < 0) lastProcessedHeight = 0;
    }

    console.log(`⛓️ Network Height: ${currentHeight} | Indexer Height: ${lastProcessedHeight}`);

    // Ensure we don't skip blocks on restart
    while (lastProcessedHeight <= currentHeight) {
      // Log every 10 blocks or if we are close to tip to reduce noise
      if (lastProcessedHeight % 100 === 0 || currentHeight - lastProcessedHeight < 10) {
        console.log(`Scanning block ${lastProcessedHeight}...`);
      }

      try {
        const block = await client.getBlock(lastProcessedHeight);
        
        if (block.transactions) {
          for (const tx of block.transactions) {
            // Check if it's an execution transaction
            if (tx.status === 'accepted' && tx.type === 'execute' && tx.transaction.execution) {
              for (const transition of tx.transaction.execution.transitions) {
                
                // Match Program ID
                if (transition.program === PROGRAM_ID) {
                  console.log(`🔍 Found interaction with ${PROGRAM_ID} at height ${lastProcessedHeight}`);

                  if (transition.function === 'create_proposal') {
                    console.log("Found create_proposal transaction!");
                    
                    const description = transition.inputs[0]?.value.replace('field', ''); 
                    const optionsRaw = transition.inputs[1]?.value; 
                    const options = parseAleoArray(optionsRaw);
                    const endBlock = parseInt(transition.inputs[2]?.value.replace('u32', ''), 10);
                    const quorum = transition.inputs[3]?.value.replace('u64', '');
                    // Owner might be null in some API responses, handle gracefully
                    const admin = tx.transaction.owner || "unknown";

                    const maxIdRes = await pool.query('SELECT MAX(id) as max_id FROM proposals');
                    const nextId = (maxIdRes.rows[0].max_id !== null ? parseInt(maxIdRes.rows[0].max_id) : 0) + 1;

                    await pool.query(
                      `INSERT INTO proposals (id, description, options, end_block, admin, is_active, quorum, is_finalized, updated_at)
                       VALUES ($1, $2, $3, $4, $5, true, $6, false, NOW())`,
                      [nextId, description, options, endBlock, admin, quorum]
                    );
                    console.log(`✅ Inserted proposal ${nextId} into DB`);

                  } else if (transition.function === 'cancel_proposal') {
                    const proposalId = transition.inputs[0]?.value.replace('u64', '');
                    await pool.query(
                      `UPDATE proposals SET is_active = false, updated_at = NOW() WHERE id = $1`,
                      [proposalId]
                    );
                    console.log(`🚫 Cancelled proposal ${proposalId}`);

                  } else if (transition.function === 'tally_proposal') {
                    const proposalId = transition.inputs[0]?.value.replace('u64', '');
                    await pool.query(
                      `UPDATE proposals SET is_active = false, is_finalized = true, updated_at = NOW() WHERE id = $1`,
                      [proposalId]
                    );
                    console.log(`🏁 Finalized proposal ${proposalId}`);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        // Handle specific block fetch errors without crashing the loop
        console.error(`Error fetching block ${lastProcessedHeight}: ${err.message}`);
      }
      
      lastProcessedHeight++;
    }
  } catch (error) {
    console.error("Error polling network:", error.message);
  }
  
  // Poll every 5 seconds
  setTimeout(startPolling, 5000);
}

// Initial startup
console.log(`🚀 Starting Indexer for program: ${PROGRAM_ID}`);
console.log(`📡 Connecting to API: ${ALEO_API_URL}`);
await loadLeaves();
startPolling();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/proposals', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM proposals ORDER BY id DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/root', (req, res) => res.json({ root: merkleTree.root.toString() }));

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Indexer running on port ${PORT}`));