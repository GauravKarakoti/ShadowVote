import type { NextPageWithLayout } from '@/types/index.js';
import { NextSeo } from 'next-seo';
import DashboardLayout from '@/layouts/dashboard/_dashboard';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';

const DashboardPage: NextPageWithLayout = () => {
  const { publicKey } = useWallet();

  return (
    <>
      <NextSeo 
        title="Dashboard | ShadowVote" 
        description="View and vote on DAO proposals privately." 
      />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Active Proposals
          </h2>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-card dark:bg-light-dark">
          {publicKey ? (
            <div className="space-y-4">
              <p className="text-lg font-medium">
                Welcome, {publicKey.slice(0, 8)}...{publicKey.slice(-8)}
              </p>
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">No active proposals at the moment.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="mb-4 text-lg text-gray-500 dark:text-gray-400">
                Please connect your Aleo wallet to view your voting power and access proposals.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

DashboardPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default DashboardPage;