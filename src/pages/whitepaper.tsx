import type { NextPageWithLayout } from '@/types/index.js';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';

const WhitepaperPage: NextPageWithLayout = () => {
  return (
    <>
      <NextSeo title="Whitepaper | ShadowVote" description="Technical architecture and whitepaper of ShadowVote." />
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-5xl font-extrabold text-gray-900 dark:text-white">ShadowVote Whitepaper</h1>
        <p className="mb-12 text-xl text-gray-500">Vote your conscience, not your wallet.</p>
        
        <div className="prose prose-blue dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-3xl font-bold border-b pb-2">1. Abstract</h2>
            <p>
              ShadowVote is a zero‑knowledge voting protocol for DAOs built on Aleo. It enables anonymous, 
              verifiable, and coercion‑resistant on‑chain governance. It solves the critical problem in standard 
              DAOs where token holders' votes and balances are fully transparent, leading to voter intimidation and groupthink.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold border-b pb-2">2. Architecture</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Aleo Program (`shadow_vote.leo`):</strong> Contains the voting logic, encrypted tallies, and state commitments.</li>
              <li><strong>Off-Chain Indexer:</strong> Service that tracks token balances and constructs the required Merkle trees for state updates.</li>
              <li><strong>Frontend dApp:</strong> A React application utilizing the Aleo SDK to generate off-chain ZK proofs.</li>
              <li><strong>Aleo Network:</strong> Verifies the Marlin zero-knowledge proofs and finalizes the votes securely without a trusted setup.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold border-b pb-2">3. Cryptographic Deep Dive</h2>
            <h3 className="text-xl font-semibold mt-4">Balance Commitment</h3>
            <p>
              When a user deposits tokens into the voting contract, a hash of `(address, balance, salt)` is stored in a 
              Merkle tree. The root is maintained on‑chain.
            </p>
            
            <h3 className="text-xl font-semibold mt-4">Casting a Vote</h3>
            <p>To cast a private vote, the user generates a proof off-chain validating:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Recomputing the leaf `poseidon(address, balance, salt)`.</li>
              <li>Verifying the leaf exists within the current `voter_root`.</li>
              <li>Asserting the `nullifier = hash(address, proposal_id, salt)` is unused to prevent double voting.</li>
            </ol>
            <p>
              The smart contract verifies the proof, updates the nullifier mapping, and adds the hidden `vote_option` 
              to an encrypted accumulator mapping: `encrypted_tally[proposal_id]`.
            </p>

            <h3 className="text-xl font-semibold mt-4">Homomorphic Tallying</h3>
            <p>
              The encrypted accumulator maintains a homomorphic sum of the votes. Only after the proposal period closes 
              can the contract decrypt the final totals using a private key held in the contract’s state, making the result 
              public via `tally_proposal`.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

WhitepaperPage.getLayout = (page) => <Layout>{page}</Layout>;
export default WhitepaperPage;