-- Migration: Add Quorum and Tally fields to proposals table

-- 1. Add 'quorum' column to store the minimum vote threshold
ALTER TABLE proposals 
ADD COLUMN quorum BIGINT DEFAULT 0;

-- 2. Add 'winning_option' to store the final result (0-9)
ALTER TABLE proposals 
ADD COLUMN winning_option INT DEFAULT NULL;

-- 3. Add 'is_finalized' flag to track if tallying is complete
ALTER TABLE proposals 
ADD COLUMN is_finalized BOOLEAN DEFAULT FALSE;

-- Migration: Add options column to proposals table
ALTER TABLE proposals 
ADD COLUMN options TEXT[] DEFAULT '{}';

-- Optional: If your frontend specifically requires a 'title' separate from 'description'
ALTER TABLE proposals 
ADD COLUMN title TEXT;