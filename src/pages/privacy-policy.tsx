import type { NextPageWithLayout } from '@/types/index.js';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';

const PrivacyPolicyPage: NextPageWithLayout = () => {
  return (
    <>
      <NextSeo title="Privacy Policy | ShadowVote" description="Privacy Policy for the ShadowVote protocol." />
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-4xl font-extrabold text-gray-900 dark:text-white">Privacy Policy</h1>
        
        <div className="prose prose-blue dark:prose-invert max-w-none space-y-6">
          <p><strong>Last Updated:</strong> February 2026</p>

          <section>
            <h2 className="text-2xl font-bold">1. Zero-Knowledge Guarantees</h2>
            <p>
              ShadowVote is designed from the ground up to protect your privacy. Built on the Aleo blockchain, 
              your token balances, voting choices, and identity are cryptographically secured using zero-knowledge proofs. 
              The smart contract, the indexer, and the public can only see the cryptographic proof of your vote's validity, 
              not the contents of the vote itself.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">2. Data Collection & Indexer</h2>
            <p>
              The ShadowVote frontend does not track or collect personal data such as IP addresses or browser fingerprints. 
              Our off-chain Indexer tracks token balances to construct Merkle trees for governance voting. This data is 
              pulled entirely from public on-chain Aleo commitments and contains no personally identifiable information (PII).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">3. Wallet Interactions</h2>
            <p>
              Your connection to the ShadowVote dApp relies entirely on your local Aleo wallet adapter. 
              We do not store or have access to your private keys or seed phrases at any time.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

PrivacyPolicyPage.getLayout = (page) => <Layout>{page}</Layout>;
export default PrivacyPolicyPage;