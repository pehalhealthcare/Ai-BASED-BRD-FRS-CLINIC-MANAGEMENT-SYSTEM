import {
  Activity, AlertTriangle, Calendar, ChevronRight, CheckCircle2,
  Edit3, Eye, EyeOff, Heart, Lock, Pill, Plus, Shield,
  ShieldAlert, Syringe, UploadCloud
} from 'lucide-react';
import PatientDocumentOcrPanel from '../PatientDocumentOcrPanel';
import Badge from '../../../components/ui/Badge';
import { TagList, InputRow, SelectRow } from './SharedComponents';

export default function MedicalHistory({
  profile,
  isHistoryUnlocked, setIsHistoryUnlocked,
  unlocking, unlockError, confirmPassword, setConfirmPassword,
  showPassword, setShowPassword,
  handleVerifyPassword, handleSaveHistory,
  historyForm, setHistoryForm,
  historySubTab, setHistorySubTab,
  isEditingHistory, setIsEditingHistory,
  historySuccessMessage, savingHistory,
  newAllergy, setNewAllergy,
  newCondition, setNewCondition,
  newMedication, setNewMedication,
  newSurgery, setNewSurgery,
  newFamilyHistory, setNewFamilyHistory,
  addHistoryItem, removeHistoryItem,
  lockType, setLockType,
  customPassword, setCustomPassword,
  documents, loadingDocs, loadDocuments,
  patientApi,
}) {
  return (
    <div className="w-full space-y-6 animate-fade-in">
      {!isHistoryUnlocked ? (
        /* LOCK SCREEN */
        <div className="relative overflow-hidden rounded-3xl max-w-lg mx-auto border bg-white dark:bg-navy-900 border-slate-200 dark:border-white/[0.08] shadow-card p-10 text-center space-y-7 animate-scale-in">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-indigo-600/10 blur-3xl" />
          </div>
          <div className="relative w-20 h-20 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ShieldAlert size={36} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Confidential Records Locked</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              To protect your medical privacy, please confirm your account password to view or modify your clinical history.
            </p>
          </div>
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-black placeholder:text-gray-300 focus:outline-none focus:border-aura-500 transition"
              />  
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={16} />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {unlockError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 text-center animate-slide-down">
                {unlockError}
              </p>
            )}
            <button
              type="submit"
              disabled={unlocking}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-semibold text-sm transition shadow-md disabled:opacity-50"
            >
              {unlocking ? 'Verifying...' : 'Unlock History'}
            </button>
          </form>
        </div>
      ) : (
        /* UNLOCKED VIEW */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                <Activity size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <span>My Portal</span>
                  <ChevronRight size={10} />
                  <span className="text-slate-600 dark:text-slate-300">Medical History</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Medical History</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">View and manage your health information and medical records.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border bg-white dark:bg-[#060d18] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition shadow-sm"
              >
                <UploadCloud size={14} className="rotate-180" /> Download Summary
              </button>
              <button
                type="button"
                onClick={() => setIsEditingHistory(!isEditingHistory)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-aura-600 text-white hover:bg-aura-700 transition"
              >
                <Edit3 size={14} /> {isEditingHistory ? 'View Mode' : 'Edit Records'}
              </button>
              <button
                type="button"
                onClick={() => setIsHistoryUnlocked(false)}
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title="Lock Records"
              >
                <Lock size={15} />
              </button>
            </div>
          </div>

          {/* Sub-Tab Nav */}
          {!isEditingHistory && (
            <div className="flex overflow-x-auto gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-white/5 scrollbar-thin">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'conditions', label: 'Conditions' },
                { id: 'allergies', label: 'Allergies' },
                { id: 'medications', label: 'Medications' },
                { id: 'surgeries', label: 'Surgeries' },
                { id: 'family', label: 'Family History' },
                { id: 'lifestyle', label: 'Lifestyle' },
                { id: 'documents', label: 'Documents' }
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setHistorySubTab(subTab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                    historySubTab === subTab.id
                      ? 'bg-white dark:bg-navy-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>
          )}

          {/* Success message */}
          {historySuccessMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-aura-50 dark:bg-aura-500/10 border border-aura-200 dark:border-aura-500/30 text-aura-700 dark:text-aura-300 text-sm font-medium animate-slide-down">
              <CheckCircle2 size={16} />{historySuccessMessage}
            </div>
          )}

          {isEditingHistory ? (
            /* EDIT MODE */
            <form onSubmit={handleSaveHistory} className="space-y-6">
              {/* Allergies */}
              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Allergies</p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/8 min-h-[52px]">
                  <TagList items={historyForm.allergies} color="rose" onRemove={(i) => removeHistoryItem('allergies', i)} />
                </div>
                <div className="flex gap-2">
                  <input
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHistoryItem('allergies', newAllergy, setNewAllergy); } }}
                    placeholder="Add allergy (e.g. Penicillin)"
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition"
                  />
                  <button type="button" onClick={() => addHistoryItem('allergies', newAllergy, setNewAllergy)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition flex items-center gap-1.5">
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Chronic Conditions */}
              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chronic Conditions</p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/8 min-h-[52px]">
                  <TagList items={historyForm.chronicConditions} color="sky" onRemove={(i) => removeHistoryItem('chronicConditions', i)} />
                </div>
                <div className="flex gap-2">
                  <input
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHistoryItem('chronicConditions', newCondition, setNewCondition); } }}
                    placeholder="Add condition (e.g. Hypertension)"
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition"
                  />
                  <button type="button" onClick={() => addHistoryItem('chronicConditions', newCondition, setNewCondition)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition flex items-center gap-1.5">
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Current Medications */}
              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Medications</p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/8 space-y-2">
                  {historyForm.currentMedications.length > 0 ? historyForm.currentMedications.map((med, i) => (
                    <div key={i} className="flex justify-between items-center bg-white dark:bg-navy-950 p-2 rounded-lg border border-slate-100 dark:border-white/5 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{med.name} <span className="text-[10px] text-slate-400 font-normal">({med.frequency || 'No instructions'})</span></span>
                      <button type="button" onClick={() => setHistoryForm(prev => ({ ...prev, currentMedications: prev.currentMedications.filter((_, idx) => idx !== i) }))} className="text-rose-500 hover:underline">Remove</button>
                    </div>
                  )) : <p className="text-xs text-slate-400 italic">None added yet</p>}
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input value={newMedication.name} onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })} placeholder="Medication name (e.g. Metformin 500mg)" className="px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition" />
                  <div className="flex gap-2">
                    <input value={newMedication.frequency} onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })} placeholder="Frequency (e.g. Twice Daily)" className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition" />
                    <button type="button" onClick={() => { if (!newMedication.name.trim()) return; setHistoryForm(prev => ({ ...prev, currentMedications: [...prev.currentMedications, { name: newMedication.name.trim(), frequency: newMedication.frequency.trim() }] })); setNewMedication({ name: '', frequency: '' }); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition flex items-center gap-1.5">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Past Surgeries */}
              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Past Surgeries</p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/8 space-y-2">
                  {historyForm.pastSurgeries?.length > 0 ? historyForm.pastSurgeries.map((surg, i) => (
                    <div key={i} className="flex justify-between items-center bg-white dark:bg-navy-950 p-2 rounded-lg border border-slate-100 dark:border-white/5 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{surg.name} <span className="text-[10px] text-slate-400 font-normal">({surg.year || 'N/A'})</span></span>
                      <button type="button" onClick={() => setHistoryForm(prev => ({ ...prev, pastSurgeries: prev.pastSurgeries.filter((_, idx) => idx !== i) }))} className="text-rose-500 hover:underline">Remove</button>
                    </div>
                  )) : <p className="text-xs text-slate-400 italic">None added yet</p>}
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input value={newSurgery.name} onChange={(e) => setNewSurgery({ ...newSurgery, name: e.target.value })} placeholder="Surgery (e.g. Heart Bypass)" className="px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition" />
                  <div className="flex gap-2">
                    <input value={newSurgery.year} onChange={(e) => setNewSurgery({ ...newSurgery, year: e.target.value })} placeholder="Year (e.g. 2018)" className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition" />
                    <button type="button" onClick={() => { if (!newSurgery.name.trim()) return; setHistoryForm(prev => ({ ...prev, pastSurgeries: [...(prev.pastSurgeries || []), { name: newSurgery.name.trim(), year: newSurgery.year.trim() }] })); setNewSurgery({ name: '', year: '' }); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition flex items-center gap-1.5">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Family History */}
              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Family History</p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/8 space-y-2">
                  {historyForm.familyHistory?.length > 0 ? historyForm.familyHistory.map((fam, i) => (
                    <div key={i} className="flex justify-between items-center bg-white dark:bg-navy-950 p-2 rounded-lg border border-slate-100 dark:border-white/5 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{fam.relation}: <span className="font-normal text-slate-500">{fam.condition}</span></span>
                      <button type="button" onClick={() => setHistoryForm(prev => ({ ...prev, familyHistory: prev.familyHistory.filter((_, idx) => idx !== i) }))} className="text-rose-500 hover:underline">Remove</button>
                    </div>
                  )) : <p className="text-xs text-slate-400 italic">None added yet</p>}
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input value={newFamilyHistory.relation} onChange={(e) => setNewFamilyHistory({ ...newFamilyHistory, relation: e.target.value })} placeholder="Relation (e.g. Father)" className="px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition" />
                  <div className="flex gap-2">
                    <input value={newFamilyHistory.condition} onChange={(e) => setNewFamilyHistory({ ...newFamilyHistory, condition: e.target.value })} placeholder="Condition (e.g. Diabetes)" className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white dark:bg-navy-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition" />
                    <button type="button" onClick={() => { if (!newFamilyHistory.relation.trim() || !newFamilyHistory.condition.trim()) return; setHistoryForm(prev => ({ ...prev, familyHistory: [...(prev.familyHistory || []), { relation: newFamilyHistory.relation.trim(), condition: newFamilyHistory.condition.trim() }] })); setNewFamilyHistory({ relation: '', condition: '' }); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 transition flex items-center gap-1.5">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Lifestyle */}
              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Lifestyle Habits</p>
                <div className="grid sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/8">
                  <SelectRow label="Smoking" value={historyForm.lifestyle?.smoking || 'no'} onChange={(e) => setHistoryForm(p => ({ ...p, lifestyle: { ...p.lifestyle, smoking: e.target.value } }))}>
                    <option value="no">Non-smoker</option>
                    <option value="yes">Smoker</option>
                    <option value="former">Former Smoker</option>
                  </SelectRow>
                  <SelectRow label="Alcohol" value={historyForm.lifestyle?.alcohol || 'no'} onChange={(e) => setHistoryForm(p => ({ ...p, lifestyle: { ...p.lifestyle, alcohol: e.target.value } }))}>
                    <option value="no">Non-drinker</option>
                    <option value="occasional">Occasional</option>
                    <option value="regular">Regular</option>
                  </SelectRow>
                  <SelectRow label="Exercise" value={historyForm.lifestyle?.exerciseFrequency || 'never'} onChange={(e) => setHistoryForm(p => ({ ...p, lifestyle: { ...p.lifestyle, exerciseFrequency: e.target.value } }))}>
                    <option value="never">Never</option>
                    <option value="rarely">Rarely (1-2x/mo)</option>
                    <option value="moderate">Moderate (1-2x/wk)</option>
                    <option value="active">Active (3-5x/wk)</option>
                  </SelectRow>
                  <SelectRow label="Diet Type" value={historyForm.lifestyle?.dietType || 'veg'} onChange={(e) => setHistoryForm(p => ({ ...p, lifestyle: { ...p.lifestyle, dietType: e.target.value } }))}>
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="keto">Keto</option>
                  </SelectRow>
                </div>
              </div>

              {/* Female Health */}
              {profile?.gender === 'female' && (
                <div className="rounded-2xl border border-rose-100 dark:border-rose-500/10 bg-rose-50/50 dark:bg-rose-500/5 p-5 space-y-4">
                  <p className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <Heart size={14} className="text-rose-500 animate-pulse" /> Female Health Details
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 text-xs">
                    <InputRow label="Pregnancy History" value={historyForm.pregnancyHistory || ''} onChange={(e) => setHistoryForm(p => ({ ...p, pregnancyHistory: e.target.value }))} placeholder="e.g. G2P1A0" />
                    <InputRow label="LMP Date" type="date" value={historyForm.lmpDate || ''} onChange={(e) => setHistoryForm(p => ({ ...p, lmpDate: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* Lock Settings */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-900/50 p-5 space-y-4">
                <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Lock size={14} className="text-indigo-500" /> Security Lock Settings
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <SelectRow label="Protect Records With" value={lockType} onChange={(e) => setLockType(e.target.value)}>
                    <option value="account">Account Sign-in Password</option>
                    <option value="custom">Set New Custom Password</option>
                  </SelectRow>
                  {lockType === 'custom' && (
                    <InputRow label="New Custom Password" type="password" value={customPassword} onChange={(e) => setCustomPassword(e.target.value)} placeholder="Enter new lock code..." />
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-white/[0.06] gap-2">
                <button type="button" onClick={() => setIsEditingHistory(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition">Cancel</button>
                <button type="submit" disabled={savingHistory} className="px-6 py-2.5 rounded-xl bg-aura-600 dark:bg-aura-500 text-white text-sm font-semibold hover:bg-aura-700 dark:hover:bg-aura-600 transition disabled:opacity-50 flex items-center gap-2">
                  {savingHistory && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {savingHistory ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            /* READ MODE */
            <div>
              {historySubTab === 'overview' && (
                <div className="grid md:grid-cols-12 gap-6">
                  <div className="md:col-span-4 flex flex-col justify-between gap-5">
                    <div className="space-y-4">
                      {[
                        { label: 'Chronic Conditions', sub: 'Active Conditions', count: historyForm.chronicConditions.length, icon: <Heart size={22} />, color: 'sky', tab: 'conditions' },
                        { label: 'Allergies', sub: 'Known Allergies', count: historyForm.allergies.length, icon: <AlertTriangle size={22} />, color: 'rose', tab: 'allergies' },
                        { label: 'Current Medications', sub: 'Active Medication', count: historyForm.currentMedications.length, icon: <Pill size={22} />, color: 'indigo', tab: 'medications' },
                        { label: 'Past Surgeries', sub: 'Surgeries', count: historyForm.pastSurgeries?.length || 0, icon: <Syringe size={22} />, color: 'emerald', tab: 'surgeries' },
                      ].map(card => (
                        <button key={card.tab} type="button" onClick={() => setHistorySubTab(card.tab)}
                          className="w-full text-left p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 hover:border-aura-500 dark:hover:border-aura-500/50 hover:shadow-lg transition duration-200 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-${card.color}-50 dark:bg-${card.color}-500/10 text-${card.color}-600 dark:text-${card.color}-400 flex items-center justify-center shrink-0`}>{card.icon}</div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
                              <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{card.count}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.sub}</p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-0.5 transition shrink-0" />
                        </button>
                      ))}
                      <div className="w-full p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"><Calendar size={22} /></div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Updated</p>
                            <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                              {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'May 20, 2025'}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Updated by patient</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-4 mt-auto">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <Shield size={20} className="animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Keep Your Records Updated</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Regularly update your medical information to help your doctor provide better care.</p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8">
                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Medical History</h3>
                      <div className="min-h-[580px] max-h-[580px] overflow-y-auto pr-2 scrollbar-thin space-y-5">
                        {historyForm.chronicConditions.length > 0 || historyForm.allergies.length > 0 || historyForm.currentMedications.length > 0 || historyForm.pastSurgeries?.length > 0 ? (
                          <div className="relative pl-6 border-l-2 border-slate-100 dark:border-white/5 space-y-6">
                            {historyForm.chronicConditions.map((cond, i) => (
                              <div key={`cond-${i}`} className="relative">
                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-sky-500 border-4 border-white dark:border-navy-800 shadow" />
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Condition Logged</p>
                                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{cond}</h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Added to active chronic conditions list.</p>
                                </div>
                              </div>
                            ))}
                            {historyForm.allergies.map((allergy, i) => (
                              <div key={`allergy-${i}`} className="relative">
                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-rose-500 border-4 border-white dark:border-navy-800 shadow" />
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allergy Identified</p>
                                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{allergy}</h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Verified hypersensitivity logged in patient record.</p>
                                </div>
                              </div>
                            ))}
                            {historyForm.currentMedications.map((med, i) => (
                              <div key={`med-${i}`} className="relative">
                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-navy-800 shadow" />
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Regimen</p>
                                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{med.name}</h4>
                                  {med.frequency && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Dosage frequency: {med.frequency}</p>}
                                </div>
                              </div>
                            ))}
                            {historyForm.pastSurgeries?.map((surg, i) => (
                              <div key={`surg-${i}`} className="relative">
                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-navy-800 shadow" />
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Surgical Record</p>
                                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{surg.name}</h4>
                                  {surg.year && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Year: {surg.year}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                            <Activity size={32} className="mx-auto opacity-40 mb-3" />
                            <p className="text-xs font-medium">No recent updates logged in medical history.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {historySubTab === 'conditions' && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chronic Conditions</h3>
                  {historyForm.chronicConditions.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {historyForm.chronicConditions.map((cond, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-navy-900/40 flex items-center gap-3">
                          <Heart className="text-sky-500" size={16} />
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{cond}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">No chronic conditions registered.</p>}
                </div>
              )}

              {historySubTab === 'allergies' && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Known Allergies</h3>
                  {historyForm.allergies.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {historyForm.allergies.map((allergy, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-navy-900/40 flex items-center gap-3">
                          <AlertTriangle className="text-rose-500" size={16} />
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{allergy}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">No known allergies registered.</p>}
                </div>
              )}

              {historySubTab === 'medications' && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Medications</h3>
                  {historyForm.currentMedications.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                      {historyForm.currentMedications.map((med, i) => (
                        <div key={i} className="py-3 flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <Pill className="text-indigo-500" size={16} />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{med.name}</span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-navy-900 px-2.5 py-1 rounded-full">{med.frequency || 'As directed'}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">No active medications registered.</p>}
                </div>
              )}

              {historySubTab === 'surgeries' && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Past Surgeries & Procedures</h3>
                  {historyForm.pastSurgeries?.length > 0 ? (
                    <div className="relative pl-6 border-l-2 border-emerald-500/20 space-y-4">
                      {historyForm.pastSurgeries.map((surg, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-navy-800 shadow" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-navy-900 px-2 py-0.5 rounded">{surg.year || 'Year N/A'}</span>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">{surg.name}</h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">No past surgeries registered.</p>}
                </div>
              )}

              {historySubTab === 'family' && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Family Medical History</h3>
                  {historyForm.familyHistory?.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {historyForm.familyHistory.map((fam, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-navy-900/40">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-200 dark:bg-navy-900 px-2 py-0.5 rounded">{fam.relation}</span>
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-2">{fam.condition}</h4>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-400 italic">No family history registered.</p>}
                </div>
              )}

              {historySubTab === 'lifestyle' && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 space-y-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lifestyle habits</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Smoking Status', value: historyForm.lifestyle?.smoking || 'no' },
                      { label: 'Alcohol Consumption', value: historyForm.lifestyle?.alcohol || 'no' },
                      { label: 'Physical Activity', value: historyForm.lifestyle?.exerciseFrequency || 'never' },
                      { label: 'Diet Type', value: historyForm.lifestyle?.dietType || 'veg' }
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-navy-900/40">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                        <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 capitalize mt-1.5">{item.value}</h4>
                      </div>
                    ))}
                  </div>
                  {profile?.gender === 'female' && historyForm.pregnancyHistory && (
                    <div className="p-4 rounded-xl border border-rose-100 dark:border-rose-500/10 bg-rose-500/5">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Female Health Summary</span>
                      <div className="grid sm:grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-slate-400">Pregnancy History</p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{historyForm.pregnancyHistory}</p>
                        </div>
                        {historyForm.lmpDate && (
                          <div>
                            <p className="text-xs text-slate-400">LMP Date</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{new Date(historyForm.lmpDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {historySubTab === 'documents' && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-800 space-y-6">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Medical Reports & Documents</h3>
                    <Badge color="success">{documents.length} Uploaded</Badge>
                  </div>
                  <div>
                    <PatientDocumentOcrPanel
                      onApply={(extracted) => {
                        if (extracted.allergies) {
                          setHistoryForm(prev => ({ ...prev, allergies: Array.from(new Set([...prev.allergies, ...extracted.allergies])) }));
                        }
                        if (extracted.chronicConditions) {
                          setHistoryForm(prev => ({ ...prev, chronicConditions: Array.from(new Set([...prev.chronicConditions, ...extracted.chronicConditions])) }));
                        }
                        loadDocuments();
                      }}
                    />
                  </div>
                  {loadingDocs ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">Loading clinical reports...</p>
                  ) : documents.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {documents.map((doc) => (
                        <div key={doc._id} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-navy-900/40 flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{doc.title || doc.fileName || 'Report'}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <a href={doc.fileUrl || `${import.meta.env.VITE_API_BASE_URL}/patients/documents/${doc._id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-aura-600 hover:underline">View</a>
                            <button type="button" onClick={async () => {
                              if (window.confirm('Delete this report?')) {
                                try {
                                  await patientApi.deleteDocument(doc._id);
                                  loadDocuments();
                                } catch { alert('Could not delete document.'); }
                              }
                            }} className="text-[10px] font-bold text-rose-500 hover:underline">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-6 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">No documents uploaded yet. Upload a CBC Report, MRI Scan, or Prescription above.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Security Footer */}
          <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide">
            <Lock size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span>Your health data is private and secure. Only you and your authorized healthcare providers can access this information.</span>
          </div>
        </div>
      )}
    </div>
  );
}
