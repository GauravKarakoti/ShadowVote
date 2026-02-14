import React, { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
// Import types from aleo-types instead of core
import { TransactionOptions } from '@provablehq/aleo-types'; 
import { SHADOWVOTE_PROGRAM_ID } from '@/types/index';
import { getFeeForFunction } from '@/utils/feeCalculator';

// Helper to pad options to 10 items (required by contract array [field; 10])
const padOptions = (opts: string[]) => {
  const padded = [...opts];
  while (padded.length < 10) {
    padded.push("0field"); // 0field represents empty option
  }
  return `[${padded.join(', ')}]`;
};

// Helper to convert text to Aleo field (Mock implementation)
const stringToField = (str: string) => {
  return !isNaN(Number(str)) ? `${str}field` : `12345field`; 
};

export const CreateProposal = () => {
  // Check if executeTransaction is available, fallback to requestTransaction if needed
  const { publicKey, requestTransaction, executeTransaction } = useWallet() as any; 
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']); 
  const [endBlock, setEndBlock] = useState(0);
  const [quorum, setQuorum] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;
    
    // Support both new and old method names
    const submitFn = executeTransaction || requestTransaction;
    if (!submitFn) {
        alert("Wallet does not support transaction execution");
        return;
    }

    setLoading(true);

    try {
      // 1. Format Inputs
      const descField = stringToField(description);
      const optionsFields = options.map(o => stringToField(o));
      const optionsArrayString = padOptions(optionsFields);
      
      const inputs = [
        descField,                  // description: field
        optionsArrayString,         // options: [field; 10]
        `${endBlock}u32`,           // end_block: u32
        `${quorum}u64`              // quorum: u64
      ];

      // 2. Create Transaction Object (Plain Object instead of Transaction class)
      const fee = getFeeForFunction('create_proposal');
      
      const transaction: TransactionOptions = {
        program: SHADOWVOTE_PROGRAM_ID,
        function: 'create_proposal',
        inputs: inputs,
        fee: fee
      };

      // 3. Request Execution
      // executeTransaction returns { transactionId: string }
      const result = await submitFn(transaction);
      
      // Handle both return formats (string or object)
      const txId = typeof result === 'string' ? result : result?.transactionId;
      
      alert(`Proposal created! TxID: ${txId}`);
    } catch (err) {
      console.error(err);
      alert("Error creating proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);
  };

  console.log(loading, publicKey);

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-card dark:bg-light-dark space-y-4 mb-8">
      <h3 className="text-xl font-bold mb-4">Create New Proposal</h3>
      
      <div>
        <label className="block text-sm font-medium mb-1">Description ID (Numeric)</label>
        <input 
          type="number" 
          value={description} 
          onChange={e => setDescription(e.target.value)}
          className="w-full p-2 border rounded" 
          placeholder="101"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Options (Numeric IDs)</label>
        {options.map((opt, idx) => (
          <input 
            key={idx}
            type="number" 
            value={opt} 
            onChange={e => handleOptionChange(idx, e.target.value)}
            className="w-full p-2 border rounded mb-2" 
            placeholder={`Option ${idx + 1}`}
          />
        ))}
        {options.length < 10 && (
          <button type="button" onClick={() => setOptions([...options, ''])} className="text-sm text-blue-600">
            + Add Option
          </button>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">End Block Height</label>
          <input 
            type="number" 
            value={endBlock} 
            onChange={e => setEndBlock(Number(e.target.value))}
            className="w-full p-2 border rounded" 
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Quorum</label>
          <input 
            type="number" 
            value={quorum} 
            onChange={e => setQuorum(Number(e.target.value))}
            className="w-full p-2 border rounded" 
          />
        </div>
      </div>
      
      <button 
        type="submit" 
        disabled={loading || !publicKey}
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Proposal'}
      </button>
    </form>
  );
};