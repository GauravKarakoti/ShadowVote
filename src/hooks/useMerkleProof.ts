import { useState, useEffect } from 'react';
import localForage from 'localforage';
import { fetchProof, fetchRoot } from '@/api/indexer.js';

const proofCache = localForage.createInstance({ name: 'merkleProofs' });

interface CachedProof {
  root: string;
  proof: any;
  encryptedSalt: string;
  timestamp: number;
}

export function useMerkleProof(address: string | null) {
  const [proof, setProof] = useState<any>(null);
  const [encryptedSalt, setEncryptedSalt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let stale = false;
    setLoading(true);

    async function load() {
      try {
        // Get current on‑chain root (or from indexer)
        const currentRoot = await fetchRoot();

        // Try cache
        const cached = await proofCache.getItem<CachedProof>(address as string);
        if (cached && cached.root === currentRoot && Date.now() - cached.timestamp < 3600000) {
          // Cache valid for 1 hour
          setProof(cached.proof);
          setEncryptedSalt(cached.encryptedSalt);
          setLoading(false);
          return;
        }

        // Fetch fresh from indexer
        const fresh = await fetchProof(address as string);
        if (!stale) {
          setProof(fresh.proof);
          setEncryptedSalt(fresh.encrypted_salt);
          // Store in cache
          await proofCache.setItem(address as string, {
            root: currentRoot,
            proof: fresh.proof,
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

  return { proof, encryptedSalt, loading, error };
}