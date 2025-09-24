-- Key-Value Store Schema for Supabase
-- Replaces Netlify Blobs for simple key-value operations

CREATE TABLE IF NOT EXISTS key_value_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for multi-tenancy
ALTER TABLE key_value_store ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for function operations)
CREATE POLICY "Service role full access on key_value_store"
ON key_value_store FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_key_value_store_updated_at
    BEFORE UPDATE ON key_value_store
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_key_value_store_created_at ON key_value_store(created_at);
CREATE INDEX IF NOT EXISTS idx_key_value_store_updated_at ON key_value_store(updated_at);

-- Function to safely get value with default
CREATE OR REPLACE FUNCTION get_kv_value(p_key TEXT, p_default JSONB DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT value
        FROM key_value_store
        WHERE key = p_key
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN p_default;
END;
$$;

-- Function to safely set value
CREATE OR REPLACE FUNCTION set_kv_value(p_key TEXT, p_value JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO key_value_store (key, value)
    VALUES (p_key, p_value)
    ON CONFLICT (key)
    DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW();

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;