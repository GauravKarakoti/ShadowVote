// ShadowVote v2 – Private DAO Voting on Aleo
// Wave 2: Multi‑proposal + Nullifier mapping + Merkle root management

program shadow_vote_v3.aleo {
    @admin(address="aleo14y3wnsmr9ph4422qqgcnze6dvm7k8g89prm4lv23qs9w5emah59swp0kfd")
    async constructor() {}

    struct Proposal {
        description: field,          // Hash of off‑chain description (IPFS / Snapshot)
        options: [field; 10],        // Option labels (max 10, padded with 0field)
        encrypted_tally: [field; 10], // Homomorphically encrypted vote sum per option
        end_block: u32,              // Voting deadline (Aleo block height)
        admin: address,              // Creator (only admin can finalize)
        is_active: bool,             // NEW: Tracks if the proposal is open for voting
    }

    struct DaoConfig {
        token_contract: address,
        admin: address,
        voter_tree_depth: u8,
    }

    // Custom struct to format data for the leaf hash
    struct VoterLeaf {
        voter: address,
        balance: u64,
        salt: field,
    }

    // Custom struct for 2-to-1 Merkle tree hashes
    struct HashNode {
        left: field,
        right: field,
    }

    mapping config: u8 => DaoConfig;
    mapping proposals: u64 => Proposal;
    mapping proposal_counter: u8 => u64;
    mapping nullifiers: field => bool;
    mapping voter_root: u8 => field;

    // --------------------------------
    //  Initialization (admin only)
    // --------------------------------

    async transition initialize(
        token_contract: address,
        admin: address,
        initial_root: field,
    ) -> Future {
        return finalize_initialize(token_contract, admin, initial_root);
    }

    async function finalize_initialize(
        token_contract: address,
        admin: address,
        initial_root: field,
    ) {
        let exists: bool = Mapping::contains(config, 0u8);
        assert(!exists);

        let cfg: DaoConfig = DaoConfig {
            token_contract: token_contract,
            admin: admin,
            voter_tree_depth: 20u8,
        };
        Mapping::set(config, 0u8, cfg);
        Mapping::set(voter_root, 0u8, initial_root);
        Mapping::set(proposal_counter, 0u8, 0u64);
    }

    // --------------------------------
    //  Proposal Management (admin only)
    // --------------------------------

    async transition create_proposal(
        description: field,
        options: [field; 10],
        end_block: u32,
    ) -> Future {
        return finalize_create_proposal(description, options, end_block, self.caller);
    }

    async function finalize_create_proposal(
        description: field,
        options: [field; 10],
        end_block: u32,
        caller: address,
    ) {
        let cfg: DaoConfig = Mapping::get(config, 0u8);
        assert_eq(caller, cfg.admin);

        let next_id: u64 = Mapping::get(proposal_counter, 0u8) + 1u64;
        Mapping::set(proposal_counter, 0u8, next_id);
        
        let proposal: Proposal = Proposal {
            description: description,
            options: options,
            encrypted_tally: [0field; 10],
            end_block: end_block,
            admin: caller,
            is_active: true, // Set to true upon creation
        };
        Mapping::set(proposals, next_id, proposal);
    }

    function verify_merkle_proof(
        leaf: field,
        root: field,
        path: [field; 20],
        indices: [bool; 20]
    ) -> bool {
        // Removed 'mut' here!
        let current: field = leaf; 
        for i: u8 in 0u8..20u8 {
            if indices[i] {
                // Sibling is on the left
                current = Poseidon2::hash_to_field(HashNode { left: path[i], right: current });
            } else {
                // Sibling is on the right
                current = Poseidon2::hash_to_field(HashNode { left: current, right: path[i] });
            }
        }
        return current == root;
    }

    // --------------------------------
    //  Core Voting Logic (ZK verified)
    // --------------------------------

    async transition cast_vote(
        proposal_id: u64,
        vote_option: u8,
        balance: u64,
        merkle_path: [field; 20],
        path_indices: [bool; 20], // <--- ADDED: Required to evaluate left/right in the Merkle tree
        nullifier: field,
        old_root: field,
        new_root: field,
        salt: field,
    ) -> Future {
        // 1. Recompute leaf commitment using Poseidon4 (for 3 fields)
        let leaf_input: VoterLeaf = VoterLeaf {
            voter: self.caller,
            balance: balance,
            salt: salt,
        };
        let leaf: field = Poseidon4::hash_to_field(leaf_input);

        // 2. Verify Merkle inclusion proof using our custom function
        let verified: bool = verify_merkle_proof(leaf, old_root, merkle_path, path_indices);
        assert(verified);

        // 3. Defer mapping operations to the on-chain finalize block
        return finalize_cast_vote(
            proposal_id,
            vote_option,
            balance,
            nullifier,
            old_root,
            new_root
        );
    }

    async function finalize_cast_vote(
        proposal_id: u64,
        vote_option: u8,
        balance: u64,
        nullifier: field,
        old_root: field,
        new_root: field,
    ) {
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        
        // NEW: Ensure the proposal hasn't been cancelled or explicitly closed
        assert(proposal.is_active); 
        
        assert(proposal.end_block >= block.height);
        assert(vote_option < 10u8);

        // 1. Safely check if the option is active (using ternary operator)
        let is_valid_option: bool = false;
        for i: u8 in 0u8..10u8 {
            let option_is_active: bool = proposal.options[i] != 0field;
            is_valid_option = i == vote_option ? option_is_active : is_valid_option;
        }
        assert(is_valid_option);

        assert(!Mapping::contains(nullifiers, nullifier));

        // 2. Safely update the tally (using ternary operator)
        let updated_tally_array: [field; 10] = proposal.encrypted_tally;
        for i: u8 in 0u8..10u8 {
            let current_val: field = updated_tally_array[i];
            let new_val: field = current_val + (balance as field);
            updated_tally_array[i] = i == vote_option ? new_val : current_val;
        }
        
        let updated_proposal: Proposal = Proposal {
            description: proposal.description,
            options: proposal.options,
            encrypted_tally: updated_tally_array,
            end_block: proposal.end_block,
            admin: proposal.admin,
            is_active: proposal.is_active // Retain active state
        };
        
        Mapping::set(proposals, proposal_id, updated_proposal);
        Mapping::set(nullifiers, nullifier, true);
        
        let current_root: field = Mapping::get(voter_root, 0u8);
        assert_eq(current_root, old_root);
        Mapping::set(voter_root, 0u8, new_root);
    }

    async transition cancel_proposal(proposal_id: u64) -> Future {
        return finalize_cancel_proposal(proposal_id, self.caller);
    }

    async function finalize_cancel_proposal(proposal_id: u64, caller: address) {
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        
        // Only the admin of the proposal can cancel it
        assert_eq(caller, proposal.admin);
        
        // Can only cancel if it is currently active
        assert(proposal.is_active);

        let cancelled_proposal: Proposal = Proposal {
            description: proposal.description,
            options: proposal.options,
            encrypted_tally: proposal.encrypted_tally,
            end_block: proposal.end_block,
            admin: proposal.admin,
            is_active: false, // Mark as inactive
        };
        Mapping::set(proposals, proposal_id, cancelled_proposal);
    }

    async transition close_proposal(proposal_id: u64) -> Future {
        return finalize_close_proposal(proposal_id);
    }

    async function finalize_close_proposal(proposal_id: u64) {
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        
        // Ensure the voting period is actually over
        assert(block.height > proposal.end_block);
        
        // Ensure it hasn't already been closed/cancelled
        assert(proposal.is_active);

        let closed_proposal: Proposal = Proposal {
            description: proposal.description,
            options: proposal.options,
            encrypted_tally: proposal.encrypted_tally,
            end_block: proposal.end_block,
            admin: proposal.admin,
            is_active: false, // Permanently close voting
        };
        Mapping::set(proposals, proposal_id, closed_proposal);
    }
}