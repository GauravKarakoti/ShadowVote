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

const client = new AleoNetworkClient(process.env.ALEO_API_URL || 'https://api.explorer.provable.com/v2');
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

// FIX: Start from a persisted height or the program deployment height to avoid missing transactions
let lastProcessedHeight = 1250000; // Replace with your actual deployment height

async function startPolling() {
  try {
    const currentHeight = await client.getLatestHeight();
    
    // Ensure we don't skip blocks on restart
    while (lastProcessedHeight <= currentHeight) {
      console.log(`Polling block ${lastProcessedHeight}...`);
      const block = await client.getBlock(lastProcessedHeight);
      
      if (block.transactions) {
        for (const tx of block.transactions) {
          if (tx.status === 'accepted' && tx.type === 'execute' && tx.transaction.execution) {
            for (const transition of tx.transaction.execution.transitions) {
              if (transition.program === PROGRAM_ID) {
                
                if (transition.function === 'create_proposal') {
                  const description = transition.inputs[0]?.value.replace('field', ''); 
                  const optionsRaw = transition.inputs[1]?.value; 
                  const options = parseAleoArray(optionsRaw);
                  const endBlock = parseInt(transition.inputs[2]?.value.replace('u32', ''), 10);
                  const quorum = transition.inputs[3]?.value.replace('u64', '');
                  const admin = tx.transaction.owner || "unknown";

                  const maxIdRes = await pool.query('SELECT MAX(id) as max_id FROM proposals');
                  const nextId = (maxIdRes.rows[0].max_id !== null ? parseInt(maxIdRes.rows[0].max_id) : 0) + 1;

                  // FIX: Added 'options' to the INSERT query
                  await pool.query(
                    `INSERT INTO proposals (id, description, options, end_block, admin, is_active, quorum, is_finalized, updated_at)
                     VALUES ($1, $2, $3, $4, $5, true, $6, false, NOW())`,
                    [nextId, description, options, endBlock, admin, quorum]
                  );
                  console.log(`Inserted proposal ${nextId} with ${options.length} options`);

                } else if (transition.function === 'cancel_proposal') {
                  const proposalId = transition.inputs[0]?.value.replace('u64', '');
                  await pool.query(
                    `UPDATE proposals SET is_active = false, updated_at = NOW() WHERE id = $1`,
                    [proposalId]
                  );

                } else if (transition.function === 'tally_proposal') {
                  const proposalId = transition.inputs[0]?.value.replace('u64', '');
                  // In a full implementation, you'd parse outputs to find the winning_option
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

const app = express();
app.use(cors());
app.use(express.json());

app.get('/proposals', async (req, res) => {
  try {
    // FIX: Ensure all fields expected by ProposalData type are returned
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