const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');
let app;
let CatalogCategory;
let GlobalLabTest;
let GlobalGenericMedicine;
let GlobalBrand;
let User;

beforeAll(() => {
  app = require('../src/app');
  CatalogCategory = require('../src/modules/healthcare-catalog/catalogCategory.model');
  GlobalLabTest = require('../src/modules/healthcare-catalog/globalLabTest.model');
  GlobalGenericMedicine = require('../src/modules/healthcare-catalog/globalGenericMedicine.model');
  GlobalBrand = require('../src/modules/healthcare-catalog/globalBrand.model');
  User = require('../src/modules/users/user.model');
});

describe('Healthcare Catalog API Suite', () => {
  let superAdminToken;
  let clinicAdminToken;
  let testCategory;
  let medicineCategory;

  beforeEach(async () => {
    await User.deleteMany({});
    await CatalogCategory.deleteMany({});
    await GlobalLabTest.deleteMany({});
    await GlobalGenericMedicine.deleteMany({});
    await GlobalBrand.deleteMany({});

    // Seed Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@example.com',
      password: 'SuperPassword123!',
      role: ROLES.SUPER_ADMIN,
      isActive: true
    });
    const saLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@example.com',
      password: 'SuperPassword123!'
    });
    superAdminToken = saLoginRes.body.data.accessToken;

    // Seed Clinic Admin
    const clinicAdmin = await User.create({
      name: 'Clinic Admin',
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      role: ROLES.ADMIN,
      isActive: true
    });
    const caLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@example.com',
      password: 'AdminPassword123!'
    });
    clinicAdminToken = caLoginRes.body.data.accessToken;

    // Seed some categories
    testCategory = await CatalogCategory.create({
      name: 'Biochemistry',
      type: 'LAB',
      description: 'Lab category'
    });

    medicineCategory = await CatalogCategory.create({
      name: 'Analgesics',
      type: 'MEDICINE',
      description: 'Medicine category'
    });
  });

  describe('Authorization Checks', () => {
    it('denies access to non-Super Admins (e.g. Clinic Admin) for categories', async () => {
      const res = await request(app)
        .get('/api/v1/healthcare-catalog/categories')
        .set('Authorization', `Bearer ${clinicAdminToken}`);
      expect(res.status).toBe(403);
    });

    it('allows access to Super Admin for categories listing', async () => {
      const res = await request(app)
        .get('/api/v1/healthcare-catalog/categories')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('Laboratory Catalog APIs', () => {
    it('creates a new global lab test with automatically generated sequential ID', async () => {
      const payload = {
        name: 'Thyroid Stimulating Hormone',
        shortName: 'TSH',
        alternateNamesString: 'Thyrotropin, S.TSH',
        department: 'Biochemistry',
        category: testCategory._id,
        sampleType: 'Blood',
        sampleVolume: '2 ml',
        sampleContainer: 'SST Gold Top',
        normalReportingTime: '12 Hours',
        isActive: true
      };

      const res = await request(app)
        .post('/api/v1/healthcare-catalog/labs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.globalId).toBeDefined();
      expect(res.body.data.globalId).toMatch(/^LAB-\d{6}$/);
      expect(res.body.data.name).toBe('Thyroid Stimulating Hormone');
    });

    it('prevents creating duplicate tests with exact same name', async () => {
      await GlobalLabTest.create({
        globalId: 'LAB-000001',
        name: 'Thyroid Stimulating Hormone',
        department: 'Biochemistry',
        category: testCategory._id,
        sampleType: 'Blood',
        normalReportingTime: '12 Hours'
      });

      const payload = {
        name: 'Thyroid Stimulating Hormone',
        department: 'Biochemistry',
        category: testCategory._id,
        sampleType: 'Blood',
        normalReportingTime: '12 Hours'
      };

      const res = await request(app)
        .post('/api/v1/healthcare-catalog/labs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(payload);

      expect(res.status).toBe(409);
    });
  });

  describe('Medicine Catalog APIs', () => {
    it('creates generic, brand-first pending classification, and combination medicines', async () => {
      // 1. Create Generic Medicine
      const genRes = await request(app)
        .post('/api/v1/healthcare-catalog/medicines')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          medicineType: 'Generic',
          genericName: 'Metformin',
          strength: '500mg',
          dosageForm: 'Tablet',
          category: medicineCategory._id,
          route: 'Oral'
        });

      expect(genRes.status).toBe(201);
      expect(genRes.body.data.medicineType).toBe('Generic');
      expect(genRes.body.data.globalId).toMatch(/^MED-\d{6}$/);

      // 2. Create Brand-First Medicine (without generic mapping - should default to Pending Classification)
      const brandFirstRes = await request(app)
        .post('/api/v1/healthcare-catalog/medicines')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          medicineType: 'Brand-First',
          brandName: 'Dolo 650',
          manufacturer: 'Micro Labs',
          strength: '650mg',
          dosageForm: 'Tablet',
          category: medicineCategory._id,
          route: 'Oral'
        });

      expect(brandFirstRes.status).toBe(201);
      expect(brandFirstRes.body.data.medicineType).toBe('Brand-First');
      expect(brandFirstRes.body.data.classificationStatus).toBe('Pending Classification');

      // 3. Create Combination Medicine
      const comboRes = await request(app)
        .post('/api/v1/healthcare-catalog/medicines')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          medicineType: 'Combination',
          displayName: 'Augmentin 625',
          manufacturer: 'GSK',
          dosageForm: 'Tablet',
          category: medicineCategory._id,
          activeIngredients: [
            { name: 'Amoxicillin', strength: '500mg' },
            { name: 'Clavulanic Acid', strength: '125mg' }
          ]
        });

      expect(comboRes.status).toBe(201);
      expect(comboRes.body.data.medicineType).toBe('Combination');
      expect(comboRes.body.data.activeIngredients).toHaveLength(2);

      // 4. Classify Pending Brand-First Medicine
      const brandFirstId = brandFirstRes.body.data._id;
      const classifyRes = await request(app)
        .put(`/api/v1/healthcare-catalog/medicines/${brandFirstId}/classify`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          medicineType: 'Generic',
          genericName: 'Paracetamol',
          strength: '650mg',
          classificationStatus: 'Verified'
        });

      expect(classifyRes.status).toBe(200);
      expect(classifyRes.body.data.classificationStatus).toBe('Verified');
      expect(classifyRes.body.data.genericName).toBe('Paracetamol');
      // ID must remain unchanged
      expect(classifyRes.body.data.globalId).toBe(brandFirstRes.body.data.globalId);
    });
  });

  describe('Import & Excel Parsing Engine', () => {
    it('correctly parses 2D rows with category division headings and merges internal duplicates', async () => {
      const xlsx = require('xlsx');
      const { previewImport } = require('../src/modules/healthcare-catalog/healthcareCatalog.service');

      const data = [
        ['Partner Laboratory Price List - Apollo'], // Skip title
        [], // Skip blank
        ['INVESTIGATION', 'SAMPLE', 'METHODOLOGY', 'REPORTING TIME', 'MRP', 'B TO B'], // Header Row
        ['Haematology'], // Category Heading Row
        ['Haemoglobin', 'EDTA (3ml)', 'Cyanmethemoglobin', 'Same Day', '100', '50'], // Valid test row
        ['Haemoglobin', 'EDTA (3ml)', 'Cyanmethemoglobin', 'Same Day', '100', '50'], // Duplicate within sheet (should be merged)
        ['Biochemistry'], // New Category Heading Row
        ['Blood Sugar Random', 'Fluoride', 'GOD-POD', '1 Hour', '80', '40'] // Valid test row
      ];

      const ws = xlsx.utils.aoa_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const base64 = buffer.toString('base64');

      const preview = await previewImport(base64, 'LAB');

      expect(preview).toHaveLength(2);
      expect(preview[0].data.name).toBe('Haemoglobin');
      expect(preview[0].data.categoryName).toBe('Haematology');
      expect(preview[1].data.name).toBe('Blood Sugar Random');
      expect(preview[1].data.categoryName).toBe('Biochemistry');
    });
  });
});
