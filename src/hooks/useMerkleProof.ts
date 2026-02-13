import { useState, useEffect } from 'react';
import localForage from 'localforage';
import { fetchProof, fetchRoot } from '@/api/indexer.js';

const proofCache = localForage.createInstance({ name: 'merkleProofs' });

interface CachedProof {
  root: string;
  proof: string[];
  indices: boolean[];
  encryptedSalt: string;
  timestamp: number;
}

export function useMerkleProof(address: string | null) {
  const [proof, setProof] = useState<string[] | null>(null);
  const [indices, setIndices] = useState<boolean[] | null>(null);
  const [encryptedSalt, setEncryptedSalt] = useState<string | null>(null);
  const [root, setRoot] = useState<string | null>(null); // <--- ADDED ROOT STATE
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let stale = false;
    setLoading(true);

    async function load() {
      try {
        // Get current on-chain root (or from indexer)
        const currentRoot = await fetchRoot();
        if (!stale) setRoot(currentRoot); // <--- STORE ROOT

        // Try cache
        const cached = await proofCache.getItem<CachedProof>(address as string);
        if (cached && cached.root === currentRoot && Date.now() - cached.timestamp < 3600000) {
          setProof(cached.proof);
          setIndices(cached.indices);
          setEncryptedSalt(cached.encryptedSalt);
          setLoading(false);
          return;
        }

        // Fetch fresh from indexer
        const fresh = await fetchProof(address as string);
        if (!stale) {
          setProof(fresh.proof);
          setIndices(fresh.indices);
          setEncryptedSalt(fresh.encrypted_salt);
          
          // Store in cache
          await proofCache.setItem(address as string, {
            root: currentRoot,
            proof: fresh.proof,
            indices: fresh.indices,
            encryptedSalt: fresh.encrypted_salt,
            timestamp: Date.now()
          });
        }
      } catch (err: any) {
        if (!stale) setError(err.message);
      } finally {
        if (!stale) setLoading(false);
      }
    }

    load();
    return () => { stale = true; };
  }, [address]);

  // <--- RETURN ROOT HERE
  return { proof, indices, encryptedSalt, root, loading, error }; 
}