# 🗳️ ShadowVote – Private DAO Voting on Aleo

[![Aleo](https://img.shields.io/badge/Aleo-Built%20with%20Leo-blue)](https://developer.aleo.org)

**Vote your conscience, not your wallet.**

ShadowVote is a zero‑knowledge voting protocol for DAOs built on Aleo. It enables anonymous, verifiable, and coercion‑resistant on‑chain governance.

---

## ✨ Features

- **Private votes** – No one sees how you voted, not even the smart contract.
- **Private voting power** – Your token balance stays hidden while still being used to weight your vote.
- **Verifiable tally** – Anyone can verify the final result without trusting a central party.
- **Double‑voting resistant** – Nullifiers ensure each token is used only once.
- **No trusted setup** – Aleo’s Marlin proof system is transparent.

![Logo](Logo.png)

---

## 🏗 Architecture

1. **Aleo Program (`shadow_vote.leo`)** – Contains the voting logic and state commitments.
2. **Indexer** – Off‑chain service that tracks token balances and constructs Merkle trees.
3. **Frontend dApp** – React app that generates proofs and submits transactions.
4. **Aleo Network** – Verifies proofs and finalizes votes.

---

## 📦 Smart Contract Overview

### State
- `proposals: mapping(u64 => Proposal)` – Public proposal metadata.
- `voter_root: field` – Current Merkle root of eligible voters & balances.
- `nullifiers: mapping(field => bool)` – Set of used nullifiers.
- `encrypted_tally: mapping(u64 => [field; MAX_OPTIONS])` – Private vote accumulators.

### Core Functions

#### `cast_vote`
```leo
// User provides:
// - proposal_id
// - vote_option
// - balance (private)
// - merkle_path (private)
// - nullifier (private)
// - old_root (public)
// - new_root (public)

transition cast_vote(...) -> Future
```
**Verifies:**
- `merkle_path` proves `balance` is in the tree under old_root.
- `nullifier` is fresh.
- Deducts the voting power from the tree (new_root = updated tree).
- Adds `vote_option` to `encrypted_tally[proposal_id]`.
- Emits nullifier publicly.

#### `tally_proposal`
Anyone can call after voting ends. The contract reveals the sum of encrypted votes and sets a public `result` mapping.

---

## 🧪 Running Locally
### Prerequisites
- [Leo](https://developer.aleo.org/leo/installation) installed
- [snarkOS](https://github.com/AleoHQ/snarkos) (for local testnet)
- Node.js 18+

### 1. Clone the repo
```bash
git clone https://github.com/GauravKarakoti/shadowvote
cd shadowvote
```

### 2. Build the Leo contract
```bash
cd contract
leo build
```

### 3. Deploy to local testnet
```bash
leo deploy --network local
```

### 4. Start the indexer
```bash
cd indexer
npm install
npm start
```

### 5. Run the frontend
```bash
cd app
npm install
npm run dev
```
Visit `http://localhost:3000`

---

## 🧠 How It Works (Privacy Deep Dive)
### Balance Commitment
When a user deposits tokens into the voting contract, we store a hash of `(address, balance, salt)` in a Merkle tree. The root is stored on‑chain.

### Casting a Vote
The user provides:
- `balance` and `salt` (private)
- Merkle authentication path (private)
- `vote_option` (private)
- `nullifier = hash(address, proposal_id, salt)` (private)

Inside the circuit:
1. Recompute the leaf = `poseidon(address, balance, salt)`
2. Verify the leaf is in the tree at `old_root`
3. Assert `nullifier` is not yet used
4. Update the tree root to exclude this leaf
5. Add `vote_option` to an encrypted accumulator

The proof is submitted on‑chain. The contract checks the proof, stores the new root, and marks the nullifier as used.

### Tallying
The encrypted accumulator is a homomorphic sum: `E(votes_option1) + E(votes_option2) ...`. Only the contract can decrypt it (using a private key held in the contract’s state). After the voting period, anyone can trigger `tally_proposal`, which decrypts and publishes the final result.

---

## 🛠 Tech Stack
| Layer |	Technology |
| ----- |	---------- |
| Blockchain	|	Aleo |
| Smart Contract	|	Leo |
| Frontend	|	React, TypeScript, TailwindCSS |
| Wallet	|	@aleohq/wallet-adapter-react |
| Proofs	|	Aleo SDK (off‑chain proving) |
| Indexer	|	Node.js, Express, PostgreSQL |
| Hosting	|	Vercel (frontend), Render (indexer) |

---

## 📈 Roadmap
- Wave 2: MVP with manual Merkle updates
- Wave 3–4: Indexer automation + multiple proposals
- Wave 5–6: Quadratic voting & delegation
- Wave 7–8: Snapshot integration
- Wave 9–10: Security audit & mainnet launch

---

## 🙏 Acknowledgements
- Aleo Team for Leo and endless support
- AKINDO for organising the Privacy Buildathon
- The ZK community for pioneering these ideas

---

Built with 🦁 on Aleo during the Privacy Buildathon.
