import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Download, Upload, X, RefreshCw, Edit2, SlidersHorizontal, ArrowLeft, ArrowRight, Eye, ShieldCheck, Check, Trash, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { healthcareCatalogApi } from '../../lib/api';

const GlobalParametersPage = () => {
  const [parameters, setParameters] = useState([]);
  const [units, setUnits] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offsetRef] = useState({ current: 0 }); // mutable ref to current offset
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const pageSizeRef = useRef(20);

  // Summary Metrics
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [numericCount, setNumericCount] = useState(0);
  const [qualitativeCount, setQualitativeCount] = useState(0);

  // Modals & Panels
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [isSavingCondition, setIsSavingCondition] = useState(false);
  const [conditionForm, setConditionForm] = useState({ name: '', type: '', description: '', isActive: true });
  const [editingParameter, setEditingParameter] = useState(null);
  const [viewingParameter, setViewingParameter] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    alternateNames: [],
    code: '',
    loincCode: '',
    resultType: 'NUMERIC',
    defaultUnitId: '',
    decimalPrecision: 1,
    technicalMin: '',
    technicalMax: '',
    criticalLow: '',
    criticalHigh: '',
    description: '',
    referenceRanges: [],
    allowedValues: [],
    isActive: true
  });

  // Local state inputs for chips and row editing
  const [altInput, setAltInput] = useState('');
  const [allowedValForm, setAllowedValForm] = useState({ value: '', isAbnormal: false, isCritical: false });
  const [newRange, setNewRange] = useState({
    gender: 'ALL',
    ageFrom: '',
    ageTo: '',
    ageUnit: 'YEARS',
    conditionId: '',
    lowerOperator: 'Between',
    upperOperator: 'Between',
    lowerValue: '',
    upperValue: '',
    fromValue: '',
    toValue: '',
    pregnancyStatus: 'ANY',
    specimenType: '',
    unitId: ''
  });

  // Inline range editing
  const [editingRangeIdx, setEditingRangeIdx] = useState(null);
  const [rangeError, setRangeError] = useState(null);
  const [ageValidationErrors, setAgeValidationErrors] = useState({ ageFrom: false, ageTo: false });

  // New Unit Form State
  const [unitForm, setUnitForm] = useState({
    name: '',
    symbol: '',
    category: '',
    description: ''
  });

  // Refs for infinite scroll
  const tableContainerRef = useRef(null);
  const sentinelRef = useRef(null);
  const isLoadingRef = useRef(false); // prevents duplicate parallel calls
  const currentFiltersRef = useRef({ search: '', selectedType: '', selectedStatus: '', selectedUnit: '', pageSize: 20 });

  // ─── Load metrics from real API ─────────────────────────────────────────────
  const loadMetrics = useCallback(async () => {
    try {
      const [totalRes, activeRes, numericRes, qualRes] = await Promise.all([
        healthcareCatalogApi.getParameters({ limit: 1 }),
        healthcareCatalogApi.getParameters({ status: 'Active', limit: 1 }),
        healthcareCatalogApi.getParameters({ resultType: 'NUMERIC', limit: 1 }),
        healthcareCatalogApi.getParameters({ resultType: 'QUALITATIVE', limit: 1 })
      ]);
      setTotalCount(totalRes?.data?.total ?? totalRes?.total ?? 0);
      setActiveCount(activeRes?.data?.total ?? activeRes?.total ?? 0);
      setNumericCount(numericRes?.data?.total ?? numericRes?.total ?? 0);
      setQualitativeCount(qualRes?.data?.total ?? qualRes?.total ?? 0);
    } catch (_) { /* metrics are best-effort */ }
  }, []);

  // ─── Load support data (units + conditions) ─────────────────────────────────
  const loadSupportData = useCallback(async () => {
    try {
      const [unitsRes, condRes] = await Promise.all([
        healthcareCatalogApi.getUnits(),
        healthcareCatalogApi.getConditions()
      ]);
      setUnits(unitsRes?.data || unitsRes || []);
      setConditions(condRes?.data || condRes || []);
    } catch (_) { /* non-critical */ }
  }, []);

  // ─── INITIAL LOAD: reset list and fetch first batch ─────────────────────────
  const loadInitial = useCallback(async (filters) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    setParameters([]);
    setHasMore(true);
    offsetRef.current = 0;
    try {
      const res = await healthcareCatalogApi.getParameters({
        search: filters.search,
        resultType: filters.selectedType,
        status: filters.selectedStatus,
        defaultUnitId: filters.selectedUnit,
        page: 1,
        limit: filters.pageSize
      });
      const data = res?.data ?? res ?? {};
      const items = data.items || [];
      const total = data.total || 0;
      setParameters(items);
      offsetRef.current = items.length;
      setHasMore(items.length < total);
    } catch (err) {
      toast.error('Failed to load parameters');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // ─── APPEND: load next batch and append ────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;
    isLoadingRef.current = true;
    setIsLoadingMore(true);
    const filters = currentFiltersRef.current;
    const currentOffset = offsetRef.current;
    const batchSize = filters.pageSize;
    const nextPage = Math.floor(currentOffset / batchSize) + 1;
    try {
      const res = await healthcareCatalogApi.getParameters({
        search: filters.search,
        resultType: filters.selectedType,
        status: filters.selectedStatus,
        defaultUnitId: filters.selectedUnit,
        page: nextPage + 1,
        limit: batchSize
      });
      const data = res?.data ?? res ?? {};
      const items = data.items || [];
      const total = data.total || 0;
      if (items.length > 0) {
        setParameters(prev => {
          // Deduplicate by _id
          const existingIds = new Set(prev.map(p => p._id));
          const newItems = items.filter(item => !existingIds.has(item._id));
          const merged = [...prev, ...newItems];
          offsetRef.current = merged.length;
          return merged;
        });
        setHasMore(offsetRef.current < total);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      toast.error('Failed to load more parameters');
    } finally {
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [hasMore]);

  // ─── Effect: trigger initial load when filters change ───────────────────────
  useEffect(() => {
    const filters = { search, selectedType, selectedStatus, selectedUnit, pageSize };
    currentFiltersRef.current = filters;
    pageSizeRef.current = pageSize;
    loadInitial(filters);
    loadMetrics();
  }, [search, selectedType, selectedStatus, selectedUnit, pageSize]);

  // ─── Effect: load support data once on mount ────────────────────────────────
  useEffect(() => {
    loadSupportData();
  }, []);

  // ─── Effect: IntersectionObserver for infinite scroll sentinel ───────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingRef.current && hasMore && !loading) {
          loadMore();
        }
      },
      { root: tableContainerRef.current, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);


  // When defaultUnitId changes in form, pre-populate in new reference range
  useEffect(() => {
    if (formData.defaultUnitId) {
      setNewRange(prev => ({ ...prev, unitId: formData.defaultUnitId }));
    }
  }, [formData.defaultUnitId]);

  const handleOpenAdd = () => {
    setEditingParameter(null);
    setFormData({
      name: '',
      shortName: '',
      alternateNames: [],
      code: '',
      loincCode: '',
      resultType: 'NUMERIC',
      defaultUnitId: '',
      decimalPrecision: 1,
      technicalMin: '',
      technicalMax: '',
      criticalLow: '',
      criticalHigh: '',
      description: '',
      referenceRanges: [],
      allowedValues: [],
      isActive: true
    });
    setAltInput('');
    setAllowedValForm({ value: '', isAbnormal: false, isCritical: false });
    setNewRange({
      gender: 'ALL',
      ageFrom: '',
      ageTo: '',
      ageUnit: 'YEARS',
      conditionId: '',
      lowerOperator: 'Between',
      upperOperator: 'Between',
      lowerValue: '',
      upperValue: '',
      fromValue: '',
      toValue: '',
      pregnancyStatus: 'ANY',
      specimenType: '',
      unitId: ''
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (param) => {
    setEditingParameter(param);
    setEditingRangeIdx(null);

    // Normalize and deduplicate reference ranges when loading from DB
    const rawRanges = (param.referenceRanges || []).map(r => ({
      ...r,
      unitId: r.unitId?._id || r.unitId || '',
      conditionId: r.conditionId?._id || r.conditionId || '',
      lowerOperator: r.lowerOperator || 'Between',
      upperOperator: r.upperOperator || 'Between',
      lowerValue: r.lowerValue !== undefined ? r.lowerValue : r.fromValue,
      upperValue: r.upperValue !== undefined ? r.upperValue : r.toValue,
      fromValue: r.lowerValue !== undefined ? r.lowerValue : r.fromValue,
      toValue: r.upperValue !== undefined ? r.upperValue : r.toValue,
      pregnancyStatus: r.pregnancyStatus || 'ANY',
      specimenType: r.specimenType || ''
    }));
    const seenKeys = new Map();
    for (const r of rawRanges) {
      const key = [r.gender, r.ageFrom ?? '', r.ageTo ?? '', r.ageUnit ?? '', r.conditionId ?? '', r.lowerValue, r.upperValue, r.unitId ?? '', r.pregnancyStatus, r.specimenType].join('|');
      seenKeys.set(key, r);
    }
    const dedupedRanges = Array.from(seenKeys.values());

    setFormData({
      ...param,
      defaultUnitId: param.defaultUnitId?._id || param.defaultUnitId || '',
      alternateNames: param.alternateNames || [],
      allowedValues: param.allowedValues || [],
      technicalMin: param.technicalMin !== undefined && param.technicalMin !== null ? param.technicalMin : '',
      technicalMax: param.technicalMax !== undefined && param.technicalMax !== null ? param.technicalMax : '',
      criticalLow: param.criticalLow !== undefined && param.criticalLow !== null ? param.criticalLow : '',
      criticalHigh: param.criticalHigh !== undefined && param.criticalHigh !== null ? param.criticalHigh : '',
      referenceRanges: dedupedRanges
    });
    setAltInput('');
    setAllowedValForm({ value: '', isAbnormal: false, isCritical: false });
    setNewRange({
      gender: 'ALL',
      ageFrom: '',
      ageTo: '',
      ageUnit: 'YEARS',
      conditionId: '',
      lowerOperator: 'Between',
      upperOperator: 'Between',
      lowerValue: '',
      upperValue: '',
      fromValue: '',
      toValue: '',
      pregnancyStatus: 'ANY',
      specimenType: '',
      unitId: param.defaultUnitId?._id || param.defaultUnitId || ''
    });
    setIsAddOpen(true);
  };

  // Alternate Names Chip Helpers
  const addAltName = () => {
    const trimmed = altInput.trim();
    if (!trimmed) return;
    if (formData.alternateNames.includes(trimmed)) {
      toast.error('Alternate name already exists');
      return;
    }
    setFormData({
      ...formData,
      alternateNames: [...formData.alternateNames, trimmed]
    });
    setAltInput('');
  };

  const removeAltName = (indexToRemove) => {
    setFormData({
      ...formData,
      alternateNames: formData.alternateNames.filter((_, idx) => idx !== indexToRemove)
    });
  };

  // Allowed Values Chip Helpers
  const addAllowedValue = () => {
    const trimmed = allowedValForm.value.trim();
    if (!trimmed) return;
    const code = trimmed.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (formData.allowedValues.some(v => v.value.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Allowed value already exists');
      return;
    }
    setFormData({
      ...formData,
      allowedValues: [
        ...formData.allowedValues,
        {
          value: trimmed,
          displayName: trimmed,
          code,
          isAbnormal: allowedValForm.isAbnormal,
          isCritical: allowedValForm.isCritical,
          isActive: true
        }
      ]
    });
    setAllowedValForm({ value: '', isAbnormal: false, isCritical: false });
  };

  const removeAllowedValue = (indexToRemove) => {
    setFormData({
      ...formData,
      allowedValues: formData.allowedValues.filter((_, idx) => idx !== indexToRemove)
    });
  };

  // Reference Ranges Table Helpers
  const defaultRangeState = {
    gender: 'ALL',
    ageFrom: '',
    ageTo: '',
    ageUnit: 'YEARS',
    conditionId: '',
    lowerOperator: 'Between',
    upperOperator: 'Between',
    lowerValue: '',
    upperValue: '',
    fromValue: '',
    toValue: '',
    pregnancyStatus: 'ANY',
    specimenType: '',
    unitId: ''
  };

  const startEditRange = (range, idx) => {
    setEditingRangeIdx(idx);
    setRangeError(null);
    setNewRange({
      gender: range.gender || 'ALL',
      ageFrom: range.ageFrom != null ? String(range.ageFrom) : '',
      ageTo: range.ageTo != null ? String(range.ageTo) : '',
      ageUnit: range.ageUnit || 'YEARS',
      conditionId: range.conditionId?._id || range.conditionId || '',
      lowerOperator: range.lowerOperator || 'Between',
      upperOperator: range.upperOperator || 'Between',
      lowerValue: range.lowerValue !== undefined && range.lowerValue !== null ? String(range.lowerValue) : (range.fromValue != null ? String(range.fromValue) : ''),
      upperValue: range.upperValue !== undefined && range.upperValue !== null ? String(range.upperValue) : (range.toValue != null ? String(range.toValue) : ''),
      fromValue: range.lowerValue !== undefined && range.lowerValue !== null ? String(range.lowerValue) : (range.fromValue != null ? String(range.fromValue) : ''),
      toValue: range.upperValue !== undefined && range.upperValue !== null ? String(range.upperValue) : (range.toValue != null ? String(range.toValue) : ''),
      pregnancyStatus: range.pregnancyStatus || 'ANY',
      specimenType: range.specimenType || '',
      unitId: range.unitId?._id || range.unitId || ''
    });
  };

  const cancelEditRange = () => {
    setEditingRangeIdx(null);
    setRangeError(null);
    setNewRange(defaultRangeState);
  };

  // Build a human-readable label for a gender+age+condition identity
  const rangeIdentityLabel = (r) => {
    const gLabel = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other', ALL: 'All' };
    const gender = gLabel[r.gender] || r.gender;
    const ageFrom = r.ageFrom != null ? parseFloat(r.ageFrom) : null;
    const ageTo = r.ageTo != null ? parseFloat(r.ageTo) : null;
    const ageUnitLabel = r.ageUnit ? r.ageUnit.charAt(0) + r.ageUnit.slice(1).toLowerCase() : 'Years';
    let ageStr = 'all ages';
    if (ageFrom != null && ageTo != null) ageStr = `age ${ageFrom}\u2013${ageTo} ${ageUnitLabel}`;
    else if (ageFrom != null) ageStr = `age ${ageFrom}+ ${ageUnitLabel}`;
    else if (ageTo != null) ageStr = `age <${ageTo} ${ageUnitLabel}`;
    const condObj = conditions.find(c => c._id === r.conditionId);
    const condName = condObj?.name || (r.conditionId ? r.conditionId : 'None');
    return `${gender}, ${ageStr}, condition "${condName}"`;
  };

  const addOrUpdateReferenceRange = () => {
    // 1. Required numeric range fields validation
    const lowerValParsed = parseFloat(newRange.lowerValue);
    const upperValParsed = parseFloat(newRange.upperValue);

    if (newRange.lowerOperator === 'Between') {
      if (isNaN(lowerValParsed) || isNaN(upperValParsed)) {
        toast.error('Lower and Upper boundary values must be valid numbers');
        return;
      }
      if (lowerValParsed > upperValParsed) {
        toast.error('Lower boundary cannot be greater than upper boundary');
        return;
      }
    } else {
      if (isNaN(lowerValParsed)) {
        toast.error('Boundary value must be a valid number');
        return;
      }
    }

    if (!newRange.unitId) {
      toast.error('Unit is required for reference range');
      return;
    }

    // 2. Age boundaries validation
    const ageFromVal = newRange.ageFrom !== '' ? parseFloat(newRange.ageFrom) : null;
    const ageToVal = newRange.ageTo !== '' ? parseFloat(newRange.ageTo) : null;

    if (newRange.ageFrom !== '' || newRange.ageTo !== '') {
      if (newRange.ageFrom === '' || newRange.ageTo === '') {
        setAgeValidationErrors({
          ageFrom: newRange.ageFrom === '',
          ageTo: newRange.ageTo === ''
        });
        toast.error('Both Age From and Age To are required to configure an age range.');
        return;
      }

      if (isNaN(ageFromVal) || isNaN(ageToVal) || ageFromVal < 0 || ageToVal < 0) {
        setAgeValidationErrors({
          ageFrom: isNaN(ageFromVal) || ageFromVal < 0,
          ageTo: isNaN(ageToVal) || ageToVal < 0
        });
        toast.error('Age values must be valid non-negative numbers.');
        return;
      }

      if (ageFromVal >= ageToVal) {
        setAgeValidationErrors({ ageFrom: true, ageTo: true });
        toast.error('Age From must be less than Age To.');
        return;
      }
    }

    setAgeValidationErrors({ ageFrom: false, ageTo: false });

    // Identity key: only the 7 discriminating dimensions
    const identityMatch = (r) => {
      const rCondId = r.conditionId?._id || r.conditionId || null;
      const newCondId = newRange.conditionId || null;
      const rAgeFrom = r.ageFrom != null ? Number(r.ageFrom) : null;
      const rAgeTo   = r.ageTo   != null ? Number(r.ageTo)   : null;
      const newAgeFrom = newRange.ageFrom !== '' ? parseFloat(newRange.ageFrom) : null;
      const newAgeTo   = newRange.ageTo   !== '' ? parseFloat(newRange.ageTo)   : null;
      return (
        r.gender === newRange.gender &&
        rAgeFrom === newAgeFrom &&
        rAgeTo   === newAgeTo &&
        (r.ageUnit || '') === (newRange.ageUnit || '') &&
        String(rCondId ?? '') === String(newCondId ?? '') &&
        (r.pregnancyStatus || 'ANY') === newRange.pregnancyStatus &&
        (r.specimenType || '') === newRange.specimenType
      );
    };

    const newEntry = {
      gender: newRange.gender,
      ageFrom: newRange.ageFrom !== '' ? parseFloat(newRange.ageFrom) : null,
      ageTo:   newRange.ageTo   !== '' ? parseFloat(newRange.ageTo)   : null,
      ageUnit: newRange.ageFrom ? newRange.ageUnit : '',
      conditionId: newRange.conditionId || null,
      lowerOperator: newRange.lowerOperator,
      upperOperator: newRange.upperOperator,
      lowerValue: lowerValParsed,
      upperValue: newRange.lowerOperator === 'Between' ? upperValParsed : null,
      fromValue: lowerValParsed,
      toValue: newRange.lowerOperator === 'Between' ? upperValParsed : null,
      pregnancyStatus: newRange.pregnancyStatus,
      specimenType: newRange.specimenType,
      unitId: newRange.unitId
    };

    const displayGender = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other', ALL: 'All' }[newRange.gender] || newRange.gender;
    const displayAgeFrom = newRange.ageFrom !== '' ? parseFloat(newRange.ageFrom) : null;
    const displayAgeTo = newRange.ageTo !== '' ? parseFloat(newRange.ageTo) : null;
    const displayAgeUnit = newRange.ageUnit ? newRange.ageUnit.charAt(0) + newRange.ageUnit.slice(1).toLowerCase() : 'Years';
    let displayAgeStr = 'All Ages';
    if (displayAgeFrom != null && displayAgeTo != null) displayAgeStr = `${displayAgeFrom}–${displayAgeTo} ${displayAgeUnit}`;
    else if (displayAgeFrom != null) displayAgeStr = `${displayAgeFrom}+ ${displayAgeUnit}`;
    else if (displayAgeTo != null) displayAgeStr = `<${displayAgeTo} ${displayAgeUnit}`;

    const condObj = conditions.find(c => c._id === newRange.conditionId);
    const condName = condObj?.name || (newRange.conditionId ? newRange.conditionId : 'None');

    const formattedIdentityStr = `${displayGender}, ${displayAgeStr}, Condition: ${condName}, Preg: ${newRange.pregnancyStatus}, Specimen: ${newRange.specimenType || 'Any'}`;

    if (editingRangeIdx !== null) {
      // Preserve _id if it came from the database
      const existingId = formData.referenceRanges[editingRangeIdx]._id;
      if (existingId) newEntry._id = existingId;

      // Duplicate check
      const conflict = formData.referenceRanges.some((r, i) => i !== editingRangeIdx && identityMatch(r));
      if (conflict) {
        const errorMsg = `A range already exists for ${formattedIdentityStr}.`;
        toast.error(errorMsg);
        setRangeError(errorMsg);
        return;
      }

      const updatedRanges = formData.referenceRanges.map((r, i) =>
        i === editingRangeIdx ? newEntry : r
      );
      setFormData({ ...formData, referenceRanges: updatedRanges });
      setEditingRangeIdx(null);
      setRangeError(null);
      setNewRange(defaultRangeState);
      toast.success(`Reference range updated success.`);
      return;
    }

    const conflict = formData.referenceRanges.some(identityMatch);
    if (conflict) {
      const errorMsg = `A range already exists for ${formattedIdentityStr}.`;
      toast.error(errorMsg);
      setRangeError(errorMsg);
      return;
    }

    setRangeError(null);
    setFormData({
      ...formData,
      referenceRanges: [...formData.referenceRanges, newEntry]
    });
    setNewRange({ ...newRange, lowerValue: '', upperValue: '', fromValue: '', toValue: '' });
    toast.success(`Reference range added successfully.`);
  };

  const removeReferenceRange = (indexToRemove) => {
    if (editingRangeIdx === indexToRemove) {
      setEditingRangeIdx(null);
      setNewRange(defaultRangeState);
    } else if (editingRangeIdx !== null && indexToRemove < editingRangeIdx) {
      setEditingRangeIdx(editingRangeIdx - 1);
    }
    setFormData({
      ...formData,
      referenceRanges: formData.referenceRanges.filter((_, idx) => idx !== indexToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.resultType === 'NUMERIC' && !formData.defaultUnitId) {
      toast.error('Default Unit is required for Numeric parameters');
      return;
    }

    try {
      if (editingParameter) {
        await healthcareCatalogApi.updateParameter(editingParameter._id, formData);
        toast.success('Parameter updated successfully');
      } else {
        await healthcareCatalogApi.createParameter(formData);
        toast.success('Parameter created successfully');
      }
      setIsAddOpen(false);
      // Refresh: reset infinite scroll and reload
      const filters = currentFiltersRef.current;
      await loadInitial(filters);
      await loadMetrics();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.message || '';
      const status = err?.response?.status;
      if (status === 409 || errorMsg.toLowerCase().includes('duplicate') || errorMsg.toLowerCase().includes('conflict')) {
        toast.error((t) => (
          <div>
            <span className="font-extrabold block">Duplicate Reference Range</span>
            <span className="text-xs">{errorMsg || 'A reference range with this configuration already exists. Please edit the existing range instead.'}</span>
          </div>
        ), { id: 'duplicate-range-toast', duration: 5000 });
      } else if (status === 400 || errorMsg.toLowerCase().includes('validation') || errorMsg.toLowerCase().includes('invalid')) {
        toast.error((t) => (
          <div>
            <span className="font-extrabold block">Invalid Reference Range</span>
            <span className="text-xs">{errorMsg || 'Please check the required fields and make sure the From value is not greater than the To value.'}</span>
          </div>
        ), { id: 'validation-range-toast', duration: 4000 });
      } else if (!navigator.onLine || errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('connect') || errorMsg.toLowerCase().includes('econnrefused')) {
        toast.error((t) => (
          <div>
            <span className="font-extrabold block">Connection Error</span>
            <span className="text-xs">We couldn't reach the server. Please check your connection and try again.</span>
          </div>
        ), { id: 'network-range-toast', duration: 4000 });
      } else {
        toast.error((t) => (
          <div>
            <span className="font-extrabold block">Unable to Save Parameter</span>
            <span className="text-xs">{errorMsg || 'Something went wrong while saving the reference range. Please try again.'}</span>
          </div>
        ), { id: 'generic-range-toast', duration: 4000 });
      }
    }
  };

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (isSavingUnit) return;
    setIsSavingUnit(true);
    try {
      const res = await healthcareCatalogApi.createUnit(unitForm);
      toast.success('Laboratory unit created successfully');
      
      const newUnit = res?.data || res;
      setUnits(prev => [...prev, newUnit]);
      setFormData(prev => ({ ...prev, defaultUnitId: newUnit._id }));
      setNewRange(prev => ({ ...prev, unitId: newUnit._id }));
      setUnitForm({ name: '', symbol: '', category: '', description: '' });
      setIsUnitModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create unit');
    } finally {
      setIsSavingUnit(false);
    }
  };

  const handleCreateCondition = async (e) => {
    e.preventDefault();
    if (isSavingCondition) return;
    setIsSavingCondition(true);
    try {
      const res = await healthcareCatalogApi.createCondition(conditionForm);
      toast.success('Reference range condition created successfully');
      
      const newCond = res?.data || res;
      setConditions(prev => [...prev, newCond]);
      setNewRange(prev => ({ ...prev, conditionId: newCond._id }));
      setConditionForm({ name: '', type: '', description: '', isActive: true });
      setIsConditionModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create condition');
    } finally {
      setIsSavingCondition(false);
    }
  };

  const toggleStatus = async (param) => {
    try {
      await healthcareCatalogApi.updateParameter(param._id, {
        isActive: !param.isActive
      });
      toast.success(`Parameter ${param.isActive ? 'deactivated' : 'activated'} successfully`);
      const filters = currentFiltersRef.current;
      await loadInitial(filters);
      await loadMetrics();
      if (viewingParameter && viewingParameter._id === param._id) {
        setViewingParameter({ ...viewingParameter, isActive: !param.isActive });
      }
    } catch (err) {
      toast.error('Failed to change parameter status');
    }
  };

  const handleExportCSV = () => {
    if (parameters.length === 0) {
      toast.error('No parameters to export');
      return;
    }
    const headers = ['Parameter ID', 'Name', 'Short Name', 'Type', 'Default Unit', 'LOINC', 'Status'];
    const rows = parameters.map(p => [
      p.parameterId,
      p.name,
      p.shortName || '',
      p.resultType,
      p.defaultUnitId?.symbol || '—',
      p.loincCode || '',
      p.isActive ? 'Active' : 'Inactive'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'global_parameters.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            Global Laboratory Parameters <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase font-bold">Analytes Catalogue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage master analytes, reference ranges, and allowed qualitative values.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition inline-flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-95 transition inline-flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus className="w-4 h-4" />
            + Add Parameter
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">📋</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Analytes</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">{totalCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">✅</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active Parameters</span>
            <span className="text-2xl font-black text-emerald-600 mt-0.5 block">{activeCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">🔢</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Numeric Types</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">{numericCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl">🔤</div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Qualitative Types</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">{qualitativeCount}</span>
          </div>
        </div>
      </div>

      {/* Main Content: Search/Filters & Grid */}
      <div className="flex gap-6 items-start">
        {/* Left Side List View */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex-1 transition-all">
          {/* Filters row */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[280px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search parameter name, short name, synonyms, LOINC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-650 text-sm rounded-2xl focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="NUMERIC">Numeric</option>
                <option value="QUALITATIVE">Qualitative</option>
                <option value="TEXT">Text</option>
              </select>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-655 text-sm rounded-2xl focus:outline-none"
              >
                <option value="">All Units</option>
                {units.map(u => <option key={u._id} value={u._id}>{u.symbol}</option>)}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-655 text-sm rounded-2xl focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {/* Per-page selector */}
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="appearance-none pl-4 pr-8 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-2xl focus:outline-none font-bold cursor-pointer"
                >
                  <option value={20}>20 Per Page</option>
                  <option value={50}>50 Per Page</option>
                  <option value={100}>100 Per Page</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-blue-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table — independent scroll container */}
          <div
            ref={tableContainerRef}
            className="overflow-auto"
            style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '300px' }}
          >
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-wider">
                  <th className="px-6 py-4">Global ID</th>
                  <th className="px-6 py-4">Parameter</th>
                  <th className="px-6 py-4">Short Name</th>
                  <th className="px-6 py-4">Result Type</th>
                  <th className="px-6 py-4">Default Unit</th>
                  <th className="px-6 py-4">Ranges</th>
                  <th className="px-6 py-4">LOINC</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-500" />
                      <span className="text-sm font-bold">Loading parameters...</span>
                    </td>
                  </tr>
                ) : parameters.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">🔬</div>
                        <p className="text-sm font-bold">{search || selectedType || selectedStatus || selectedUnit ? 'No parameters match your search.' : 'No parameters found.'}</p>
                        {(search || selectedType || selectedStatus || selectedUnit) && (
                          <button
                            onClick={() => { setSearch(''); setSelectedType(''); setSelectedStatus(''); setSelectedUnit(''); }}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >Clear filters</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  parameters.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50 transition cursor-pointer" onClick={() => setViewingParameter(p)}>
                      <td className="px-6 py-4 font-bold text-slate-900 font-mono text-xs">{p.parameterId}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{p.name}</td>
                      <td className="px-6 py-4 text-slate-500">{p.shortName || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          p.resultType === 'NUMERIC' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          p.resultType === 'QUALITATIVE' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {p.resultType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {p.defaultUnitId?.symbol ? p.defaultUnitId.symbol : <span className="text-slate-400 font-normal text-xs">No Unit</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                          {p.referenceRanges?.length || 0} Ranges
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{p.loincCode || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setViewingParameter(p)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500" title="View details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenEdit(p)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500" title="Edit parameter">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Infinite scroll sentinel & loader */}
            {!loading && (
              <div ref={sentinelRef} className="py-6 text-center">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2 text-blue-500">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold">Loading more parameters...</span>
                  </div>
                )}
                {!hasMore && parameters.length > 0 && (
                  <p className="text-xs font-bold text-slate-400">All {parameters.length} parameters loaded</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Detail Drawer */}
        {viewingParameter && (
          <div className="w-[380px] bg-white border border-slate-100 rounded-3xl shadow-lg p-5 space-y-5 sticky top-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{viewingParameter.parameterId}</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">{viewingParameter.name}</h3>
                {viewingParameter.shortName && <span className="text-xs text-slate-400">Short: {viewingParameter.shortName}</span>}
              </div>
              <button onClick={() => setViewingParameter(null)} className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-100 pb-1.5">
              <button
                onClick={() => setActiveDetailTab('overview')}
                className={`pb-1 text-xs font-bold border-b-2 transition ${activeDetailTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-450'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveDetailTab('ranges')}
                className={`pb-1 text-xs font-bold border-b-2 transition ${activeDetailTab === 'ranges' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-450'}`}
              >
                Clinical Rules ({viewingParameter.referenceRanges?.length || 0})
              </button>
            </div>

            {activeDetailTab === 'overview' ? (
              <div className="space-y-4 text-sm text-slate-655">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Result Type</span>
                    <span className="font-bold text-slate-700">{viewingParameter.resultType}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Default Unit</span>
                    <span className="font-bold text-slate-700">{viewingParameter.defaultUnitId?.symbol || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Decimal Precision</span>
                    <span className="font-bold text-slate-700">{viewingParameter.decimalPrecision}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">LOINC Code</span>
                    <span className="font-bold text-slate-700">{viewingParameter.loincCode || '—'}</span>
                  </div>
                </div>

                {viewingParameter.resultType === 'NUMERIC' && (
                  <div className="bg-blue-50/20 p-3 rounded-2xl border border-blue-100/50 space-y-2.5 text-xs">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider block">Clinical Limits</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-slate-400 block">Critical Low</span>
                        <span className="font-bold text-red-600">{viewingParameter.criticalLow !== null && viewingParameter.criticalLow !== undefined ? `<= ${viewingParameter.criticalLow}` : 'None'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">Critical High</span>
                        <span className="font-bold text-red-600">{viewingParameter.criticalHigh !== null && viewingParameter.criticalHigh !== undefined ? `>= ${viewingParameter.criticalHigh}` : 'None'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">Technical Min</span>
                        <span className="font-bold text-slate-600">{viewingParameter.technicalMin !== null && viewingParameter.technicalMin !== undefined ? viewingParameter.technicalMin : 'None'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">Technical Max</span>
                        <span className="font-bold text-slate-600">{viewingParameter.technicalMax !== null && viewingParameter.technicalMax !== undefined ? viewingParameter.technicalMax : 'None'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {viewingParameter.alternateNames?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Synonyms</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {viewingParameter.alternateNames.map((name, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold">{name}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                  <p className="text-xs mt-1 leading-relaxed text-slate-500">{viewingParameter.description || 'No description added.'}</p>
                </div>

                <div className="flex gap-2.5 pt-4">
                  <button
                    onClick={() => handleOpenEdit(viewingParameter)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition"
                  >
                    Edit Parameter
                  </button>
                  <button
                    onClick={() => toggleStatus(viewingParameter)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs border transition ${viewingParameter.isActive ? 'bg-white border-red-200 text-red-600 hover:bg-red-50/20' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50/20'}`}
                  >
                    {viewingParameter.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
                {viewingParameter.resultType === 'QUALITATIVE' ? (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Allowed Values</span>
                    <div className="flex flex-col gap-1.5">
                      {viewingParameter.allowedValues?.map((v, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                          <span className="font-bold text-slate-800">{v.value}</span>
                          <div className="flex gap-1.5">
                            {v.isAbnormal && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[9px] font-bold">Abnormal</span>
                            )}
                            {v.isCritical && (
                              <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[9px] font-bold">Critical</span>
                            )}
                            {!v.isAbnormal && !v.isCritical && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-bold">Normal</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : viewingParameter.referenceRanges?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No reference ranges configured.</p>
                ) : (() => {
                  // Group ranges by gender in canonical display order
                  const genderOrder = ['ALL', 'MALE', 'FEMALE', 'OTHER'];
                  const grouped = {};
                  for (const r of (viewingParameter.referenceRanges || [])) {
                    const g = (r.gender || 'ALL').toUpperCase();
                    if (!grouped[g]) grouped[g] = [];
                    grouped[g].push(r);
                  }
                  const genderLabel = { ALL: 'ALL / GENERAL', MALE: 'MALE', FEMALE: 'FEMALE', OTHER: 'OTHER' };

                  const fmtAge = (r) => {
                    const from = r.ageFrom;
                    const to = r.ageTo;
                    const unit = r.ageUnit ? r.ageUnit.charAt(0).toUpperCase() + r.ageUnit.slice(1).toLowerCase() : 'Years';
                    if (from == null && to == null) return 'All Ages';
                    if (from == null) return `<${to} ${unit}`;
                    if (to == null) return `${from}+ ${unit}`;
                    return `${from}–${to} ${unit}`;
                  };

                  return genderOrder
                    .filter(g => grouped[g]?.length > 0)
                    .map(gender => {
                      const rows = grouped[gender];
                      return (
                        <div key={gender} className="space-y-1.5">
                          {/* Gender heading */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              gender === 'MALE' ? 'bg-blue-50 text-blue-700' :
                              gender === 'FEMALE' ? 'bg-pink-50 text-pink-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{genderLabel[gender]}</span>
                            <span className="text-[9px] text-slate-400 font-bold">{rows.length} {rows.length === 1 ? 'Range' : 'Ranges'}</span>
                            <div className="flex-1 h-px bg-slate-100" />
                          </div>

                          {/* Table */}
                          <div className="overflow-x-auto rounded-xl border border-slate-150">
                            <table className="w-full text-[10px]">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-150">
                                  <th className="text-left py-2 px-2.5 font-black text-slate-400 uppercase tracking-wider w-[25%]">Age</th>
                                  <th className="text-left py-2 px-2.5 font-black text-slate-400 uppercase tracking-wider">Condition</th>
                                  <th className="text-right py-2 px-2.5 font-black text-slate-400 uppercase tracking-wider">Operator / Value</th>
                                  <th className="text-left py-2 px-2.5 font-black text-slate-400 uppercase tracking-wider">Unit</th>
                                  <th className="text-left py-2 px-2.5 font-black text-slate-400 uppercase tracking-wider">Extra</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((range, ri) => {
                                  const lower = range.lowerValue !== undefined && range.lowerValue !== null ? range.lowerValue : range.fromValue;
                                  const upper = range.upperValue !== undefined && range.upperValue !== null ? range.upperValue : range.toValue;
                                  const isBetween = (range.lowerOperator || 'Between') === 'Between';
                                  
                                  return (
                                    <tr
                                      key={ri}
                                      className="border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition"
                                    >
                                      <td className="py-2 px-2.5 text-slate-700 font-medium">{fmtAge(range)}</td>
                                      <td className="py-2 px-2.5 text-slate-600">{range.conditionId?.name || 'None'}</td>
                                      <td className="py-2 px-2.5 text-right font-bold text-slate-800">
                                        {isBetween ? `${lower} - ${upper}` : `${range.lowerOperator} ${lower}`}
                                      </td>
                                      <td className="py-2 px-2.5 text-blue-700 font-bold">{range.unitId?.symbol || '—'}</td>
                                      <td className="py-2 px-2.5 text-slate-500 text-[9px]">
                                        {range.pregnancyStatus && range.pregnancyStatus !== 'ANY' && `Preg: ${range.pregnancyStatus}`}
                                        {range.specimenType && ` Specimen: ${range.specimenType}`}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit parameter workspace Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-xl overflow-hidden border border-slate-100 flex flex-col h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">
                {editingParameter ? 'Modify Global Parameter' : 'Add New Parameter'}
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden">
              {/* Left Form: Metadata */}
              <div className="w-1/2 p-6 border-r border-slate-100 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-550 uppercase">Parameter Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-555 uppercase">Short Name</label>
                    <input
                      type="text"
                      value={formData.shortName}
                      onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-555 uppercase">LOINC Code</label>
                    <input
                      type="text"
                      value={formData.loincCode}
                      onChange={(e) => setFormData({ ...formData, loincCode: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-555 uppercase">Internal Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-555 uppercase">Result Type *</label>
                    <select
                      value={formData.resultType}
                      onChange={(e) => setFormData({ ...formData, resultType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none font-bold"
                    >
                      <option value="NUMERIC">Numeric</option>
                      <option value="QUALITATIVE">Qualitative</option>
                      <option value="TEXT">Text</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-555 uppercase">Decimal Precision</label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      disabled={formData.resultType !== 'NUMERIC'}
                      value={formData.decimalPrecision}
                      onChange={(e) => setFormData({ ...formData, decimalPrecision: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-555 uppercase">Default Unit</label>
                      <button
                        type="button"
                        onClick={() => setIsUnitModalOpen(true)}
                        className="text-[9px] font-bold text-blue-600 hover:underline"
                      >
                        + New Unit
                      </button>
                    </div>
                    <select
                      disabled={formData.resultType !== 'NUMERIC'}
                      value={formData.defaultUnitId}
                      onChange={(e) => setFormData({ ...formData, defaultUnitId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                    >
                      <option value="">-- Select --</option>
                      {units.map(u => <option key={u._id} value={u._id}>{u.symbol} ({u.name})</option>)}
                    </select>
                  </div>
                </div>

                {formData.resultType === 'NUMERIC' && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 space-y-2.5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Clinical & Technical Limits</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Critical Low limit</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 5"
                          value={formData.criticalLow}
                          onChange={(e) => setFormData({ ...formData, criticalLow: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Critical High limit</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 20"
                          value={formData.criticalHigh}
                          onChange={(e) => setFormData({ ...formData, criticalHigh: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Technical Min acceptable</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 0"
                          value={formData.technicalMin}
                          onChange={(e) => setFormData({ ...formData, technicalMin: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Technical Max acceptable</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g. 1000"
                          value={formData.technicalMax}
                          onChange={(e) => setFormData({ ...formData, technicalMax: e.target.value !== '' ? parseFloat(e.target.value) : '' })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-555 uppercase font-bold">Synonyms</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add synonym..."
                      value={altInput}
                      onChange={(e) => setAltInput(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none"
                    />
                    <button type="button" onClick={addAltName} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold text-sm">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.alternateNames.map((name, i) => (
                      <span key={i} className="text-xs bg-slate-50 border border-slate-200 text-slate-655 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1.5">
                        {name}
                        <X className="w-3.5 h-3.5 text-slate-400 cursor-pointer" onClick={() => removeAltName(i)} />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-555 uppercase">Clinical Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none min-h-[60px]"
                  />
                </div>
              </div>

              {/* Right Panel: Ranges & Allowed Values */}
              <div className="w-1/2 flex flex-col h-full bg-slate-50 overflow-hidden">
                {formData.resultType === 'QUALITATIVE' ? (
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Allowed Values Setup</span>
                    <div className="bg-white p-4 rounded-2xl border border-slate-150 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-450 uppercase">Allowed Value *</label>
                        <input
                          type="text"
                          placeholder="e.g. Positive"
                          value={allowedValForm.value}
                          onChange={(e) => setAllowedValForm({ ...allowedValForm, value: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-4 items-center">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowedValForm.isAbnormal}
                            onChange={(e) => setAllowedValForm({ ...allowedValForm, isAbnormal: e.target.checked })}
                            className="rounded border-slate-300 text-purple-650 focus:ring-purple-500/20"
                          />
                          Abnormal Result
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowedValForm.isCritical}
                            onChange={(e) => setAllowedValForm({ ...allowedValForm, isCritical: e.target.checked })}
                            className="rounded border-slate-300 text-purple-655 focus:ring-purple-500/20"
                          />
                          Critical Result
                        </label>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button type="button" onClick={addAllowedValue} className="px-4 py-2 bg-purple-650 hover:opacity-95 text-white rounded-xl font-bold text-xs">Add Value</button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-2">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Configured Allowed Values ({formData.allowedValues.length})</span>
                      {formData.allowedValues.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-6">No allowed values added.</p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {formData.allowedValues.map((v, i) => (
                            <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-sm">
                              <div>
                                <span className="font-bold text-slate-800">{v.value}</span>
                                <div className="flex gap-1.5 mt-0.5">
                                  {v.isAbnormal && <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-100 px-1 py-0.2 rounded font-bold uppercase">Abnormal</span>}
                                  {v.isCritical && <span className="text-[8px] bg-red-50 text-red-700 border border-red-100 px-1 py-0.2 rounded font-bold uppercase">Critical</span>}
                                  {!v.isAbnormal && !v.isCritical && <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0.2 rounded font-bold uppercase">Normal</span>}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAllowedValue(i)}
                                className="p-1 hover:bg-red-50 text-red-500 rounded transition"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full overflow-hidden">
                    {/* Range Add Panel */}
                    <div className="p-4 border-b border-slate-200 bg-white space-y-3">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Configure Reference Ranges</span>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Gender</label>
                          <select
                            value={newRange.gender}
                            onChange={(e) => setNewRange({ ...newRange, gender: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none"
                          >
                            <option value="ALL">All</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Age From</label>
                          <input
                            type="number"
                            value={newRange.ageFrom}
                            onChange={(e) => {
                              setAgeValidationErrors(prev => ({ ...prev, ageFrom: false }));
                              setNewRange({ ...newRange, ageFrom: e.target.value });
                            }}
                            className={`w-full px-2 py-1 rounded-lg border text-xs focus:outline-none ${ageValidationErrors.ageFrom ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Age To</label>
                          <input
                            type="number"
                            value={newRange.ageTo}
                            onChange={(e) => {
                              setAgeValidationErrors(prev => ({ ...prev, ageTo: false }));
                              setNewRange({ ...newRange, ageTo: e.target.value });
                            }}
                            className={`w-full px-2 py-1 rounded-lg border text-xs focus:outline-none ${ageValidationErrors.ageTo ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Age Unit</label>
                          <select
                            value={newRange.ageUnit}
                            onChange={(e) => setNewRange({ ...newRange, ageUnit: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none"
                          >
                            <option value="YEARS">Years</option>
                            <option value="MONTHS">Months</option>
                            <option value="DAYS">Days</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-0.5 col-span-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Condition</label>
                            <button
                              type="button"
                              onClick={() => setIsConditionModalOpen(true)}
                              className="text-[9px] font-bold text-blue-600 hover:underline"
                            >
                              + New
                            </button>
                          </div>
                          <select
                            value={newRange.conditionId}
                            onChange={(e) => setNewRange({ ...newRange, conditionId: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none"
                          >
                            <option value="">None</option>
                            {conditions.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Pregnancy</label>
                          <select
                            value={newRange.pregnancyStatus}
                            onChange={(e) => setNewRange({ ...newRange, pregnancyStatus: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none"
                          >
                            <option value="ANY">Any</option>
                            <option value="YES">Yes</option>
                            <option value="NO">No</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Specimen Type</label>
                          <input
                            type="text"
                            placeholder="e.g. Plasma"
                            value={newRange.specimenType}
                            onChange={(e) => setNewRange({ ...newRange, specimenType: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Operator</label>
                          <select
                            value={newRange.lowerOperator}
                            onChange={(e) => setNewRange({ ...newRange, lowerOperator: e.target.value, upperOperator: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none"
                          >
                            <option value="Between">Between</option>
                            <option value=">=">&gt;=</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value="<=">&lt;=</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase">
                            {newRange.lowerOperator === 'Between' ? 'Lower Bound *' : 'Boundary Value *'}
                          </label>
                          <input
                            type="text"
                            value={newRange.lowerValue !== undefined ? newRange.lowerValue : newRange.fromValue}
                            onChange={(e) => setNewRange({ ...newRange, lowerValue: e.target.value, fromValue: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase">
                            {newRange.lowerOperator === 'Between' ? 'Upper Bound *' : 'Upper Bound (N/A)'}
                          </label>
                          <input
                            type="text"
                            disabled={newRange.lowerOperator !== 'Between'}
                            value={newRange.lowerOperator === 'Between' ? (newRange.upperValue !== undefined ? newRange.upperValue : newRange.toValue) : ''}
                            onChange={(e) => setNewRange({ ...newRange, upperValue: e.target.value, toValue: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none disabled:bg-slate-50"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Unit *</label>
                          <select
                            value={newRange.unitId}
                            onChange={(e) => setNewRange({ ...newRange, unitId: e.target.value })}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none"
                          >
                            <option value="">-- Select --</option>
                            {units.map(u => <option key={u._id} value={u._id}>{u.symbol}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        {editingRangeIdx !== null && (
                          <button type="button" onClick={cancelEditRange} className="px-3.5 py-1.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition">Cancel Edit</button>
                        )}
                        <button type="button" onClick={addOrUpdateReferenceRange} className={`px-3.5 py-1.5 font-bold text-xs rounded-xl shadow-sm transition ${editingRangeIdx !== null ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                          {editingRangeIdx !== null ? 'Update Range' : 'Add Range'}
                        </button>
                      </div>
                    </div>

                    {/* Active Ranges List */}
                    <div className="p-4 overflow-y-auto flex-1 space-y-2">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Configured Ranges ({formData.referenceRanges.length})</span>
                      {formData.referenceRanges.length === 0 ? (
                        <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 italic text-xs">No reference ranges added.</div>
                      ) : (
                        formData.referenceRanges.map((range, idx) => {
                          const rangeUnitId = range.unitId?._id || range.unitId;
                          const rangeCondId = range.conditionId?._id || range.conditionId;
                          const unitObj = units.find(u => u._id === rangeUnitId) || range.unitId;
                          const condObj = conditions.find(c => c._id === rangeCondId) || range.conditionId;
                          const isEditing = editingRangeIdx === idx;
                          return (
                            <div
                              key={idx}
                              onClick={() => startEditRange(range, idx)}
                              className={`p-3 rounded-2xl border shadow-sm flex items-center justify-between gap-3 text-xs cursor-pointer transition-all ${
                                isEditing
                                  ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400'
                                  : 'bg-white border-slate-150 hover:border-blue-200 hover:shadow-md'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {isEditing && <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider bg-amber-100 px-1.5 py-0.5 rounded">Editing</span>}
                                  <span className="font-bold text-slate-800">{range.gender} {range.ageFrom != null ? `(${range.ageFrom}–${range.ageTo} ${range.ageUnit || 'Years'})` : ''}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 mt-0.5 space-x-2">
                                  <span>Condition: {condObj?.name || 'None'}</span>
                                  {range.pregnancyStatus && range.pregnancyStatus !== 'ANY' && <span className="bg-pink-50 text-pink-600 px-1 rounded">Preg: {range.pregnancyStatus}</span>}
                                  {range.specimenType && <span className="bg-slate-100 text-slate-650 px-1 rounded">Specimen: {range.specimenType}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-blue-600">
                                  {(range.lowerOperator || 'Between') === 'Between'
                                    ? `${range.lowerValue !== undefined ? range.lowerValue : range.fromValue} – ${range.upperValue !== undefined ? range.upperValue : range.toValue}`
                                    : `${range.lowerOperator} ${range.lowerValue !== undefined ? range.lowerValue : range.fromValue}`}
                                  {' '}{unitObj?.symbol || ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); startEditRange(range, idx); }}
                                  className="p-1 hover:bg-blue-50 text-blue-400 rounded transition"
                                  title="Edit range"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeReferenceRange(idx); }}
                                  className="p-1 hover:bg-red-50 text-red-500 rounded transition"
                                  title="Delete range"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Save block */}
                <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl transition hover:opacity-95 shadow-lg shadow-blue-150">Save changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Unit Modal Popup */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 100 }}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl p-5 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-800 text-sm uppercase">Create New Laboratory Unit</h4>
              <button onClick={() => setIsUnitModalOpen(false)} className="p-1 hover:bg-slate-50 rounded-xl text-slate-450"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateUnit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-black text-slate-500 uppercase">Symbol (e.g. g/dL) *</label>
                <input
                  type="text"
                  required
                  value={unitForm.symbol}
                  onChange={(e) => setUnitForm({ ...unitForm, symbol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-black text-slate-500 uppercase">Unit Name (e.g. grams per deciliter) *</label>
                <input
                  type="text"
                  required
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-black text-slate-500 uppercase">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Hematology"
                  value={unitForm.category}
                  onChange={(e) => setUnitForm({ ...unitForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setIsUnitModalOpen(false)} className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={isSavingUnit} className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:opacity-95 shadow-md shadow-blue-100 disabled:opacity-50">
                  {isSavingUnit ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Condition Modal Popup */}
      {isConditionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 100 }}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl p-5 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-800 text-sm uppercase">Create New Condition</h4>
              <button onClick={() => setIsConditionModalOpen(false)} className="p-1 hover:bg-slate-50 rounded-xl text-slate-450"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateCondition} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-black text-slate-500 uppercase">Condition Name *</label>
                <input
                  type="text"
                  required
                  value={conditionForm.name}
                  onChange={(e) => setConditionForm({ ...conditionForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-black text-slate-500 uppercase">Short Name / Code</label>
                <input
                  type="text"
                  value={conditionForm.type}
                  onChange={(e) => setConditionForm({ ...conditionForm, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-black text-slate-500 uppercase">Description</label>
                <input
                  type="text"
                  value={conditionForm.description}
                  onChange={(e) => setConditionForm({ ...conditionForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setIsConditionModalOpen(false)} className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={isSavingCondition} className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:opacity-95 shadow-md shadow-blue-100 disabled:opacity-50">
                  {isSavingCondition ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalParametersPage;
