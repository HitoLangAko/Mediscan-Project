
import { ScanSource } from '../types/Medicine';

export type DemoSample = {
  id: string;
  title: string;
  subtitle: string;
  source: ScanSource;
  image: number;
  mockOcrText: string;
};

export const demoSamples: DemoSample[] = [
  {
    id: 'paracetamol_label',
    title: 'Verified label demo',
    subtitle: 'Paracetamol 500 mg, not expired',
    source: 'label',
    image: require('../../assets/demo/paracetamol_label.png'),
    mockOcrText: 'DemoPara Paracetamol 500 mg Tablet Manufacturer: Demo Manufacturer PH FDA Reg/CPR: TO BE VERIFIED EXP: 2027-08 Barcode 8991000000001'
  },
  {
    id: 'expired_label',
    title: 'Expired medicine demo',
    subtitle: 'Paracetamol 500 mg, expired',
    source: 'label',
    image: require('../../assets/demo/expired_label.png'),
    mockOcrText: 'OldPara Paracetamol 500 mg Tablet Manufacturer: Demo Manufacturer PH EXP: 2023-01 Barcode 8991000000001'
  },
  {
    id: 'ibuprofen_box',
    title: 'Box scan demo',
    subtitle: 'Ibuprofen 400 mg',
    source: 'box',
    image: require('../../assets/demo/ibuprofen_box.png'),
    mockOcrText: 'DemoFen Ibuprofen 400 mg Tablet Manufacturer Demo Manufacturer PH EXP 2027-05 Barcode 8991000000002'
  },
  {
    id: 'cetirizine_box',
    title: 'Allergy medicine demo',
    subtitle: 'Cetirizine 10 mg',
    source: 'box',
    image: require('../../assets/demo/cetirizine_box.png'),
    mockOcrText: 'DemoCeti Cetirizine 10 mg Tablet EXP 2026-12 Barcode 8991000000003'
  },
  {
    id: 'amoxicillin_blister',
    title: 'Blister pack demo',
    subtitle: 'Amoxicillin 500 mg',
    source: 'blister',
    image: require('../../assets/demo/amoxicillin_blister.png'),
    mockOcrText: 'DemoMox Amoxicillin 500 mg Capsule EXP 2027-02'
  },
  {
    id: 'pill_only',
    title: 'Pill-only safety demo',
    subtitle: 'No label, should require verification',
    source: 'pill',
    image: require('../../assets/demo/pill_only.png'),
    mockOcrText: 'PILL_ONLY white round tablet imprint 500 no package no barcode'
  }
];
