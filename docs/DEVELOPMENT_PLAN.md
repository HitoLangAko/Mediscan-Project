# MediScan Development Plan

## Phase 1: Working Prototype
- Use bundled demo images and mock QVAC OCR.
- Show scan → parse → match → classify → save to vault.
- Use JSON database and AsyncStorage for quick Expo compatibility.

## Phase 2: Real QVAC OCR
- Install and configure QVAC SDK according to official Expo/QVAC docs.
- Add OCR model files.
- Replace mock extraction in `qvacAdapter.ts`.
- Test label, box, blister, and receipt-style photos.

## Phase 3: Better Data
- Fill PH FDA CPR numbers manually or through official verification workflow.
- Enrich generic records using openFDA/DailyMed/RxNorm.
- Add barcode mappings from real packages.

## Phase 4: Production Features
- Add camera live capture.
- Add offline database update packs.
- Add reminders and expiration alerts.
- Add backup/export option.
