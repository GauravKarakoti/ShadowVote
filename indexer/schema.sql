CREATE TABLE voters (
    address VARCHAR(128) PRIMARY KEY,
    balance BIGINT NOT NULL,
    salt TEXT NOT NULL,
    encrypted_salt TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_voters_balance ON voters(balance);