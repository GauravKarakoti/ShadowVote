import axios from 'axios';

const VOTERS = [
  'aleo1...',
  'aleo1...',
  // ... 5 addresses
];

async function testVote() {
  for (const voter of VOTERS) {
    // 1. Fetch proof from indexer
    const { proof, encrypted_salt } = await axios.get(`http://localhost:3000/proof/${voter}`).then(r => r.data);
    
    // 2. Decrypt salt (mock – in real test, use actual view key)
    const salt = 12345n; // placeholder
    
    // 3. Build nullifier
    const nullifier = computeNullifier(voter, 1, salt);
    
    // 4. Generate proof (simulate with SDK)
    // ... (omitted for brevity)
    
    // 5. Submit transaction via Leo
    console.log(`Vote cast for ${voter}`);
  }
}
testVote();