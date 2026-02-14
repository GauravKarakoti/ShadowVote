CREATE TABLE voters (
    address VARCHAR(128) PRIMARY KEY,
    balance BIGINT NOT NULL,
    salt TEXT NOT NULL,
    encrypted_salt TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_voters_balance ON voters(balance);

-- Add this to indexer/schema.sql
CREATE TABLE proposals (
    id BIGINT PRIMARY KEY,
    description TEXT NOT NULL,
    end_block BIGINT NOT NULL,
    admin VARCHAR(128) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_proposals_status ON proposals(is_active);