import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, X, Send, Calendar, HelpCircle, ArrowRight, Pill, User } from 'lucide-react';
import { doctorApi, appointmentApi, patientApi } from '../../lib/api';
import aiApi from '../../api/aiApi';
import useAuth from '../../hooks/useAuth';

const FloatingChatbot = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [flow, setFlow] = useState('menu'); // 'menu', 'booking_spec', 'booking_confirm', 'dosage_medicine', 'dosage_age', 'dosage_weight', 'dosage_result', 'booking_start', 'booking_symptoms', 'booking_conditions', 'booking_processing'
  
  // Draggable position state
  const [position, setPosition] = useState({ x: window.innerWidth - 380, y: window.innerHeight - 600 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Flow inputs state
  const [bookingSpec, setBookingSpec] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00');
  const [dosageMed, setDosageMed] = useState('');
  const [dosageAge, setDosageAge] = useState('');
  const [dosageWeight, setDosageWeight] = useState('');

  // Interactive booking flow states
  const [patientProfile, setPatientProfile] = useState(null);
  const [symptomsInput, setSymptomsInput] = useState('');
  const [conditionsInput, setConditionsInput] = useState('');
  const [dobInput, setDobInput] = useState('');

  // Available doctors list
  const [doctorsList, setDoctorsList] = useState([]);

  useEffect(() => {
    if (user) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'bot',
          text: `Hi ${user.name || 'Patient'}!`
        },
        {
          id: 'welcome-2',
          sender: 'bot',
          text: `Welcome to AuraCare. Want some help?`
        },
        {
          id: 'welcome-options',
          sender: 'bot',
          text: `Please choose an action:`,
          payload: { type: 'initial_options' }
        }
      ]);
    }
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await patientApi.me();
        const patientObj = data?.data?.patient || data?.patient || data;
        setPatientProfile(patientObj || null);
      } catch (e) {
        console.error(e);
      }
    };
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle dragging
  const handlePointerDown = (e) => {
    if (e.target.closest('.no-drag')) return;
    setIsDragging(true);
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handlePointerMove = (moveEvent) => {
      // Bound inside viewport
      const x = Math.max(10, Math.min(window.innerWidth - 360, moveEvent.clientX - startX));
      const y = Math.max(10, Math.min(window.innerHeight - 520, moveEvent.clientY - startY));
      setPosition({ x, y });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const addMessage = (text, sender, payload = null) => {
    setMessages(prev => [...prev, { id: Math.random().toString(), text, sender, payload }]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userText = inputValue.trim();
    addMessage(userText, 'user');
    setInputValue('');

    const lowerText = userText.toLowerCase();
    if (['menu', 'booking_results_display', 'booking_confirm'].includes(flow) || flow === '') {
      if (lowerText.includes('appointment') || lowerText.includes('appoinment') || (lowerText.includes('book') && lowerText.includes('doctor')) || lowerText.includes('schedule')) {
        startBookingFlow();
        return;
      }
      if (lowerText.includes('medicine') || lowerText.includes('pharmacy') || lowerText.includes('drug') || lowerText.includes('order') || lowerText.includes('medicines')) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          addMessage("Sure, redirecting you to the pharmacy store...", 'bot');
          setTimeout(() => {
            navigate('/pharmacy/medicines');
          }, 600);
        }, 500);
        return;
      }
      if (lowerText.includes('blood test') || lowerText.includes('lab test') || lowerText.includes('labs') || lowerText.includes('lab tests') || lowerText.includes('blood tests')) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          addMessage("Sure, redirecting you to the lab test catalog...", 'bot');
          setTimeout(() => {
            navigate('/labs/tests');
          }, 600);
        }, 500);
        return;
      }
    }

    setIsTyping(true);

    if (flow === 'booking_start') {
      setSymptomsInput(userText);
      setFlow('booking_symptoms');
      
      setTimeout(() => {
        setIsTyping(false);
        const existingConditions = patientProfile?.chronicConditions || [];
        if (existingConditions.length > 0) {
          addMessage(
            `I see in your profile that you have: ${existingConditions.join(', ')}. Do you have any other medical conditions in addition to these? (Type 'no' if none)`,
            'bot'
          );
        } else {
          addMessage(
            "Do you have any known medical conditions? (Type 'none' if none)",
            'bot'
          );
        }
      }, 800);
    }
    else if (flow === 'booking_symptoms') {
      setConditionsInput(userText);
      
      const noneAnswers = ['none', 'no', 'nothing', 'nil', 'no other', 'no other conditions'];
      const rawText = userText.toLowerCase().trim();
      const hasNewConditions = !noneAnswers.some(ans => rawText === ans);
      
      let updatedConditions = [...(patientProfile?.chronicConditions || [])];
      if (hasNewConditions) {
        const newConds = userText.split(',').map(c => c.trim()).filter(Boolean);
        updatedConditions = Array.from(new Set([...updatedConditions, ...newConds]));
        try {
          const res = await patientApi.updateMe({ chronicConditions: updatedConditions });
          const updated = res?.data?.patient || res?.patient || res;
          if (updated) {
            setPatientProfile(updated);
            patientProfile.chronicConditions = updated.chronicConditions;
          }
        } catch (err) {
          console.error("Failed to update chronic conditions", err);
        }
      }

      // Check DOB
      const hasDob = patientProfile?.dateOfBirth;
      if (hasDob) {
        setFlow('booking_processing');
        setTimeout(() => {
          processTriage(symptomsInput, updatedConditions, patientProfile.dateOfBirth);
        }, 500);
      } else {
        setFlow('booking_conditions');
        setTimeout(() => {
          setIsTyping(false);
          addMessage("What is your Date of Birth? Please enter in YYYY-MM-DD format:", 'bot');
        }, 800);
      }
    }
    else if (flow === 'booking_conditions') {
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(userText)) {
        setIsTyping(false);
        addMessage("Invalid format. Please enter your Date of Birth in YYYY-MM-DD format (e.g., 1990-05-15):", 'bot');
        return;
      }
      
      setDobInput(userText);
      setFlow('booking_processing');
      
      let freshProfile = patientProfile;
      try {
        const res = await patientApi.updateMe({ dateOfBirth: userText });
        const updated = res?.data?.patient || res?.patient || res;
        if (updated) {
          setPatientProfile(updated);
          freshProfile = updated;
        }
      } catch (err) {
        console.error("Failed to update DOB", err);
      }

      setTimeout(() => {
        processTriage(symptomsInput, freshProfile?.chronicConditions || [], userText);
      }, 500);
    }
    else if (flow === 'dosage_medicine') {
      setIsTyping(false);
      handleDosageMedicineSubmit(userText);
    }
    else if (flow === 'dosage_age') {
      setIsTyping(false);
      handleDosageAgeSubmit(userText);
    }
    else if (flow === 'dosage_weight') {
      setIsTyping(false);
      handleDosageWeightSubmit(userText);
    }
    else {
      setTimeout(() => {
        setIsTyping(false);
        addMessage("I'm here to guide you. Use the quick actions below to book an appointment or check dosage calculations.", 'bot');
      }, 1000);
    }
  };

  const processTriage = async (symptoms, conditions, dob) => {
    setIsTyping(true);
    try {
      const birthDate = new Date(dob);
      let calculatedAge = new Date().getFullYear() - birthDate.getFullYear();
      const m = new Date().getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) {
        calculatedAge--;
      }

      const triageRes = await aiApi.symptomCheck({
        symptoms,
        age: calculatedAge,
        gender: patientProfile?.gender || undefined,
        known_conditions: conditions
      });

      let docs = [];
      try {
        const spec = triageRes.recommendedSpecialization || 'General Physician';
        const docResponse = await doctorApi.list({ specialization: spec });
        docs = docResponse.doctors || docResponse.data?.doctors || [];
      } catch (docErr) {
        console.error(docErr);
      }

      let labs = [];
      try {
        const labResponse = await aiApi.labTestRecommendations({
          symptoms,
          age: calculatedAge
        });
        labs = labResponse.suggested_tests || labResponse.data?.suggested_tests || [];
      } catch (labErr) {
        console.error(labErr);
      }

      const spec = (triageRes.recommendedSpecialization || 'General Physician').toLowerCase();
      let generatedPrecautions = [];
      if (spec.includes('cardi')) {
        generatedPrecautions = [
          "Avoid strenuous physical activity or heavy lifting.",
          "Rest in a comfortable, seated upright position.",
          "Keep warm and stay calm.",
          "Seek emergency medical help immediately if you experience chest pain spreading to your arm or jaw, sweating, or severe shortness of breath."
        ];
      } else if (spec.includes('pulmon') || spec.includes('lung') || spec.includes('respir')) {
        generatedPrecautions = [
          "Rest in an upright or semi-reclined position to assist breathing.",
          "Ensure the room is well-ventilated and free from smoke, dust, or cold air drafts.",
          "Drink warm fluids like tea or water to soothe airways.",
          "Monitor your breathing rate and seek prompt care if you struggle to speak full sentences."
        ];
      } else if (spec.includes('gastro') || spec.includes('stomach') || spec.includes('digest')) {
        generatedPrecautions = [
          "Stay hydrated by sipping small amounts of water or oral rehydration solutions (ORS) frequently.",
          "Avoid solid food, dairy, caffeine, alcohol, or oily dishes for the next 24 hours.",
          "Rest and place a warm compress on the abdomen if experiencing cramping.",
          "Seek care if you cannot keep liquids down or notice blood in stool/vomit."
        ];
      } else if (spec.includes('derm') || spec.includes('skin')) {
        generatedPrecautions = [
          "Avoid scratching or rubbing the affected skin area.",
          "Keep the skin clean and dry, using only lukewarm water and mild soaps.",
          "Avoid applying perfume, scented lotions, or unverified home remedies.",
          "Wear loose-fitting, breathable cotton clothing."
        ];
      } else if (spec.includes('ortho') || spec.includes('bone') || spec.includes('joint')) {
        generatedPrecautions = [
          "Apply the R.I.C.E. protocol: Rest the joint, Ice the area, Compress gently, and Elevate.",
          "Avoid putting weight or pressure on the painful limb.",
          "Do not massage the joint if there is active swelling or redness.",
          "Limit movements that trigger sharp pain."
        ];
      } else {
        generatedPrecautions = [
          "Get plenty of physical rest and sleep.",
          "Stay well hydrated by drinking adequate water.",
          "Monitor and record your temperature periodically.",
          "Avoid self-medicating with unprescribed drugs."
        ];
      }

      setIsTyping(false);
      addMessage(
        `AI Triage completed. Here are our recommendations based on your symptoms:`,
        'bot',
        {
          type: 'triage_results',
          triage: triageRes,
          doctors: docs,
          labs,
          precautions: generatedPrecautions
        }
      );
      
      setFlow('booking_results_display');
    } catch (error) {
      console.error(error);
      setIsTyping(false);
      addMessage("I apologize, but I could not analyze your symptoms at this moment. Please try again later.", 'bot');
      setFlow('menu');
    }
  };

  const startBookingFlow = async () => {
    setFlow('booking_start');
    addMessage("I want to book an appointment with a doctor", 'user');
    setIsTyping(true);

    try {
      const data = await patientApi.me();
      const patientObj = data?.data?.patient || data?.patient || data;
      if (patientObj) {
        setPatientProfile(patientObj);
      }
    } catch (e) {
      console.error("Failed to fetch fresh profile in booking flow", e);
    }

    setTimeout(() => {
      setIsTyping(false);
      addMessage("What problem do you have? Please describe your symptoms.", 'bot');
    }, 800);
  };

  const selectDoctor = (doc) => {
    setSelectedDoc(doc);
    setFlow('booking_confirm');
    addMessage(`Schedule with ${doc.fullName}`, 'user');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage(`Select a date and time for your consultation with ${doc.fullName}:`, 'bot', { type: 'select_date_time' });
    }, 800);
  };

  const confirmBooking = async () => {
    if (!bookingDate) {
      alert('Please choose a date');
      return;
    }
    setFlow('menu');
    setIsTyping(true);

    try {
      await appointmentApi.createAppointment({
        patientId: patientProfile?._id || patientProfile?.id,
        doctorId: selectedDoc?._id || selectedDoc?.id,
        appointmentDate: bookingDate,
        startTime: bookingTime,
        durationMinutes: 15,
        appointmentType: 'scheduled',
        source: 'chatbot',
        reasonForVisit: `AI Chatbot: Triage suggestion for ${selectedDoc?.specialization || 'General Practitioner'}`,
        symptomsSummary: symptomsInput
      });

      setIsTyping(false);
      addMessage(`✅ Appointment request submitted successfully for ${bookingDate} at ${bookingTime}. The clinic receptionist will confirm your slot.`, 'bot');
      setSelectedDoc(null);
      setBookingDate('');
    } catch (err) {
      setIsTyping(false);
      addMessage(`Failed to book appointment: ${err.response?.data?.message || err.message}`, 'bot');
      setSelectedDoc(null);
      setBookingDate('');
    }
  };

  const startDosageFlow = () => {
    setFlow('dosage_medicine');
    addMessage("I need a dosage recommendation", 'user');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage("What is the name of the medicine? (e.g. Paracetamol, Ibuprofen, Amoxicillin)", 'bot');
    }, 800);
  };

  const handleDosageMedicineSubmit = (medName) => {
    setDosageMed(medName);
    setFlow('dosage_age');
    addMessage(medName, 'user');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage(`What is the patient's age in years?`, 'bot');
    }, 800);
  };

  const handleDosageAgeSubmit = (age) => {
    setDosageAge(age);
    setFlow('dosage_weight');
    addMessage(`${age} years old`, 'user');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage(`What is the patient's weight in kilograms (kg)?`, 'bot');
    }, 800);
  };

  const handleDosageWeightSubmit = (weight) => {
    setDosageWeight(weight);
    setFlow('menu');
    addMessage(`${weight} kg`, 'user');
    setIsTyping(true);

    // Dosage calculation simulation
    setTimeout(() => {
      setIsTyping(false);
      
      const parsedAge = Number(dosageAge);
      const parsedWeight = Number(weight);
      let calculatedDosage = '';
      
      if (dosageMed.toLowerCase().includes('paracetamol') || dosageMed.toLowerCase().includes('crocin') || dosageMed.toLowerCase().includes('acetaminophen')) {
        // Pediatric/Adult paracetamol formula: ~15mg/kg per dose
        const mg = parsedWeight * 15;
        calculatedDosage = `${mg.toFixed(0)}mg orally every 4-6 hours (max 4 doses per 24 hours)`;
      } else if (dosageMed.toLowerCase().includes('ibuprofen')) {
        // ~10mg/kg per dose
        const mg = parsedWeight * 10;
        calculatedDosage = `${mg.toFixed(0)}mg orally every 6-8 hours (take with food)`;
      } else if (dosageMed.toLowerCase().includes('amoxicillin')) {
        // Antibiotics dosage: e.g. 20-40mg/kg/day divided into 3 doses
        const daily = parsedWeight * 30;
        calculatedDosage = `${(daily / 3).toFixed(0)}mg orally three times daily (complete full course of 5-7 days)`;
      } else {
        // Default standard dose suggestion
        calculatedDosage = parsedAge < 12 
          ? `Pediatric formulation recommended. Dosage estimation: ~7.5mg/kg per dose. Please consult clinic pediatrician.` 
          : `Adult standard dosage. Please check medicine leaflet or request pharmacy assistance.`;
      }

      addMessage(`Here is the estimated safe dosage for ${dosageMed} based on Age (${dosageAge}y) and Weight (${weight}kg):`, 'bot');
      addMessage(`Estimated Dose:\n👉 ${calculatedDosage}\n\n⚠️ DISCLAIMER: This is a rule-based AI suggestion. Always verify with your doctor or the clinic pharmacist before administering medications.`, 'bot');
      
      // Reset state
      setDosageMed('');
      setDosageAge('');
      setDosageWeight('');
    }, 1200);
  };

  const handleQuickInputSubmit = (text) => {
    if (flow === 'dosage_medicine') {
      handleDosageMedicineSubmit(text);
    } else if (flow === 'dosage_age') {
      handleDosageAgeSubmit(text);
    } else if (flow === 'dosage_weight') {
      handleDosageWeightSubmit(text);
    } else {
      setInputValue(text);
    }
  };

  return (
    <div className="fixed z-50 pointer-events-none" style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
      {/* Floating Trigger Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-aura-500 to-indigo-600 hover:from-aura-600 hover:to-indigo-700 flex items-center justify-center text-white shadow-glow-teal hover:scale-105 active:scale-95 transition-all duration-150"
          title="Open AI Assistant"
        >
          <Bot size={26} />
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          ref={dragRef}
          onPointerDown={handlePointerDown}
          style={{
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
          className="pointer-events-auto w-[350px] h-[500px] flex flex-col bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden cursor-move animate-scale-up"
        >
          {/* Draggable Chat Header */}
          <div className="px-4 py-3 bg-[#060d18] text-white flex justify-between items-center select-none shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-aura-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-aura-400">AuraCare AI</p>
                <p className="text-[10px] text-white/50">Movable Health Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="no-drag p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-drag bg-slate-50 dark:bg-navy-900/30">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap
                  ${msg.sender === 'user'
                    ? 'bg-aura-600 dark:bg-aura-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-sm'
                  }
                `}>
                  {msg.text}

                  {/* Render Custom Payload UI */}
                  {msg.payload?.type === 'select_doctor' && (
                    <div className="mt-3 space-y-1.5">
                      {doctorsList.slice(0, 4).map(doc => (
                        <button
                          key={doc._id}
                          onClick={() => selectDoctor(doc)}
                          className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-navy-900 hover:bg-aura-50 dark:hover:bg-aura-500/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition flex items-center gap-1.5"
                        >
                          <User size={12} className="text-aura-500" />
                          {doc.fullName} ({doc.specialization})
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.payload?.type === 'select_date_time' && (
                    <div className="mt-3 space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Date</label>
                        <input
                          type="date"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full p-2 bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Time</label>
                        <select
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full p-2 bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-lg text-xs"
                        >
                          <option value="09:00">09:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="14:00">02:00 PM</option>
                          <option value="15:00">03:00 PM</option>
                        </select>
                      </div>
                      <button
                        onClick={confirmBooking}
                        className="w-full py-1.5 bg-aura-600 hover:bg-aura-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Confirm Booking
                      </button>
                    </div>
                  )}

                  {msg.payload?.type === 'initial_options' && (
                    <div className="mt-3 space-y-2">
                      <button
                        onClick={startBookingFlow}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 hover:bg-aura-50 dark:hover:bg-aura-500/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition flex items-center gap-2"
                      >
                        <Calendar size={13} className="text-aura-500" />
                        Book an appointment with a doctor
                      </button>
                      <Link
                        to="/pharmacy/medicines"
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 hover:bg-aura-50 dark:hover:bg-aura-500/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition flex items-center gap-2"
                      >
                        <Pill size={13} className="text-emerald-500" />
                        Order a pharmacy
                      </Link>
                      <Link
                        to="/labs/tests"
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 hover:bg-aura-50 dark:hover:bg-aura-500/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition flex items-center gap-2"
                      >
                        <HelpCircle size={13} className="text-indigo-500" />
                        Book a lab test with us
                      </Link>
                    </div>
                  )}

                  {msg.payload?.type === 'triage_results' && (
                    <div className="mt-3 space-y-4">
                      {/* Specialization */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Triage Specialization</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            msg.payload.triage.urgency === 'high' ? 'bg-rose-100 text-rose-700' :
                            msg.payload.triage.urgency === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {msg.payload.triage.urgency} Urgency
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">
                          {msg.payload.triage.recommendedSpecialization || 'General Physician'}
                        </p>
                      </div>

                      {/* Recommended Lab Tests */}
                      {msg.payload.labs?.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Suggested Pre-consultation Labs</p>
                          <div className="space-y-1.5">
                            {msg.payload.labs.map((lab, i) => (
                              <div key={i} className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-950/20">
                                <p className="text-[11px] font-bold text-indigo-950 dark:text-indigo-300">🧪 {lab.test_name}</p>
                                <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400 mt-0.5">{lab.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Basic Precautions */}
                      {msg.payload.precautions?.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Precautions to take</p>
                          <ul className="list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                            {msg.payload.precautions.map((prec, i) => (
                              <li key={i}>{prec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Doctors */}
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Recommended Doctors</p>
                        {msg.payload.doctors?.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">No matching doctors found in this specialization.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {msg.payload.doctors.slice(0, 3).map(doc => (
                              <button
                                key={doc._id}
                                onClick={() => selectDoctor(doc)}
                                className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-navy-900 hover:bg-aura-50 dark:hover:bg-aura-500/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition flex items-center justify-between"
                              >
                                <div className="flex items-center gap-1.5">
                                  <User size={12} className="text-aura-500" />
                                  <span>{doc.fullName}</span>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-aura-500/10 text-aura-600 font-mono">Book Slot</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 rounded-2xl rounded-bl-sm px-3.5 py-2 flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Menu Actions */}
          {flow === 'menu' && (
            <div className="p-2.5 bg-white dark:bg-navy-800 border-t border-slate-100 dark:border-white/[0.06] flex gap-2 shrink-0 no-drag overflow-x-auto no-scrollbar">
              <button
                onClick={startBookingFlow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/20 transition whitespace-nowrap"
              >
                <Calendar size={13} />
                Book Doctor
              </button>
              <button
                onClick={startDosageFlow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/20 transition whitespace-nowrap"
              >
                <Pill size={13} />
                Dosage Suggestion
              </button>
            </div>
          )}

          {/* Text Input Footer */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 border-t border-slate-100 dark:border-white/[0.06] bg-white dark:bg-navy-800 flex gap-2 shrink-0 no-drag"
          >
            <input
              type={flow === 'dosage_age' || flow === 'dosage_weight' ? 'number' : 'text'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                flow === 'dosage_medicine' ? 'Enter medicine name...' :
                flow === 'dosage_age' ? 'Enter age in years...' :
                flow === 'dosage_weight' ? 'Enter weight in kg...' : 'Ask assistant...'
              }
              className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition"
            />
            <button
              type="button"
              onClick={() => {
                if (inputValue.trim()) {
                  handleQuickInputSubmit(inputValue.trim());
                  setInputValue('');
                }
              }}
              className="p-1.5 rounded-lg bg-aura-600 hover:bg-aura-700 text-white flex items-center justify-center"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default FloatingChatbot;
