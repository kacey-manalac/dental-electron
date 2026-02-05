import { PrismaClient, ToothCondition, AppointmentStatus, TreatmentStatus, InvoiceStatus, PaymentMethod, SupplyCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const FDI_TO_UNIVERSAL: Record<string, number> = {
  '18': 1, '17': 2, '16': 3, '15': 4, '14': 5, '13': 6, '12': 7, '11': 8,
  '21': 9, '22': 10, '23': 11, '24': 12, '25': 13, '26': 14, '27': 15, '28': 16,
  '38': 17, '37': 18, '36': 19, '35': 20, '34': 21, '33': 22, '32': 23, '31': 24,
  '41': 25, '42': 26, '43': 27, '44': 28, '45': 29, '46': 30, '47': 31, '48': 32,
};

const UNIVERSAL_TO_FDI: Record<number, string> = Object.fromEntries(
  Object.entries(FDI_TO_UNIVERSAL).map(([fdi, universal]) => [universal, fdi])
);

async function main() {
  console.log('Seeding database...');

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 12);
  const dentistPassword = await bcrypt.hash('dentist123', 12);
  const assistantPassword = await bcrypt.hash('assistant123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dentalclinic.com' },
    update: {},
    create: {
      email: 'admin@dentalclinic.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      phone: '555-0100',
    },
  });

  const dentist = await prisma.user.upsert({
    where: { email: 'dentist@dentalclinic.com' },
    update: {},
    create: {
      email: 'dentist@dentalclinic.com',
      password: dentistPassword,
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      role: 'DENTIST',
      phone: '555-0101',
    },
  });

  const assistant = await prisma.user.upsert({
    where: { email: 'assistant@dentalclinic.com' },
    update: {},
    create: {
      email: 'assistant@dentalclinic.com',
      password: assistantPassword,
      firstName: 'Emily',
      lastName: 'Davis',
      role: 'ASSISTANT',
      phone: '555-0102',
    },
  });

  console.log('Created users:', admin.email, dentist.email, assistant.email);

  // Create patients
  const patientsData = [
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@email.com',
      phone: '555-1001',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'Male',
      address: '123 Main Street, Anytown, ST 12345',
      insuranceProvider: 'DentalCare Plus',
      insuranceNumber: 'DC-123456',
    },
    {
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia@email.com',
      phone: '555-1002',
      dateOfBirth: new Date('1990-07-22'),
      gender: 'Female',
      address: '456 Oak Avenue, Somewhere, ST 67890',
      insuranceProvider: 'SmileSafe Insurance',
      insuranceNumber: 'SS-789012',
    },
    {
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael.brown@email.com',
      phone: '555-1003',
      dateOfBirth: new Date('1978-11-08'),
      gender: 'Male',
      address: '789 Pine Road, Elsewhere, ST 11223',
    },
    {
      firstName: 'Sarah',
      lastName: 'Wilson',
      email: 'sarah.wilson@email.com',
      phone: '555-1004',
      dateOfBirth: new Date('1995-02-14'),
      gender: 'Female',
      address: '321 Elm Street, Nowhere, ST 44556',
      insuranceProvider: 'DentalCare Plus',
      insuranceNumber: 'DC-345678',
    },
    {
      firstName: 'David',
      lastName: 'Lee',
      email: 'david.lee@email.com',
      phone: '555-1005',
      dateOfBirth: new Date('1982-09-30'),
      gender: 'Male',
      address: '654 Maple Lane, Anyplace, ST 77889',
    },
    {
      firstName: 'Jennifer',
      lastName: 'Martinez',
      email: 'jennifer.martinez@email.com',
      phone: '555-1006',
      dateOfBirth: new Date('1988-05-25'),
      gender: 'Female',
      address: '987 Cedar Drive, Someplace, ST 99001',
      insuranceProvider: 'ToothGuard',
      insuranceNumber: 'TG-567890',
    },
    {
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.taylor@email.com',
      phone: '555-1007',
      dateOfBirth: new Date('1970-12-03'),
      gender: 'Male',
      address: '147 Birch Way, Othertown, ST 22334',
    },
    {
      firstName: 'Emily',
      lastName: 'Anderson',
      email: 'emily.anderson@email.com',
      phone: '555-1008',
      dateOfBirth: new Date('2000-08-19'),
      gender: 'Female',
      address: '258 Spruce Court, Lastville, ST 55667',
    },
    {
      firstName: 'William',
      lastName: 'Thomas',
      email: 'william.thomas@email.com',
      phone: '555-1009',
      dateOfBirth: new Date('1965-04-11'),
      gender: 'Male',
      address: '369 Walnut Street, Finaltown, ST 88990',
      insuranceProvider: 'SmileSafe Insurance',
      insuranceNumber: 'SS-901234',
    },
    {
      firstName: 'Lisa',
      lastName: 'Jackson',
      email: 'lisa.jackson@email.com',
      phone: '555-1010',
      dateOfBirth: new Date('1992-06-07'),
      gender: 'Female',
      address: '741 Ash Boulevard, Endville, ST 33445',
    },
  ];

  const patients = [];
  for (const patientData of patientsData) {
    const patient = await prisma.patient.create({
      data: {
        ...patientData,
        medicalHistory: {
          create: {},
        },
      },
    });
    patients.push(patient);

    // Create teeth records for each patient
    const teethData = [];
    for (let i = 1; i <= 32; i++) {
      teethData.push({
        patientId: patient.id,
        toothNumber: i,
        fdiNumber: UNIVERSAL_TO_FDI[i],
        isAdult: true,
        currentCondition: 'HEALTHY' as ToothCondition,
      });
    }
    await prisma.tooth.createMany({ data: teethData });
  }

  console.log(`Created ${patients.length} patients`);

  // Update some medical histories
  await prisma.medicalHistory.update({
    where: { patientId: patients[0].id },
    data: {
      allergies: 'Penicillin',
      medications: 'Lisinopril 10mg daily',
      medicalConditions: 'Hypertension',
      smokingStatus: 'Former smoker',
      bloodType: 'O+',
    },
  });

  await prisma.medicalHistory.update({
    where: { patientId: patients[1].id },
    data: {
      allergies: 'Latex',
      medications: 'Birth control',
      smokingStatus: 'Never',
      bloodType: 'A+',
    },
  });

  await prisma.medicalHistory.update({
    where: { patientId: patients[6].id },
    data: {
      allergies: 'Aspirin, Ibuprofen',
      medications: 'Metformin 500mg twice daily, Atorvastatin 20mg',
      medicalConditions: 'Type 2 Diabetes, High Cholesterol',
      previousSurgeries: 'Appendectomy (1995)',
      smokingStatus: 'Never',
      bloodType: 'B+',
    },
  });

  // Update dental conditions for some patients
  const dentalConditions: { patientIndex: number; toothNumber: number; condition: ToothCondition }[] = [
    { patientIndex: 0, toothNumber: 3, condition: 'FILLED' },
    { patientIndex: 0, toothNumber: 14, condition: 'FILLED' },
    { patientIndex: 0, toothNumber: 19, condition: 'CROWN' },
    { patientIndex: 0, toothNumber: 30, condition: 'CAVITY' },
    { patientIndex: 1, toothNumber: 1, condition: 'MISSING' },
    { patientIndex: 1, toothNumber: 16, condition: 'MISSING' },
    { patientIndex: 1, toothNumber: 17, condition: 'MISSING' },
    { patientIndex: 1, toothNumber: 32, condition: 'MISSING' },
    { patientIndex: 1, toothNumber: 18, condition: 'FILLED' },
    { patientIndex: 1, toothNumber: 31, condition: 'FILLED' },
    { patientIndex: 2, toothNumber: 14, condition: 'ROOT_CANAL' },
    { patientIndex: 2, toothNumber: 19, condition: 'CROWN' },
    { patientIndex: 2, toothNumber: 3, condition: 'FILLED' },
    { patientIndex: 2, toothNumber: 4, condition: 'FILLED' },
    { patientIndex: 2, toothNumber: 12, condition: 'CAVITY' },
    { patientIndex: 2, toothNumber: 30, condition: 'IMPLANT' },
    { patientIndex: 3, toothNumber: 1, condition: 'MISSING' },
    { patientIndex: 3, toothNumber: 16, condition: 'MISSING' },
    { patientIndex: 4, toothNumber: 2, condition: 'CAVITY' },
    { patientIndex: 4, toothNumber: 15, condition: 'CAVITY' },
    { patientIndex: 4, toothNumber: 18, condition: 'FILLED' },
    { patientIndex: 4, toothNumber: 31, condition: 'FILLED' },
    { patientIndex: 6, toothNumber: 1, condition: 'MISSING' },
    { patientIndex: 6, toothNumber: 16, condition: 'MISSING' },
    { patientIndex: 6, toothNumber: 17, condition: 'MISSING' },
    { patientIndex: 6, toothNumber: 32, condition: 'MISSING' },
    { patientIndex: 6, toothNumber: 2, condition: 'CROWN' },
    { patientIndex: 6, toothNumber: 3, condition: 'CROWN' },
    { patientIndex: 6, toothNumber: 14, condition: 'CROWN' },
    { patientIndex: 6, toothNumber: 15, condition: 'CROWN' },
    { patientIndex: 6, toothNumber: 18, condition: 'ROOT_CANAL' },
    { patientIndex: 6, toothNumber: 19, condition: 'IMPLANT' },
    { patientIndex: 6, toothNumber: 30, condition: 'IMPLANT' },
    { patientIndex: 6, toothNumber: 31, condition: 'FILLED' },
  ];

  for (const condition of dentalConditions) {
    await prisma.tooth.updateMany({
      where: {
        patientId: patients[condition.patientIndex].id,
        toothNumber: condition.toothNumber,
      },
      data: {
        currentCondition: condition.condition,
      },
    });
  }

  console.log('Updated dental conditions');

  // Create appointments
  const today = new Date();
  const appointmentsData = [
    {
      patientId: patients[0].id,
      dentistId: dentist.id,
      title: 'Regular Checkup',
      description: 'Six-month routine dental examination',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 30),
      status: 'SCHEDULED' as AppointmentStatus,
    },
    {
      patientId: patients[1].id,
      dentistId: dentist.id,
      title: 'Filling Replacement',
      description: 'Replace old amalgam filling on tooth #18',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 11, 0),
      status: 'CONFIRMED' as AppointmentStatus,
    },
    {
      patientId: patients[2].id,
      dentistId: dentist.id,
      title: 'Crown Consultation',
      description: 'Discuss crown options for tooth #12',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 30),
      status: 'SCHEDULED' as AppointmentStatus,
    },
    {
      patientId: patients[3].id,
      dentistId: dentist.id,
      title: 'Teeth Cleaning',
      description: 'Professional cleaning and polishing',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 11, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 11, 45),
      status: 'SCHEDULED' as AppointmentStatus,
    },
    {
      patientId: patients[4].id,
      dentistId: dentist.id,
      title: 'Cavity Treatment',
      description: 'Fill cavities on teeth #2 and #15',
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 9, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 10, 30),
      status: 'SCHEDULED' as AppointmentStatus,
    },
    {
      patientId: patients[0].id,
      dentistId: dentist.id,
      title: 'Initial Consultation',
      startTime: new Date(today.getFullYear(), today.getMonth() - 1, 15, 10, 0),
      endTime: new Date(today.getFullYear(), today.getMonth() - 1, 15, 10, 30),
      status: 'COMPLETED' as AppointmentStatus,
    },
    {
      patientId: patients[6].id,
      dentistId: dentist.id,
      title: 'Crown Fitting',
      startTime: new Date(today.getFullYear(), today.getMonth() - 1, 20, 14, 0),
      endTime: new Date(today.getFullYear(), today.getMonth() - 1, 20, 15, 0),
      status: 'COMPLETED' as AppointmentStatus,
    },
  ];

  for (const appointmentData of appointmentsData) {
    await prisma.appointment.create({ data: appointmentData });
  }

  console.log(`Created ${appointmentsData.length} appointments`);

  // Create treatments
  const treatmentsData = [
    {
      patientId: patients[0].id,
      dentistId: dentist.id,
      procedureName: 'Composite Filling',
      procedureCode: 'D2391',
      toothNumber: 3,
      cost: 180,
      status: 'COMPLETED' as TreatmentStatus,
      performedAt: new Date(today.getFullYear(), today.getMonth() - 2, 10),
    },
    {
      patientId: patients[0].id,
      dentistId: dentist.id,
      procedureName: 'Cavity Treatment',
      procedureCode: 'D2391',
      toothNumber: 30,
      cost: 195,
      status: 'PLANNED' as TreatmentStatus,
    },
    {
      patientId: patients[2].id,
      dentistId: dentist.id,
      procedureName: 'Root Canal Treatment',
      procedureCode: 'D3310',
      toothNumber: 14,
      cost: 950,
      status: 'COMPLETED' as TreatmentStatus,
      performedAt: new Date(today.getFullYear(), today.getMonth() - 1, 5),
    },
    {
      patientId: patients[2].id,
      dentistId: dentist.id,
      procedureName: 'Porcelain Crown',
      procedureCode: 'D2740',
      toothNumber: 19,
      cost: 1200,
      status: 'COMPLETED' as TreatmentStatus,
      performedAt: new Date(today.getFullYear(), today.getMonth() - 1, 20),
    },
    {
      patientId: patients[6].id,
      dentistId: dentist.id,
      procedureName: 'Dental Implant',
      procedureCode: 'D6010',
      toothNumber: 19,
      cost: 3500,
      status: 'COMPLETED' as TreatmentStatus,
      performedAt: new Date(today.getFullYear(), today.getMonth() - 3, 1),
    },
    {
      patientId: patients[4].id,
      dentistId: dentist.id,
      procedureName: 'Composite Filling',
      procedureCode: 'D2391',
      toothNumber: 2,
      cost: 175,
      status: 'PLANNED' as TreatmentStatus,
    },
  ];

  const treatments = [];
  for (const treatmentData of treatmentsData) {
    const treatment = await prisma.treatment.create({ data: treatmentData });
    treatments.push(treatment);
  }

  console.log(`Created ${treatments.length} treatments`);

  // Create invoices
  const invoicesData = [
    {
      patientId: patients[0].id,
      invoiceNumber: 'INV-2024-001',
      items: [{ description: 'Composite Filling - Tooth #3', quantity: 1, unitPrice: 180 }],
      status: 'PAID' as InvoiceStatus,
    },
    {
      patientId: patients[2].id,
      invoiceNumber: 'INV-2024-002',
      items: [
        { description: 'Root Canal Treatment - Tooth #14', quantity: 1, unitPrice: 950 },
        { description: 'Porcelain Crown - Tooth #19', quantity: 1, unitPrice: 1200 },
      ],
      status: 'PARTIALLY_PAID' as InvoiceStatus,
    },
    {
      patientId: patients[6].id,
      invoiceNumber: 'INV-2024-003',
      items: [{ description: 'Dental Implant - Tooth #19', quantity: 1, unitPrice: 3500 }],
      status: 'PENDING' as InvoiceStatus,
    },
  ];

  for (const invoiceData of invoicesData) {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    const invoice = await prisma.invoice.create({
      data: {
        patientId: invoiceData.patientId,
        invoiceNumber: invoiceData.invoiceNumber,
        subtotal,
        tax,
        total,
        status: invoiceData.status,
        items: {
          create: invoiceData.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
    });

    if (invoiceData.status === 'PAID') {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: total,
          method: 'INSURANCE' as PaymentMethod,
          reference: 'INS-CLM-12345',
        },
      });
    } else if (invoiceData.status === 'PARTIALLY_PAID') {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: 1000,
          method: 'CREDIT_CARD' as PaymentMethod,
          reference: 'CC-TXN-67890',
        },
      });
    }
  }

  console.log(`Created ${invoicesData.length} invoices`);

  // Create supplies
  const suppliesData = [
    // Disposables
    {
      name: 'Disposable Gloves (Nitrile)',
      category: 'DISPOSABLE' as SupplyCategory,
      sku: 'GLV-NIT-M',
      description: 'Medium size nitrile examination gloves, powder-free',
      unit: 'box',
      currentStock: 25,
      minimumStock: 10,
      costPerUnit: 12.99,
      supplier: 'MedSupply Co.',
      location: 'Storage Room A',
    },
    {
      name: 'Face Masks (Level 3)',
      category: 'DISPOSABLE' as SupplyCategory,
      sku: 'MSK-L3-50',
      description: 'ASTM Level 3 surgical masks, box of 50',
      unit: 'box',
      currentStock: 15,
      minimumStock: 8,
      costPerUnit: 24.99,
      supplier: 'MedSupply Co.',
      location: 'Storage Room A',
    },
    {
      name: 'Cotton Rolls',
      category: 'DISPOSABLE' as SupplyCategory,
      sku: 'COT-ROL-2000',
      description: 'Non-sterile cotton rolls, pack of 2000',
      unit: 'pack',
      currentStock: 5,
      minimumStock: 3,
      costPerUnit: 18.50,
      supplier: 'DentalDirect',
      location: 'Operatory 1',
    },
    {
      name: 'Saliva Ejectors',
      category: 'DISPOSABLE' as SupplyCategory,
      sku: 'SAL-EJ-100',
      description: 'Disposable saliva ejectors, pack of 100',
      unit: 'pack',
      currentStock: 8,
      minimumStock: 5,
      costPerUnit: 8.99,
      supplier: 'DentalDirect',
      location: 'Operatory 1',
    },
    // Materials
    {
      name: 'Composite Resin A2',
      category: 'MATERIAL' as SupplyCategory,
      sku: 'CMP-A2-4G',
      description: 'Universal composite resin, shade A2, 4g syringe',
      unit: 'syringe',
      currentStock: 12,
      minimumStock: 6,
      costPerUnit: 45.00,
      supplier: '3M Dental',
      location: 'Material Cabinet',
    },
    {
      name: 'Dental Cement (Glass Ionomer)',
      category: 'MATERIAL' as SupplyCategory,
      sku: 'CEM-GI-KIT',
      description: 'Glass ionomer luting cement kit',
      unit: 'kit',
      currentStock: 3,
      minimumStock: 2,
      costPerUnit: 89.00,
      supplier: 'GC America',
      location: 'Material Cabinet',
    },
    {
      name: 'Impression Material (Alginate)',
      category: 'MATERIAL' as SupplyCategory,
      sku: 'IMP-ALG-1LB',
      description: 'Fast-set alginate impression material, 1lb canister',
      unit: 'canister',
      currentStock: 4,
      minimumStock: 2,
      costPerUnit: 32.00,
      supplier: 'Dentsply Sirona',
      location: 'Lab Area',
    },
    // Medications
    {
      name: 'Lidocaine 2% w/Epinephrine',
      category: 'MEDICATION' as SupplyCategory,
      sku: 'LID-2-EPI-50',
      description: 'Local anesthetic cartridges, box of 50',
      unit: 'box',
      currentStock: 6,
      minimumStock: 4,
      costPerUnit: 65.00,
      supplier: 'Patterson Dental',
      location: 'Medication Cabinet',
      expiryDate: new Date(today.getFullYear() + 1, 6, 15),
    },
    {
      name: 'Topical Anesthetic Gel',
      category: 'MEDICATION' as SupplyCategory,
      sku: 'TOP-GEL-30',
      description: 'Benzocaine 20% topical gel, 30g tube',
      unit: 'tube',
      currentStock: 8,
      minimumStock: 4,
      costPerUnit: 15.00,
      supplier: 'Patterson Dental',
      location: 'Medication Cabinet',
      expiryDate: new Date(today.getFullYear() + 2, 3, 1),
    },
    // PPE
    {
      name: 'Safety Glasses',
      category: 'PPE' as SupplyCategory,
      sku: 'PPE-GLASS-10',
      description: 'Protective eyewear, pack of 10',
      unit: 'pack',
      currentStock: 3,
      minimumStock: 2,
      costPerUnit: 29.99,
      supplier: 'MedSupply Co.',
      location: 'Storage Room A',
    },
    {
      name: 'Face Shields',
      category: 'PPE' as SupplyCategory,
      sku: 'PPE-SHIELD-25',
      description: 'Disposable face shields, pack of 25',
      unit: 'pack',
      currentStock: 2,
      minimumStock: 3,
      costPerUnit: 34.99,
      supplier: 'MedSupply Co.',
      location: 'Storage Room A',
    },
    // Instruments
    {
      name: 'Dental Mirror #5',
      category: 'INSTRUMENT' as SupplyCategory,
      sku: 'INS-MIR-5',
      description: 'Front surface dental mirror, size 5',
      unit: 'pcs',
      currentStock: 20,
      minimumStock: 10,
      costPerUnit: 8.50,
      supplier: 'Hu-Friedy',
      location: 'Instrument Storage',
    },
    {
      name: 'Explorer #23',
      category: 'INSTRUMENT' as SupplyCategory,
      sku: 'INS-EXP-23',
      description: 'Shepherd hook explorer',
      unit: 'pcs',
      currentStock: 15,
      minimumStock: 8,
      costPerUnit: 12.00,
      supplier: 'Hu-Friedy',
      location: 'Instrument Storage',
    },
    // Office
    {
      name: 'Patient Bibs',
      category: 'OFFICE' as SupplyCategory,
      sku: 'BIB-500',
      description: 'Disposable patient bibs, pack of 500',
      unit: 'pack',
      currentStock: 2,
      minimumStock: 2,
      costPerUnit: 45.00,
      supplier: 'DentalDirect',
      location: 'Storage Room B',
    },
    {
      name: 'Headrest Covers',
      category: 'OFFICE' as SupplyCategory,
      sku: 'HRC-500',
      description: 'Disposable headrest covers, pack of 500',
      unit: 'pack',
      currentStock: 1,
      minimumStock: 2,
      costPerUnit: 28.00,
      supplier: 'DentalDirect',
      location: 'Storage Room B',
    },
  ];

  for (const supplyData of suppliesData) {
    const supply = await prisma.supply.create({
      data: supplyData,
    });

    // Create initial stock transaction
    if (supplyData.currentStock > 0) {
      await prisma.stockTransaction.create({
        data: {
          supplyId: supply.id,
          type: 'IN',
          quantity: supplyData.currentStock,
          notes: 'Initial inventory',
        },
      });
    }
  }

  console.log(`Created ${suppliesData.length} supplies`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
