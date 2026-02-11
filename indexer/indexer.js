import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AleoNetworkClient, EventListener } from '@provablehq/sdk/mainnet.js';
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
});

// ---------- Aleo connection ----------
const client = new AleoNetworkClient(process.env.ALEO_API_URL || 'https://api.explorer.aleo.org/v1/testnet');
const listener = new EventListener(client);

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

// ---------- Event listeners ----------
// Listen to our shadow_vote_v2 contract events (deposit, withdraw)
listener.addEventListener('shadow_vote_v2.aleo', 'deposit', async (event) => {
  // event structure: { transaction_id, block_height, data: { address, amount, salt, encrypted_salt } }
  const { address, amount, salt, encrypted_salt } = event.data;
  // Wait for 2 confirmations
  const currentHeight = await client.getLatestBlockHeight();
  if (currentHeight - event.block_height < 2) {
    setTimeout(() => processDeposit(event), 10000); // retry later
    return;
  }
  await processDeposit(event);
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Indexer running on port ${PORT}`));