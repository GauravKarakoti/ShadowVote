import type { NextPageWithLayout } from '@/types/index.js';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';

const TermsPage: NextPageWithLayout = () => {
  return (
    <>
      <NextSeo title="Terms & Conditions | ShadowVote" description="Terms and conditions for using ShadowVote." />
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-4xl font-extrabold text-gray-900 dark:text-white">Terms and Conditions</h1>
        
        <div className="prose prose-blue dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the ShadowVote dApp, you acknowledge that you have read, understood, 
              and agree to be bound by these Terms and Conditions. ShadowVote is an open-source, decentralized 
              protocol running on the Aleo blockchain.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">2. Experimental Technology</h2>
            <p>
              ShadowVote relies on experimental zero-knowledge cryptography (Marlin proof system via Aleo). 
              While we have taken steps to ensure coercion-resistant and double-voting-resistant governance, 
              the protocol is provided "AS IS" and at your own risk. We are not liable for any loss of funds, 
              failed transactions, or software bugs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">3. User Responsibilities</h2>
            <p>
              You are entirely responsible for the security of your Aleo wallet, private keys, and any interactions 
              you sign. You agree not to use the ShadowVote protocol for illegal activities or manipulation.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

TermsPage.getLayout = (page) => <Layout>{page}</Layout>;
export default TermsPage;