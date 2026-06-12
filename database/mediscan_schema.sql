-- MediScan Vault starter database schema
-- Safety note: This schema supports medicine organization and reference lookup only.
-- It must not be used as a source for diagnosis, prescription, or dosing decisions.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS medicine_price_reference (
    medicine_ref_id TEXT PRIMARY KEY,
    dpri_id INTEGER UNIQUE,
    drug_name TEXT NOT NULL,
    lowest_price_php REAL,
    median_price_php REAL,
    highest_price_php REAL,
    country TEXT DEFAULT 'Philippines',
    source_year INTEGER,
    source_page INTEGER,
    source_document TEXT,
    price_notes TEXT
);

CREATE TABLE IF NOT EXISTS medicine_reference (
    medicine_reference_id TEXT PRIMARY KEY,
    dpri_id INTEGER,
    source_drug_name TEXT NOT NULL,
    generic_name_guess TEXT,
    active_ingredients_guess TEXT,
    strength_text_guess TEXT,
    dosage_form_guess TEXT,
    route_hint TEXT,
    brand_name TEXT,
    manufacturer TEXT,
    barcode_gtin TEXT,
    philippine_fda_cpr_number TEXT,
    fda_registration_status TEXT CHECK (fda_registration_status IN ('Registered','Not Found','Expired Registration','Needs Manual Check')) DEFAULT 'Needs Manual Check',
    fda_verified_at TEXT,
    rxnorm_rxcui TEXT,
    dailymed_setid TEXT,
    openfda_spl_id TEXT,
    common_uses TEXT,
    indications TEXT,
    purpose TEXT,
    warnings TEXT,
    side_effects TEXT,
    contraindications TEXT,
    drug_interactions TEXT,
    storage_instructions TEXT,
    lowest_price_php REAL,
    median_price_php REAL,
    highest_price_php REAL,
    country TEXT DEFAULT 'Philippines',
    source_year INTEGER,
    source_page INTEGER,
    source_document TEXT,
    source_urls TEXT,
    dataset_status TEXT,
    safety_notes TEXT,
    last_updated TEXT,
    FOREIGN KEY(dpri_id) REFERENCES medicine_price_reference(dpri_id)
);

CREATE TABLE IF NOT EXISTS user_medicine_vault (
    user_medicine_id TEXT PRIMARY KEY,
    medicine_reference_id TEXT,
    scanned_brand_name TEXT,
    scanned_generic_name TEXT,
    scanned_strength TEXT,
    scanned_dosage_form TEXT,
    scanned_manufacturer TEXT,
    scanned_barcode_gtin TEXT,
    scanned_cpr_number TEXT,
    batch_number TEXT,
    lot_number TEXT,
    expiration_date TEXT,
    scan_source TEXT CHECK (scan_source IN ('label','box','blister','barcode','pill','manual')) NOT NULL,
    scan_status TEXT CHECK (scan_status IN ('Verified','Needs Verification','Expired')) NOT NULL,
    confidence_score REAL DEFAULT 0,
    image_uri TEXT,
    user_notes TEXT,
    saved_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY(medicine_reference_id) REFERENCES medicine_reference(medicine_reference_id)
);

CREATE TABLE IF NOT EXISTS scan_history (
    scan_id TEXT PRIMARY KEY,
    user_medicine_id TEXT,
    scan_source TEXT CHECK (scan_source IN ('label','box','blister','barcode','pill','manual')) NOT NULL,
    raw_ocr_text TEXT,
    parsed_result_json TEXT,
    candidate_matches_json TEXT,
    final_status TEXT CHECK (final_status IN ('Verified','Needs Verification','Expired')),
    safety_warning_shown INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_medicine_id) REFERENCES user_medicine_vault(user_medicine_id)
);

CREATE INDEX IF NOT EXISTS idx_medicine_generic ON medicine_reference(generic_name_guess);
CREATE INDEX IF NOT EXISTS idx_medicine_barcode ON medicine_reference(barcode_gtin);
CREATE INDEX IF NOT EXISTS idx_medicine_cpr ON medicine_reference(philippine_fda_cpr_number);
CREATE INDEX IF NOT EXISTS idx_vault_expiration ON user_medicine_vault(expiration_date);
CREATE INDEX IF NOT EXISTS idx_scan_history_status ON scan_history(final_status);