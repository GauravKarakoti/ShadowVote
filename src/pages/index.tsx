import type { NextPageWithLayout } from '@/types/index.js';
import { NextSeo } from 'next-seo';
import Layout from '@/layouts/_layout';
import Button from '@/components/ui/button/index';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletNotConnectedError } from '@provablehq/aleo-wallet-adaptor-core';
import { useRouter } from 'next/router';

const MainPage: NextPageWithLayout = () => {
  // FIX: Destructure 'address' instead of 'publicKey'
  const { address } = useWallet();
  const router = useRouter();

  const handleButtonClick = async () => {
    try {
      // FIX: Check 'address'
      if (!address) throw new WalletNotConnectedError();
      router.push('/dashboard'); 
    } catch (error) {
      // Prompt wallet connection usually handles itself, but alert as backup
      // You might want to trigger the wallet modal here if your UI supports it
      alert('Please connect your wallet to continue.');
    }
  };

  return (
    <>
      <NextSeo
        title="ShadowVote"
        description="Private, coercion-resistant DAO voting on Aleo."
      />

      <div className="fixed inset-0 bg-base-100 z-10 flex flex-col items-center justify-center px-4 py-16">
        <h1 className="text-5xl font-extrabold text-center tracking-tight text-primary-content sm:text-6xl">
          ShadowVote
        </h1>
        <p className="mt-4 text-lg text-center text-secondary-content max-w-lg">
          Vote your conscience, not your wallet. Anonymous, verifiable on-chain governance.
        </p>

        <div className="flex flex-col items-center mt-10 space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0">
          <Button
            onClick={handleButtonClick}
            className="btn btn-primary px-6 py-3 text-lg font-semibold"
          >
            {/* FIX: Check 'address' for conditional rendering */}
            {address ? 'Launch App' : 'Connect Wallet'}
          </Button>
        </div>
      </div>
    </>
  );
};

MainPage.getLayout = (page) => <Layout>{page}</Layout>;
export default MainPage;