import React, { useState, useEffect } from 'react';
import { Plus, Download, Upload, Search, Edit2, SlidersHorizontal, RefreshCw, X, HelpCircle, Check, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { healthcareCatalogApi } from '../../lib/api';
import ImportModal from './ImportModal';
import toast from 'react-hot-toast';

const GlobalLabTestsPage = () => {
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTests, setTotalTests] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [importedToday, setImportedToday] = useState(0);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  
  // Category management
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    alternateNamesString: '',
    department: 'Pathology',
    category: '',
    sampleType: 'Blood',
    sampleVolume: '',
    sampleContainer: '',
    methodology: '',
    clinicalDescription: '',
    patientPreparation: '',
    referenceRange: '',
    normalReportingTime: '24 Hours',
    internalCode: '',
    loincCode: '',
    isActive: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Get categories
      const catRes = await healthcareCatalogApi.getCategories({ type: 'LAB' });
      setCategories(catRes?.data ?? catRes ?? []);

      // Get lab tests
      const params = {
        search,
        category: selectedCategory,
        department: selectedDept,
        page,
        limit: 10
      };
      const testRes = await healthcareCatalogApi.getLabTests(params);
      const data = testRes?.data ?? testRes ?? {};
      setTests(data.items || []);
      setTotalTests(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / 10));

      // Calculate totals
      if (data.items) {
        setActiveCount(data.items.filter(t => t.isActive).length); // simple estimate based on items
        // In real app, we'd fetch this from stats endpoint or calculate
      }
    } catch (err) {
      toast.error('Failed to load global test catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, selectedDept, page]);

  const handleOpenAdd = () => {
    setEditingTest(null);
    setFormData({
      name: '',
      shortName: '',
      alternateNamesString: '',
      department: 'Pathology',
      category: categories[0]?._id || '',
      sampleType: 'Blood',
      sampleVolume: '',
      sampleContainer: '',
      methodology: '',
      clinicalDescription: '',
      patientPreparation: '',
      referenceRange: '',
      normalReportingTime: '24 Hours',
      internalCode: '',
      loincCode: '',
      isActive: true
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (test) => {
    setEditingTest(test);
    setFormData({
      ...test,
      category: test.category?._id || test.category || '',
      alternateNamesString: (test.alternateNames || []).join(', ')
    });
    setIsAddOpen(true);
  };

  const handleSubmitTest = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        alternateNames: formData.alternateNamesString
          ? formData.alternateNamesString.split(',').map(s => s.trim()).filter(Boolean)
          : []
      };

      if (editingTest) {
        await healthcareCatalogApi.updateLabTest(editingTest._id, payload);
        toast.success('Test updated successfully');
      } else {
        await healthcareCatalogApi.createLabTest(payload);
        toast.success('Lab Test created successfully');
      }
      setIsAddOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save test');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      await healthcareCatalogApi.createCategory({
        name: newCategoryName,
        type: 'LAB',
        description: newCategoryDesc
      });
      toast.success('Category added successfully');
      setNewCategoryName('');
      setNewCategoryDesc('');
      setIsCategoryOpen(false);
      // Reload categories
      const catRes = await healthcareCatalogApi.getCategories({ type: 'LAB' });
      setCategories(catRes?.data ?? catRes ?? []);
    } catch (err) {
      toast.error('Failed to create category');
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Test Name',
      'Short Name',
      'Alternate Names',
      'Department',
      'Category',
      'Sample Type',
      'Sample Volume',
      'Sample Container',
      'Methodology',
      'Clinical Description',
      'Patient Preparation',
      'Reference Range',
      'Reporting Time',
      'Internal Code',
      'LOINC Code'
    ];
    
    const sampleRow = [
      'Complete Blood Count',
      'CBC',
      'Hemogram, CBC with Platelets',
      'Hematology',
      'Hematology',
      'Blood',
      '2 ml',
      'EDTA Purple Top',
      'Automated Cell Counter',
      'Screens for anemias and infections',
      'No fasting required',
      'Hb: 12-16 g/dL',
      '12 Hours',
      'INT-CBC-01',
      '58410-2'
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), sampleRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'lab_test_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportData = () => {
    if (tests.length === 0) {
      toast.error('No tests to export');
      return;
    }
    const headers = ['Global ID', 'Test Name', 'Short Name', 'Category', 'Department', 'Sample Type', 'Reporting Time', 'Status'];
    const rows = tests.map(t => [
      t.globalId,
      t.name,
      t.shortName || '',
      t.category?.name || '',
      t.department,
      t.sampleType,
      t.normalReportingTime,
      t.isActive ? 'Active' : 'Inactive'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'global_lab_tests_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Global Laboratory Tests
            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">Master Catalog</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage global lab investigations, properties, and direct import mappings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoryOpen(true)}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition"
          >
            Manage Categories
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition"
          >
            <Download className="w-4 h-4" /> Template
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition"
          >
            <Upload className="w-4 h-4" /> Import Excel
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-2xl hover:opacity-95 transition shadow-lg shadow-blue-100"
          >
            <Plus className="w-4 h-4" /> Add Test
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-black text-slate-400 uppercase block tracking-wider">Total Tests</span>
          <span className="text-3xl font-black text-slate-800 mt-2 block">{totalTests}</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-black text-slate-400 uppercase block tracking-wider">Categories</span>
          <span className="text-3xl font-black text-slate-800 mt-2 block">{categories.length}</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-black text-slate-400 uppercase block tracking-wider">Active Investigations</span>
          <span className="text-3xl font-black text-emerald-600 mt-2 block">{activeCount}</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-xs font-black text-slate-400 uppercase block tracking-wider">Exportable Lists</span>
          <button onClick={handleExportData} className="mt-2 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
            <FileSpreadsheet className="w-4 h-4" /> Download Full CSV
          </button>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        {/* Table Filters */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by test name, synonyms, ID, or methodology..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-2xl focus:outline-none"
            >
              <option value="">All Departments</option>
              <option value="Hematology">Hematology</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Immunology">Immunology</option>
              <option value="Pathology">Pathology</option>
            </select>
          </div>
        </div>

        {/* Lab Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                <th className="px-6 py-4">Test ID</th>
                <th className="px-6 py-4">Test Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Sample Type</th>
                <th className="px-6 py-4">Reporting Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Fetching master lab catalog...
                  </td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No laboratory tests matched your filter.
                  </td>
                </tr>
              ) : (
                tests.map((test) => (
                  <tr key={test._id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{test.globalId}</td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-slate-800 block">{test.name}</span>
                        {test.shortName && <span className="text-xs text-slate-400 block mt-0.5">Short: {test.shortName}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">{test.category?.name || 'General'}</td>
                    <td className="px-6 py-4">{test.department}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-600">{test.sampleType}</span>
                    </td>
                    <td className="px-6 py-4">{test.normalReportingTime}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${test.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {test.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleOpenEdit(test)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600 inline-flex items-center gap-1">
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-bold">Showing page {page} of {totalPages || 1}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">{editingTest ? 'Modify Global Test' : 'Add New Global Test'}</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTest} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Test Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Short Name</label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase">Alternate Names / Synonyms (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Hemogram, CBC, Complete Blood"
                  value={formData.alternateNamesString}
                  onChange={(e) => setFormData({ ...formData, alternateNamesString: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  >
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Department</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Sample Type</label>
                  <input
                    type="text"
                    required
                    value={formData.sampleType}
                    onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Sample Volume</label>
                  <input
                    type="text"
                    value={formData.sampleVolume}
                    onChange={(e) => setFormData({ ...formData, sampleVolume: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Sample Container</label>
                  <input
                    type="text"
                    value={formData.sampleContainer}
                    onChange={(e) => setFormData({ ...formData, sampleContainer: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Methodology</label>
                  <input
                    type="text"
                    value={formData.methodology}
                    onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Normal Reporting Time</label>
                  <input
                    type="text"
                    required
                    value={formData.normalReportingTime}
                    onChange={(e) => setFormData({ ...formData, normalReportingTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">Internal Code</label>
                  <input
                    type="text"
                    value={formData.internalCode}
                    onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 uppercase">LOINC Code</label>
                  <input
                    type="text"
                    value={formData.loincCode}
                    onChange={(e) => setFormData({ ...formData, loincCode: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase">Reference Range (Optional)</label>
                <textarea
                  value={formData.referenceRange}
                  onChange={(e) => setFormData({ ...formData, referenceRange: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none min-h-[60px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase">Clinical Description</label>
                <textarea
                  value={formData.clinicalDescription}
                  onChange={(e) => setFormData({ ...formData, clinicalDescription: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none min-h-[60px]"
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">Mark Investigation as Active</label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-95 transition shadow-lg shadow-blue-100">Save Investigation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {isCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Manage Master Categories</h3>
              <button onClick={() => setIsCategoryOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <form onSubmit={handleCreateCategory} className="space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Create Category</h4>
                <input
                  type="text"
                  placeholder="Category Name (e.g. Hematology)"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
                />
                <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
                  Create Category
                </button>
              </form>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Existing Categories</h4>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {categories.map(c => (
                    <div key={c._id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-700">{c.name}</span>
                      <span className="text-xs text-slate-400">{c.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        importType="LAB"
        onImportComplete={loadData}
      />
    </div>
  );
};

export default GlobalLabTestsPage;
