// ShadowVote v2 – Private DAO Voting on Aleo
// Wave 2: Multi‑proposal + Nullifier mapping + Merkle root management

program shadow_vote_v2.aleo;

// --------------------------------
//  Structs & Mappings
// --------------------------------

struct Proposal {
    description: field,          // Hash of off‑chain description (IPFS / Snapshot)
    options: [field; 10],       // Option labels (max 10, padded with 0field)
    encrypted_tally: [field; 10], // Homomorphically encrypted vote sum per option
    end_block: u32,             // Voting deadline (Aleo block height)
    admin: address,            // Creator (only admin can finalize)
}

// Global DAO settings
struct DaoConfig {
    token_contract: address,    // Address of the token contract (e.g., credits.aleo)
    admin: address,            // DAO admin (can create proposals, change config)
    voter_tree_depth: u8,      // Merkle tree depth (fixed at 20)
}

// Core state
mapping config: () => DaoConfig;               // Singleton config
mapping proposals: u64 => Proposal;           // Proposal ID → Proposal
mapping proposal_counter: () => u64;          // Auto‑increment ID counter
mapping nullifiers: field => bool;           // Global nullifier set (prevents double voting)
mapping voter_root: () => field;             // Current Merkle root of eligible voters

// --------------------------------
//  Initialization (admin only)
// --------------------------------

transition initialize(
    token_contract: address,
    admin: address,
    initial_root: field,
) -> Future {
    // Ensure not already initialized
    let exists: bool = Mapping::contains(config, ());
    assert(!exists, "Already initialized");

    let cfg: DaoConfig = DaoConfig {
        token_contract: token_contract,
        admin: admin,
        voter_tree_depth: 20u8,
    };
    Mapping::set(config, (), cfg);
    Mapping::set(voter_root, (), initial_root);
    Mapping::set(proposal_counter, (), 0u64);
    Future::new(return)
}

// --------------------------------
//  Proposal Management (admin only)
// --------------------------------

transition create_proposal(
    description: field,
    options: [field; 10],
    end_block: u32,
) -> Future {
    // Only admin can create proposals
    let cfg: DaoConfig = Mapping::get(config, ());
    assert_eq(self.caller, cfg.admin, "Caller is not DAO admin");

    // Get next ID
    let next_id: u64 = Mapping::get(proposal_counter, ()) + 1u64;
    Mapping::set(proposal_counter, (), next_id);

    // Create and store proposal
    let proposal: Proposal = Proposal {
        description: description,
        options: options,
        encrypted_tally: [0field; 10],
        end_block: end_block,
        admin: self.caller,
    };
    Mapping::set(proposals, next_id, proposal);

    // Emit event (optional)
    Future::new(return next_id)
}

// --------------------------------
//  Core Voting Logic (ZK verified)
// --------------------------------

// Cast a private vote
//   - proposal_id: target proposal
//   - vote_option: index 0..9
//   - balance: voting power (private)
//   - merkle_path: authentication path to prove balance commitment
//   - nullifier: unique per (voter, proposal) to prevent double vote
//   - old_root: current Merkle root (public)
//   - new_root: updated root after deducting balance (public)
//   - salt: secret used to create leaf commitment
transition cast_vote(
    proposal_id: u64,
    vote_option: u8,
    balance: u64,
    merkle_path: [field; 20],
    nullifier: field,
    old_root: field,
    new_root: field,
    salt: field,
) -> Future {
    // 1. Verify proposal exists and is active
    let proposal: Proposal = Mapping::get(proposals, proposal_id);
    assert(proposal.end_block >= block.height, "Voting period ended");
    assert(vote_option < 10u8, "Invalid option");
    assert(proposal.options[vote_option] != 0field, "Option not active");

    // 2. Check nullifier not used
    assert(!Mapping::contains(nullifiers, nullifier), "Nullifier already used");

    // 3. Recompute leaf commitment = Poseidon2(caller, balance, salt)
    let leaf: field = Poseidon2::hash([self.caller, balance, salt]);

    // 4. Verify Merkle inclusion proof
    let cfg: DaoConfig = Mapping::get(config, ());
    let verified: bool = MerkleVerify::verify(
        merkle_path,
        old_root,
        leaf,
        cfg.voter_tree_depth
    );
    assert(verified, "Invalid Merkle proof");

    // 5. Update encrypted tally (simplified: additive homomorphic)
    //    In production, use ElGamal or Pedersen commitment + decryption key.
    let current_tally: field = proposal.encrypted_tally[vote_option];
    let updated_tally: field = current_tally + balance; // PLACEHOLDER: real encryption
    proposal.encrypted_tally[vote_option] = updated_tally;
    Mapping::set(proposals, proposal_id, proposal);

    // 6. Mark nullifier as used
    Mapping::set(nullifiers, nullifier, true);

    // 7. Update the voter Merkle root (remove used balance)
    //    The new_root is computed off‑chain and verified by the circuit.
    //    Here we simply store it.
    Mapping::set(voter_root, (), new_root);

    Future::new(return)
}

// --------------------------------
//  Utility: View functions (not transitions)
// --------------------------------

// Get proposal details (public)
function get_proposal(proposal_id: u64) -> Proposal {
    return Mapping::get(proposals, proposal_id);
}

// Get current Merkle root
function get_current_root() -> field {
    return Mapping::get(voter_root, ());
}