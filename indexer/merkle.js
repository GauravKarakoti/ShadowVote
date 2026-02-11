import { buildPoseidon } from 'circomlibjs';

export class MerkleTree {
  constructor(depth = 20) {
    this.depth = depth;
    this.leaves = new Map(); // address -> { leaf, balance, salt }
    this.encryptedSalts = new Map(); // address -> encrypted_salt
    this.tree = []; // array of arrays: each level stores hashes
    this.root = 0n;
    this.poseidon = null;
    this.initPoseidon();
  }

  async initPoseidon() {
    this.poseidon = await buildPoseidon();
  }

  async hash(elements) {
    // elements: array of BigInts or numbers/strings convertible to BigInt
    const bigints = elements.map(e => BigInt(e));
    const res = this.poseidon(bigints);
    return this.poseidon.F.toObject(res);
  }

  async insert(address, balance, salt) {
    if (!this.poseidon) await this.poseidon;
    const leaf = await this.hash([address, balance, salt]);
    this.leaves.set(address, { leaf, balance, salt });
    await this.rebuild();
  }

  async rebuild() {
    // Build full tree from current leaves
    const leavesArray = Array.from(this.leaves.values()).map(l => l.leaf);
    const leafCount = leavesArray.length;
    const totalLeaves = 1 << this.depth; // 2^depth
    // Pad with zero hash
    const zeroHash = await this.hash([0]);
    const levelHashes = [...leavesArray];
    for (let i = leafCount; i < totalLeaves; i++) {
      levelHashes.push(zeroHash);
    }

    let currentLevel = levelHashes;
    this.tree = [currentLevel];
    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i+1 < currentLevel.length ? currentLevel[i+1] : zeroHash;
        const parent = await this.hash([left, right]);
        nextLevel.push(parent);
      }
      this.tree.push(nextLevel);
      currentLevel = nextLevel;
    }
    this.root = this.tree[this.tree.length-1][0];
  }

  getProof(address) {
    const leafInfo = this.leaves.get(address);
    if (!leafInfo) return null;
    const leaf = leafInfo.leaf;
    // Find index of leaf in level 0
    const leavesArray = Array.from(this.leaves.values()).map(l => l.leaf);
    const index = leavesArray.findIndex(l => l === leaf);
    if (index === -1) return null;

    const path = [];
    const indices = [];
    let curIndex = index;
    for (let level = 0; level < this.depth; level++) {
      const isRight = curIndex % 2 === 1;
      const siblingIndex = isRight ? curIndex - 1 : curIndex + 1;
      const sibling = this.tree[level][siblingIndex] || 0n;
      path.push(sibling);
      indices.push(isRight ? 1 : 0);
      curIndex = Math.floor(curIndex / 2);
    }
    return { path, indices };
  }

  setEncryptedSalt(address, encrypted) {
    this.encryptedSalts.set(address, encrypted);
  }

  getEncryptedSalt(address) {
    return this.encryptedSalts.get(address);
  }
}