import type { NextPageWithLayout } from '@/types/index.js';
import { NextSeo } from 'next-seo';
import DashboardLayout from '@/layouts/dashboard/_dashboard';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { ManageProposal } from '@/components/ManageProposal';
import { useState, useEffect } from 'react';
import type { ProposalData } from '@/types/index.js';
import { CreateProposal } from '@/components/CreateProposal'; 
import { CastVoteButton } from '@/components/CastVoteButton';

const DashboardPage: NextPageWithLayout = () => {
  // FIX: Destructure 'address' instead of 'publicKey'
  const { address } = useWallet(); 
  
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [currentBlock, setCurrentBlock] = useState<number>(0);

  // Example: Fetch proposals from your indexer
  useEffect(() => {
    // In a real app, you'd also fetch the current network block height here
    setCurrentBlock(1500000); // Mock current block height
    
    // Ensure INDEXER_URL is defined, fallback for safety
    const indexerUrl = process.env.INDEXER_URL || 'http://localhost:5000';
    
    fetch(`${indexerUrl}/proposals`)
      .then(res => res.json())
      .then(data => setProposals(data))
      .catch(err => console.error("Failed to fetch proposals", err));
  }, []);

  return (
    <>
      <NextSeo title="Dashboard | ShadowVote" description="View and vote on DAO proposals privately." />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Proposals
          </h2>
        </div>

        {/* FIX: Use 'address' to check if wallet is connected */}
        {address && <CreateProposal />}

        <div className="rounded-xl bg-white p-6 shadow-card dark:bg-light-dark">
          {/* FIX: Use 'address' to check if wallet is connected */}
          {!address ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="mb-4 text-lg text-gray-500 dark:text-gray-400">
                Please connect your Aleo wallet to access proposals.
              </p>
            </div>
          ) : proposals.length === 0 ? (
            <p className="text-gray-500">No proposals found.</p>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">{proposal.title}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      proposal.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {proposal.isActive ? 'Active' : 'Closed/Cancelled'}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{proposal.description}</p>
                  
                  {proposal.isActive && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="font-semibold mb-2">Cast Your Vote</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {proposal.options?.map((opt, idx) => {
                            // Skip empty options (0field)
                            if (opt === "0field" || opt === "0") return null;
                            
                            return (
                              <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                                <span>Option {idx}: {opt}</span>
                                <CastVoteButton 
                                  proposalId={proposal.id}
                                  optionIndex={idx}
                                  balance={100} // TODO: Fetch real user balance from Indexer or RPC
                                  onSuccess={() => alert("Vote Cast!")}
                                />
                              </div>
                            );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Admin Controls */}
                  <ManageProposal 
                    proposalId={proposal.id} 
                    isActive={proposal.isActive} 
                    adminAddress={proposal.creatorAddress}
                    endBlock={proposal.deadline}
                    currentBlock={currentBlock}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

DashboardPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default DashboardPage;