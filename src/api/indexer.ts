// Adjust the URL if your indexer runs on a different port/host
const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:3000';

export async function fetchRoot(): Promise<string> {
  const res = await fetch(`${INDEXER_URL}/root`);
  if (!res.ok) throw new Error('Failed to fetch root');
  const data = await res.json();
  return data.root;
}

export async function fetchProof(address: string) {
  const res = await fetch(`${INDEXER_URL}/proof/${address}`);
  if (!res.ok) throw new Error('Failed to fetch proof');
  return res.json();
}