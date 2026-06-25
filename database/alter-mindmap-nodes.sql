-- Mindmap Schema Enhancement: Add emoji and notes columns to mindmap_nodes
-- Run this in your Supabase SQL Editor AFTER the initial migration

ALTER TABLE mindmap_nodes ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT NULL;
ALTER TABLE mindmap_nodes ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
