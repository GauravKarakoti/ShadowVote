// ShadowVote v3 – Private DAO Voting on Aleo
// Added Features: On-chain Tally, Quorum Enforcement, and Result Finalization

program shadow_vote_v3.aleo {
    @admin(address="aleo14y3wnsmr9ph4422qqgcnze6dvm7k8g89prm4lv23qs9w5emah59swp0kfd")
    async constructor() {}

    // Proposal struct updated with Quorum and Result fields
    struct Proposal {
        description: field,          
        options: [field; 10],        
        encrypted_tally: [field; 10], 
        end_block: u32,              
        admin: address,              
        is_active: bool,             
        quorum: u64,                 // NEW: Minimum voting power required
        winning_option: u8,          // NEW: Index of the winning option (0-9)
        is_finalized: bool,          // NEW: True if tally has been completed
    }

    struct DaoConfig {
        token_contract: address,
        admin: address,
        voter_tree_depth: u8,
    }

    struct VoterLeaf {
        voter: address,
        balance: u64,
        salt: field,
    }

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
    //  Initialization
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
    //  Proposal Management
    // --------------------------------

    // Updated to accept 'quorum'
    async transition create_proposal(
        description: field,
        options: [field; 10],
        end_block: u32,
        quorum: u64, 
    ) -> Future {
        return finalize_create_proposal(description, options, end_block, quorum, self.caller);
    }

    async function finalize_create_proposal(
        description: field,
        options: [field; 10],
        end_block: u32,
        quorum: u64,
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
            is_active: true,
            quorum: quorum,
            winning_option: 0u8,
            is_finalized: false,
        };
        Mapping::set(proposals, next_id, proposal);
    }

    // --------------------------------
    //  Voting Logic
    // --------------------------------

    function verify_merkle_proof(
        leaf: field,
        root: field,
        path: [field; 20],
        indices: [bool; 20]
    ) -> bool {
        let current: field = leaf; 
        for i: u8 in 0u8..20u8 {
            if indices[i] {
                current = Poseidon2::hash_to_field(HashNode { left: path[i], right: current });
            } else {
                current = Poseidon2::hash_to_field(HashNode { left: current, right: path[i] });
            }
        }
        return current == root;
    }

    async transition cast_vote(
        proposal_id: u64,
        vote_option: u8,
        balance: u64,
        merkle_path: [field; 20],
        path_indices: [bool; 20],
        nullifier: field,
        old_root: field,
        new_root: field,
        salt: field,
    ) -> Future {
        let leaf_input: VoterLeaf = VoterLeaf {
            voter: self.caller,
            balance: balance,
            salt: salt,
        };
        let leaf: field = Poseidon4::hash_to_field(leaf_input);
        
        let verified: bool = verify_merkle_proof(leaf, old_root, merkle_path, path_indices);
        assert(verified);

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
        
        // Checks
        assert(proposal.is_active);
        assert(proposal.end_block >= block.height);
        assert(!proposal.is_finalized); // Cannot vote if already tallied
        assert(vote_option < 10u8);

        // Verify option exists
        let is_valid_option: bool = false;
        for i: u8 in 0u8..10u8 {
            let option_is_active: bool = proposal.options[i] != 0field;
            is_valid_option = i == vote_option ? option_is_active : is_valid_option;
        }
        assert(is_valid_option);

        // Nullifier check
        assert(!Mapping::contains(nullifiers, nullifier));
        
        // Update tally
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
            is_active: proposal.is_active,
            quorum: proposal.quorum,             // Preserve
            winning_option: proposal.winning_option, // Preserve
            is_finalized: proposal.is_finalized, // Preserve
        };
        
        Mapping::set(proposals, proposal_id, updated_proposal);
        Mapping::set(nullifiers, nullifier, true);

        let current_root: field = Mapping::get(voter_root, 0u8);
        assert_eq(current_root, old_root);
        Mapping::set(voter_root, 0u8, new_root);
    }

    // --------------------------------
    //  Tally & Result (NEW)
    // --------------------------------

    async transition tally_proposal(proposal_id: u64) -> Future {
        return finalize_tally_proposal(proposal_id);
    }

    async function finalize_tally_proposal(proposal_id: u64) {
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        // Ensure voting has ended
        assert(block.height > proposal.end_block);
        // Ensure not already tallied
        assert(!proposal.is_finalized);

        let max_votes: field = 0field;
        let winner: u8 = 0u8;
        let total_votes: field = 0field;

        // Iterate to find winner and sum total votes
        for i: u8 in 0u8..10u8 {
            let votes: field = proposal.encrypted_tally[i];
            total_votes += votes;
            
            // FIX: Use ternary operators instead of an if block
            let is_new_max: bool = votes > max_votes;
            max_votes = is_new_max ? votes : max_votes;
            winner = is_new_max ? i : winner;
        }

        // Enforce Quorum
        assert(total_votes >= (proposal.quorum as field));

        let finalized_proposal: Proposal = Proposal {
            description: proposal.description,
            options: proposal.options,
            encrypted_tally: proposal.encrypted_tally,
            end_block: proposal.end_block,
            admin: proposal.admin,
            is_active: false,    // Automatically close active status
            quorum: proposal.quorum,
            winning_option: winner,
            is_finalized: true,  // Mark as finalized
        };
        Mapping::set(proposals, proposal_id, finalized_proposal);
    }

    // --------------------------------
    //  Admin Actions
    // --------------------------------

    async transition cancel_proposal(proposal_id: u64) -> Future {
        return finalize_cancel_proposal(proposal_id, self.caller);
    }

    async function finalize_cancel_proposal(proposal_id: u64, caller: address) {
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        assert_eq(caller, proposal.admin);
        assert(proposal.is_active);
        assert(!proposal.is_finalized);

        let cancelled_proposal: Proposal = Proposal {
            description: proposal.description,
            options: proposal.options,
            encrypted_tally: proposal.encrypted_tally,
            end_block: proposal.end_block,
            admin: proposal.admin,
            is_active: false,
            quorum: proposal.quorum,
            winning_option: proposal.winning_option,
            is_finalized: proposal.is_finalized,
        };
        Mapping::set(proposals, proposal_id, cancelled_proposal);
    }

    async transition close_proposal(proposal_id: u64) -> Future {
        return finalize_close_proposal(proposal_id);
    }

    async function finalize_close_proposal(proposal_id: u64) {
        let proposal: Proposal = Mapping::get(proposals, proposal_id);
        assert(block.height > proposal.end_block);
        assert(proposal.is_active);

        let closed_proposal: Proposal = Proposal {
            description: proposal.description,
            options: proposal.options,
            encrypted_tally: proposal.encrypted_tally,
            end_block: proposal.end_block,
            admin: proposal.admin,
            is_active: false,
            quorum: proposal.quorum,
            winning_option: proposal.winning_option,
            is_finalized: proposal.is_finalized,
        };
        Mapping::set(proposals, proposal_id, closed_proposal);
    }
}