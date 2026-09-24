import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Mic, StopCircle, Bot, MapPin, Store, Flag, ShieldAlert, FileText, CheckCircle } from 'lucide-react';
import './BusinessAdvisor.css';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Advanced Markdown Parser for Feasibility Report & QA
const renderMarkdown = (text) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    let cleanedLine = line.trim();
    
    // Empty lines
    if (cleanedLine === '') {
      return <div key={idx} style={{ height: '0.75rem' }}></div>;
    }

    // Headers
    let headerLevel = 0;
    if (cleanedLine.startsWith('### ')) { headerLevel = 3; cleanedLine = cleanedLine.substring(4); }
    else if (cleanedLine.startsWith('## ')) { headerLevel = 2; cleanedLine = cleanedLine.substring(3); }
    else if (cleanedLine.startsWith('# ')) { headerLevel = 1; cleanedLine = cleanedLine.substring(2); }

    // Bullet points
    const isBullet = cleanedLine.startsWith('- ') || cleanedLine.startsWith('* ');
    if (isBullet) cleanedLine = cleanedLine.substring(2);

    // Numbered lists (e.g. "1. ")
    const isNumbered = /^\d+\.\s/.test(cleanedLine);
    let numberPrefix = '';
    if (isNumbered) {
      numberPrefix = cleanedLine.match(/^\d+\.\s/)[0];
      cleanedLine = cleanedLine.substring(numberPrefix.length);
    }

    // Inline formatting: Bold (**text**) and Italic (*text*)
    const parts = cleanedLine.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ color: '#1D1D1F', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <em key={pIdx} style={{ color: '#444' }}>{part.slice(1, -1)}</em>;
      }
      // Remove any leftover rogue asterisks (often AI generates random stars)
      return part.replace(/\*/g, '');
    });

    if (headerLevel === 1) {
      return <h2 key={idx} style={{ color: '#0071E3', marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.4rem', borderBottom: '2px solid #e5e5ea', paddingBottom: '0.5rem', fontWeight: '800' }}>{formattedLine}</h2>;
    }
    if (headerLevel === 2) {
      return <h3 key={idx} style={{ color: '#1D1D1F', marginTop: '1.25rem', marginBottom: '0.75rem', fontSize: '1.2rem', fontWeight: '700' }}>{formattedLine}</h3>;
    }
    if (headerLevel === 3) {
      return <h4 key={idx} style={{ color: '#333', marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1.05rem', fontWeight: '600' }}>{formattedLine}</h4>;
    }

    if (isBullet || isNumbered) {
      return (
        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
          <span style={{ marginRight: '0.75rem', color: '#0071E3', fontWeight: 'bold', minWidth: '1rem' }}>
            {isNumbered ? numberPrefix : '•'}
          </span>
          <span style={{ lineHeight: '1.5', color: '#444' }}>{formattedLine}</span>
        </div>
      );
    }
    
    return <p key={idx} style={{ margin: '0 0 0.75rem 0', lineHeight: '1.5', color: '#444' }}>{formattedLine}</p>;
  });
};

// Interactive Local Market Analysis Map Component (Leaflet)
// Custom SVG Icons for Leaflet
const createCustomIcon = (color, type) => {
  const isCompetitor = type === 'competitor';
  const html = `
    <div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: ${isCompetitor ? '4px' : '50%'};
      border: 3px solid white;
      box-shadow: 0 0 10px ${color};
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-size: 12px;
      transform: translate(-50%, -50%);
    ">
      ${isCompetitor ? '🚩' : '🏬'}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const enterpriseIcon = L.divIcon({
  html: `<div style="font-size:24px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">📍</div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

// Pre-create stable icon instances — NEVER create these inside render (causes marker flicker)
const hubIcon = createCustomIcon('#30D158', 'hub');
const competitorIcon = createCustomIcon('#FF9F0A', 'competitor');

// Helper component to update map view dynamically
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.flyTo(center, 15, { duration: 2 });
    }
  }, [center, map]);
  return null;
};

// Memoized: only re-renders when location, pincode, or mapData reference changes
function LocalMarketMapInner({ mapData, location, pincode }) {
  const [centerCoords, setCenterCoords] = useState([20.5937, 78.9629]); // Default to India center
  const [loadingCoords, setLoadingCoords] = useState(false);

  // Fetch coordinates based on pincode first (most precise), then location name
  useEffect(() => {
    if (!location && !pincode) return;
    
    let isMounted = true;
    const fetchCoords = async () => {
      setLoadingCoords(true);
      try {
        let data = null;

        // STRATEGY 1: Use pincode (India postal code) — most precise
        if (pincode && pincode.length === 6) {
          const pincodeRes = await fetch(
            `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(pincode)}&countrycodes=in&format=json&limit=1&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          data = await pincodeRes.json();
        }

        // STRATEGY 2: Use location text scoped strictly to India
        if ((!data || data.length === 0) && location) {
          // Append ", India" to force scope to correct country
          const query = location.toLowerCase().includes('india') ? location : `${location}, India`;
          const locRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&limit=3&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const locData = await locRes.json();
          // Pick the result that best matches a city/village/district in India
          if (locData && locData.length > 0) {
            const best = locData.find(r => 
              ['city', 'town', 'village', 'administrative', 'municipality', 'district'].includes(r.type) ||
              r.class === 'boundary' || r.class === 'place'
            ) || locData[0];
            data = [best];
          }
        }

        if (data && data.length > 0 && isMounted) {
          setCenterCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      } catch (err) {
        console.error('Geocoding error', err);
      } finally {
        if (isMounted) setLoadingCoords(false);
      }
    };
    
    const timer = setTimeout(fetchCoords, 800);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [location, pincode]);

  const consumerHubs = useMemo(() => mapData?.consumerHubs || [
    { name: "Local Block Haat / Market", distanceKm: 2.2, type: "High Demand Consumer Hub" },
    { name: "District Farmers Market", distanceKm: 5.1, type: "Primary Retail Channel" },
    { name: "Cooperative Supply Point", distanceKm: 4.5, type: "Distribution Node" }
  ], [mapData]);
  
  const competitorPins = useMemo(() => mapData?.competitorPins || [
    { name: "Existing Vendor Cluster A", distanceKm: 1.8, density: "Medium" },
    { name: "Unorganized Store B", distanceKm: 3.4, density: "Low" },
    { name: "Regional Supplier C", distanceKm: 6.2, density: "High" }
  ], [mapData]);

  // Helper to generate jittered coords around center based on distance
  const getOffsetCoords = (center, distanceKm, index, total) => {
    const radiusInDegrees = distanceKm / 111; // 1 degree is roughly 111km
    const angle = (index / total) * Math.PI * 2;
    return [
      center[0] + radiusInDegrees * Math.sin(angle),
      center[1] + radiusInDegrees * Math.cos(angle)
    ];
  };

  return (
    <div className="map-widget-card" style={{ marginBottom: '2rem', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-light)', transform: 'translateZ(0)', isolation: 'isolate' }}>
      <div className="map-header" style={{ padding: '1.5rem', background: 'var(--bg-main)' }}>
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📍 Real-Time Market Heatmap
          </h4>
          <p className="map-subtitle" style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Dynamic Geo-Radius Analysis for <strong>{location || "Target Location"}</strong> 
            {loadingCoords && <span style={{ marginLeft: '10px', color: '#0071E3' }}>Locating...</span>}
          </p>
        </div>
      </div>

      <div style={{ height: '450px', width: '100%', position: 'relative' }}>
        <MapContainer center={centerCoords} zoom={13} style={{ height: '100%', width: '100%' }}>
          {/* Esri World Imagery — satellite layer (free, no API key, Google Maps quality) */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community'
            maxZoom={20}
          />
          {/* Esri World Boundaries & Places — street names / locality labels overlay */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=''
            maxZoom={20}
            opacity={1}
          />
          <MapUpdater center={centerCoords} />

          {/* 10km Outer Zone */}
          <Circle center={centerCoords} radius={10000} pathOptions={{ color: '#0071E3', fillColor: '#0071E3', fillOpacity: 0.05, weight: 1, dashArray: '5, 10' }} />
          
          {/* 5km Inner Core */}
          <Circle center={centerCoords} radius={5000} pathOptions={{ color: '#BF5AF2', fillColor: '#BF5AF2', fillOpacity: 0.1, weight: 2 }} />

          {/* Enterprise Center */}
          <Marker position={centerCoords} icon={enterpriseIcon}>
            <Popup>
              <strong>Proposed Enterprise</strong><br/>
              {location || "Selected Area"}
            </Popup>
          </Marker>

          {/* Consumer Hubs (Green) */}
          {consumerHubs.map((hub, i) => (
            <Marker key={`hub-${i}`} position={getOffsetCoords(centerCoords, hub.distanceKm, i, consumerHubs.length)} icon={hubIcon}>
              <Popup>
                <strong>{hub.name}</strong><br/>
                Distance: {hub.distanceKm}km<br/>
                Type: {hub.type}
              </Popup>
            </Marker>
          ))}

          {/* Competitor Nodes (Orange/Red) */}
          {competitorPins.map((comp, i) => (
            <Marker key={`comp-${i}`} position={getOffsetCoords(centerCoords, comp.distanceKm, i + 0.5, competitorPins.length)} icon={competitorIcon}>
              <Popup>
                <strong>{comp.name}</strong><br/>
                Distance: {comp.distanceKm}km<br/>
                Density: {comp.density}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="map-legend" style={{ display: 'flex', gap: '1rem', padding: '1rem 1.5rem', background: 'white', borderTop: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '1.2rem' }}>📍</span> Enterprise Center</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#30D158', borderRadius: '50%' }}></div> Consumer Hub</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#FF9F0A', borderRadius: '4px' }}></div> Competitor Node</div>
      </div>
    </div>
  );
}

LocalMarketMapInner.displayName = 'LocalMarketMap';
const LocalMarketMap = memo(LocalMarketMapInner);

const BusinessAdvisor = ({ onApply }) => {
  // Offline-First: Load initial state from localStorage if available
  const [formData, setFormData] = useState(() => {
    const savedForm = localStorage.getItem('udyam_form_state');
    if (savedForm) {
      try { return JSON.parse(savedForm); } catch(e) { console.warn(e); }
    }
    return {
      location: '',
      pincode: '',
      marginCapital: '',
      businessCategory: '',
      language: 'English',
      socialCategory: 'SC',
      annualIncome: '',
      gender: 'Female',
      age: '',
      aadhar: ''
    };
  });

  const isMounted = useRef(true);
  const formDataRef = useRef(formData);

  useEffect(() => {
    formDataRef.current = formData;
    localStorage.setItem('udyam_form_state', JSON.stringify(formData));
  }, [formData]);

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(() => {
    const savedReport = localStorage.getItem('udyam_cached_report');
    if (savedReport) {
      try { return JSON.parse(savedReport); } catch(e) { console.warn(e); }
    }
    return null;
  });
  const [financialPlan, setFinancialPlan] = useState(() => {
    const savedPlan = localStorage.getItem('udyam_cached_financials');
    if (savedPlan) {
      try { return JSON.parse(savedPlan); } catch(e) { console.warn(e); }
    }
    return null;
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Offline status listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  }, []);

  useEffect(() => {
    if (report) {
      localStorage.setItem('udyam_cached_report', JSON.stringify(report));
    }
  }, [report]);

  useEffect(() => {
    if (financialPlan) {
      localStorage.setItem('udyam_cached_financials', JSON.stringify(financialPlan));
    }
  }, [financialPlan]);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Voice Input (STT) & Error Modal State
  const [listeningField, setListeningField] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceErrorModal, setVoiceErrorModal] = useState({
    open: false,
    fieldName: '',
    fieldLabel: '',
    message: ''
  });

  // Complete Continuous Guided Auto-Advance Form Flow State (All 9 Sections)
  const [autoFlowActive, setAutoFlowActive] = useState(false);
  const [autoFlowStepIndex, setAutoFlowStepIndex] = useState(0);

  const completeVoiceSequence = [
    { name: 'language', label: 'Language Preference', type: 'select', step: 1 },
    { name: 'socialCategory', label: 'Social Target Category', type: 'select', step: 2 },
    { name: 'annualIncome', label: 'Annual Family Income', type: 'input', step: 2 },
    { name: 'gender', label: 'Applicant Gender', type: 'select', step: 2 },
    { name: 'age', label: 'Applicant Age', type: 'input', step: 2 },
    { name: 'location', label: 'Geographic Location', type: 'input', step: 3 },
    { name: 'businessCategory', label: 'Proposed Business Category', type: 'select', step: 3 },
    { name: 'marginCapital', label: 'Available Margin Capital Amount', type: 'input', step: 3 }
  ];

  // Active Reading & Selective Speech State
  const [activeReadingCard, setActiveReadingCard] = useState(null);

  // Interactive Financial Simulator Custom Margin State
  const [customMarginSim, setCustomMarginSim] = useState(null);

  const handleSwitchBusinessCategory = (newCategory) => {
    setFormData(prev => ({ ...prev, businessCategory: newCategory }));
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const text = formData.language === 'Hindi'
        ? `व्यवसाय बदलकर ${newCategory} कर दिया गया है।`
        : `Business category updated to ${newCategory}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = formData.language === 'Hindi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Voice AI QA Assistant State
  const [qaQuery, setQaQuery] = useState('');
  const [qaAnswer, setQaAnswer] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaListening, setQaListening] = useState(false);
  
  // DigiLocker eKYC Modal State
  const [digiLockerStatus, setDigiLockerStatus] = useState('idle'); // idle, verified
  const [showDlModal, setShowDlModal] = useState(false);
  const [dlStep, setDlStep] = useState(1); // 1: Aadhaar, 2: OTP, 3: Processing
  const [dlAadhaar, setDlAadhaar] = useState('');
  const [dlOtp, setDlOtp] = useState('');

  const handleDigiLockerStart = () => {
    setShowDlModal(true);
    setDlStep(1);
    setDlAadhaar('');
    setDlOtp('');
  };

  const handleDlSubmitAadhaar = () => {
    if (dlAadhaar.length >= 12) setDlStep(2);
  };

  const handleDlSubmitOtp = () => {
    if (dlOtp.length >= 6) {
      setDlStep(3); // Show processing
      setTimeout(() => {
        setShowDlModal(false);
        setDigiLockerStatus('verified');
        setFormData(prev => ({ ...prev, aadhar: '✅ Verified via DigiLocker (ID: ****-****-' + dlAadhaar.slice(-4) + ')' }));
      }, 2500);
    }
  };


  // Active Recognition Reference to abort/stop speech instantly
  const activeRecognitionRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setSpeechSupported(true);
    }
    return () => {
      isMounted.current = false;
      stopAllVoice();
    };
  }, []);

  // Global Master Stop Function to immediately halt all TTS and listening
  const stopAllVoice = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.abort();
        activeRecognitionRef.current.stop();
      } catch (e) {
        // ignore abort error
      }
      activeRecognitionRef.current = null;
    }

    setAutoFlowActive(false);
    setAutoFlowStepIndex(0);
    setListeningField(null);
    setIsSpeaking(false);
    setActiveReadingCard(null);
    setQaListening(false);
    setVoiceErrorModal({ open: false, fieldName: '', fieldLabel: '', message: '' });
  };

  const parseSpokenInput = (fieldName, text, currentValue) => {
    if (!text) return currentValue;
    let cleaned = text.trim();
    const lower = cleaned.toLowerCase();

    if (fieldName === 'language') {
      if (lower.includes('hindi') || lower.includes('हिंदी')) return 'Hindi';
      if (lower.includes('marathi') || lower.includes('मराठी')) return 'Marathi';
      if (lower.includes('tamil') || lower.includes('तमिल')) return 'Tamil';
      if (lower.includes('telugu') || lower.includes('तेलगु')) return 'Telugu';
      if (lower.includes('bengali') || lower.includes('বাংলা')) return 'Bengali';
      if (lower.includes('english')) return 'English';
      return currentValue; // Select fields should not accept raw text
    }

    if (fieldName === 'businessCategory') {
      if (lower.includes('agri') || lower.includes('kheti') || lower.includes('farm') || lower.includes('किसान')) return 'Agriculture & Allied';
      if (lower.includes('artisan') || lower.includes('handicraft') || lower.includes('craft') || lower.includes('शिल्प')) return 'Artisan / Handicraft';
      if (lower.includes('retail') || lower.includes('kirana') || lower.includes('store') || lower.includes('दुकान')) return 'Retail / Kirana Store';
      if (lower.includes('food') || lower.includes('processing') || lower.includes('खाना')) return 'Food Processing';
      if (lower.includes('textile') || lower.includes('apparel') || lower.includes('clothes') || lower.includes('कपड़ा')) return 'Textile & Apparel';
      if (lower.includes('service') || lower.includes('repair') || lower.includes('सेवा')) return 'Services / Repair Shop';
      return currentValue;
    }

    if (fieldName === 'socialCategory') {
      if (lower.includes('sc') || lower.includes('scheduled caste') || lower.includes('dalit')) return 'SC';
      if (lower.includes('obc') || lower.includes('backward')) return 'OBC';
      if (lower.includes('safai') || lower.includes('karamchari') || lower.includes('sweeper')) return 'Safai Karamchari';
      if (lower.includes('dnt') || lower.includes('tribe') || lower.includes('nomad')) return 'DNT';
      if (lower.includes('general') || lower.includes('unreserved') || lower.includes('सामान्य') || lower.includes('जनरल')) return 'General';
      return currentValue;
    }

    if (fieldName === 'gender') {
      if (lower.includes('female') || lower.includes('woman') || lower.includes('girl') || lower.includes('महिला') || lower.includes('aurat')) return 'Female';
      if (lower.includes('male') || lower.includes('man') || lower.includes('boy') || lower.includes('पुरुष') || lower.includes('aadmi')) return 'Male';
      if (lower.includes('trans') || lower.includes('other') || lower.includes('any')) return 'Transgender';
      return currentValue;
    }

    if (['marginCapital', 'annualIncome', 'age', 'aadhar'].includes(fieldName)) {
      const digits = cleaned.replace(/,/g, '').match(/\d+/g);
      if (digits && digits.length > 0) {
        let val = parseInt(digits.join(''), 10);
        if (/thousand|हजार/i.test(cleaned) && val < 1000) val *= 1000;
        if (/lakh|lac|लाख/i.test(cleaned) && val < 1000) val *= 100000;
        return val.toString();
      }

      if (lower.includes("पचास हजार") || lower.includes("pachas hazar") || lower.includes("fifty thousand")) return "50000";
      if (lower.includes("एक लाख") || lower.includes("ek lakh") || lower.includes("one lakh")) return "100000";
      if (lower.includes("दो लाख") || lower.includes("do lakh") || lower.includes("two lakh")) return "200000";
      if (lower.includes("ढाई लाख") || lower.includes("dhai lakh") || lower.includes("two and a half lakh")) return "250000";
      if (lower.includes("तीन लाख") || lower.includes("teen lakh") || lower.includes("three lakh")) return "300000";
      if (lower.includes("बीस हजार") || lower.includes("bees hazar") || lower.includes("twenty thousand")) return "20000";
      if (lower.includes("तीस हजार") || lower.includes("tees hazar") || lower.includes("thirty thousand")) return "30000";
      
      // If numbers field didn't find numbers, don't overwrite with raw words
      return currentValue;
    }
    
    return cleaned.replace(/\.$/, '');
  };

  // Humanizer TTS Helper
  const cleanTextForSpeech = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*/g, '')          // Remove bold asterisks
      .replace(/#/g, '')             // Remove headers (fixed useless escape)
      .replace(/\*/g, '')            // Remove italic asterisks
      .replace(/-\s/g, '. ')         // Convert bullet points to full stops for pausing
      .replace(/\n\n/g, '. ')        // Double newlines become full stops
      .replace(/\n/g, ', ')          // Single newlines become commas for slight pause
      .replace(/([a-zA-Z])([0-9])/g, '$1 $2') // Separate letters and numbers for better reading
      .trim();
  };

  const getBestVoice = (lang) => {
    const voices = window.speechSynthesis.getVoices();
    // Prefer Google or premium local voices for better cadence
    let bestVoice = voices.find(v => v.lang === lang && (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Enhanced')));
    if (!bestVoice) bestVoice = voices.find(v => v.lang === lang);
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    return bestVoice;
  };

  const triggerAutomaticVoicePrompt = (text, callback) => {
    try {
      window.speechSynthesis.cancel();
      const cleanText = cleanTextForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const currentLanguage = formDataRef.current.language;
      
      let langCode = 'en-IN';
      if (currentLanguage === 'Hindi') langCode = 'hi-IN';
      else if (currentLanguage === 'Marathi') langCode = 'mr-IN';
      else if (currentLanguage === 'Bengali') langCode = 'bn-IN';
      
      utterance.lang = langCode;
      utterance.rate = 0.90; // Slower for human pacing
      utterance.pitch = 1.0;

      const voice = getBestVoice(langCode);
      if (voice) utterance.voice = voice;

      if (callback) {
        utterance.onend = callback;
        utterance.onerror = callback;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error", e);
      if (callback) callback();
    }
  };

  // Selective Tap-to-Read Card Audio Playback
  const readCardAloud = (cardKey, textContent) => {
    if (activeReadingCard === cardKey) {
      stopAllVoice();
      return;
    }

    stopAllVoice();
    setActiveReadingCard(cardKey);

    const cleanText = cleanTextForSpeech(textContent);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    let langCode = 'en-IN';
    if (formData.language === 'Hindi') langCode = 'hi-IN';
    else if (formData.language === 'Marathi') langCode = 'mr-IN';
    else if (formData.language === 'Bengali') langCode = 'bn-IN';
    
    utterance.lang = langCode;
    utterance.rate = 0.88; // Slower for reports to allow processing
    utterance.pitch = 1.05; // Slightly higher pitch for clarity
    
    const voice = getBestVoice(langCode);
    if (voice) utterance.voice = voice;

    utterance.onend = () => setActiveReadingCard(null);
    utterance.onerror = () => setActiveReadingCard(null);

    window.speechSynthesis.speak(utterance);
  };

  // Complete Continuous Guided Voice Flow for ALL 9 Sections
  const startVoiceInput = (fieldName, fieldLabel = fieldName, isAutoAdvance = autoFlowActive, customStepIndex = null) => {
    window.speechSynthesis.cancel();
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    activeRecognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    const currentLanguage = formDataRef.current.language;
    if (currentLanguage === 'Hindi') recognition.lang = 'hi-IN';
    else if (currentLanguage === 'Marathi') recognition.lang = 'mr-IN';
    else if (currentLanguage === 'Tamil') recognition.lang = 'ta-IN';
    else if (currentLanguage === 'Telugu') recognition.lang = 'te-IN';
    else if (currentLanguage === 'Bengali') recognition.lang = 'bn-IN';
    else recognition.lang = 'en-IN';

    const targetItem = completeVoiceSequence.find(item => item.name === fieldName);
    if (targetItem) {
      setCurrentStep(targetItem.step);
    }

    setListeningField(fieldName);
    setVoiceErrorModal({ open: false, fieldName: '', fieldLabel: '', message: '' });

    let capturedText = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          capturedText += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const activeText = capturedText || interim;
      if (activeText) {
        setFormData(prev => {
          const parsed = parseSpokenInput(fieldName, activeText, prev[fieldName]);
          return { ...prev, [fieldName]: parsed };
        });
      }
    };

    let hasHandledEnd = false;

    const advanceToNextField = (currentIndex) => {
      if (currentIndex >= 0 && currentIndex < completeVoiceSequence.length - 1) {
        const nextIndex = currentIndex + 1;
        const nextItem = completeVoiceSequence[nextIndex];
        setAutoFlowStepIndex(nextIndex);

        const nextPrompt = formData.language === 'Hindi'
          ? `दर्ज हुआ. चरण ${nextIndex + 1}: अब अपना ${nextItem.label} बोलें.`
          : `Recorded! Step ${nextIndex + 1}: Next, please speak your ${nextItem.label}.`;
        
        triggerAutomaticVoicePrompt(nextPrompt, () => {
          setTimeout(() => {
            startVoiceInput(nextItem.name, nextItem.label, true, nextIndex);
          }, 450);
        });
      } else {
        const finishPrompt = formDataRef.current.language === 'Hindi'
          ? "सभी 9 चरण सफलतापूर्वक दर्ज हो चुके हैं! आपकी Feasibility Report तैयार की जा रही है."
          : "All 9 sections completed successfully! Generating your Feasibility Report now.";
        
        triggerAutomaticVoicePrompt(finishPrompt, () => {
          if (isMounted.current) {
            setAutoFlowActive(false);
            // Simulate form submission directly instead of DOM click
            const fakeEvent = { preventDefault: () => {} };
            handleSubmit(fakeEvent);
          }
        });
      }
    };

    const handleFailure = (reason = "no-speech") => {
      if (hasHandledEnd) return;
      hasHandledEnd = true;
      setListeningField(null);

      if (!capturedText) {
        setVoiceErrorModal({
          open: true,
          fieldName,
          fieldLabel,
          message: `Voice could not be captured for ${fieldLabel}. Please speak clearly and try again.`
        });

        const voiceText = formData.language === 'Hindi' 
          ? "आवाज़ नहीं मिली, कृपया दोबारा कोशिश करें. Try again, dobara karein." 
          : "Voice not captured. Try again, dobara karein.";
        
        triggerAutomaticVoicePrompt(voiceText);
      }
    };

    recognition.onerror = (event) => {
      handleFailure(event.error);
    };

    recognition.onend = () => {
      setListeningField(null);
      if (capturedText) {
        if (isAutoAdvance) {
          const cIndex = customStepIndex !== null ? customStepIndex : completeVoiceSequence.findIndex(item => item.name === fieldName);
          advanceToNextField(cIndex);
        }
      } else {
        handleFailure("no-speech");
      }
    };

    try {
      recognition.start();
    } catch (e) {
      handleFailure("start-failed");
    }
  };

  // Step 0: Start Continuous Guided Flow with Language Selection Prompt
  const startGuidedVoiceFlow = () => {
    stopAllVoice();
    setAutoFlowActive(true);
    setAutoFlowStepIndex(0);

    const initialLangPrompt = "Welcome to Guided Voice Mode! Which language would you like to speak in? Hindi, Marathi, Bengali, or English?";

    triggerAutomaticVoicePrompt(initialLangPrompt, () => {
      setTimeout(() => {
        startVoiceInput('language', 'Language Preference', true, 0);
      }, 450);
    });
  };

  // Interactive AI Voice QA Assistant Handler
  const askAIQuestion = async (questionText) => {
    const query = questionText || qaQuery;
    if (!query || query.trim().length === 0) return;

    setQaLoading(true);
    setQaAnswer(null);

    const activeScheme = financialPlan?.scheme || "NSKFDC / NSFDC MoSJE Assistance Scheme";
    const loc = formData.location || "Greater Noida / your area";
    const cat = formData.businessCategory || "Retail / Micro Business";

    try {
      const baseUrl = process.env.REACT_APP_BACKEND_URL || 'https://counting-semiconductor-alien-layout.trycloudflare.com';
      const apiUrl = baseUrl + '/api/ai/qa';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          reportContext: {
            location: loc,
            businessCategory: cat,
            scheme: activeScheme,
            marginCapital: formData.marginCapital || "50000"
          },
          language: formData.language
        })
      });

      const data = await response.json();
      if (data.success && data.answer) {
        setQaAnswer(data.answer);
        triggerAutomaticVoicePrompt(data.answer);
      } else {
        throw new Error("API returned error");
      }
    } catch (err) {
      const qLower = query.toLowerCase();
      const isHindi = formData.language === 'Hindi';
      let smartAnswer = "";

      if (/profit|earn|income|kamai|faida|margin|money/i.test(qLower)) {
        smartAnswer = isHindi
          ? `${cat} व्यवसाय से औसतन 18% से 25% का शुद्ध मासिक लाभ प्राप्त होता है। ₹${(formData.marginCapital * 10 || 500000).toLocaleString()} की लागत पर सामग्री और EMI काटकर अच्छा मुनाफा रहता है।`
          : `For ${cat} in ${loc}, micro-entrepreneurs typically earn an estimated 18% to 25% net monthly profit margin after accounting for raw materials and EMI payments.`;
      } else if (/risk|loss|nuksan|competitor|competition|darr|threat/i.test(qLower)) {
        smartAnswer = isHindi
          ? `${loc} में प्रतिस्पर्धा और जोखिम कम करने के लिए थोक विक्रेताओं से सीधे सामान खरीदें और 10% का आपातकालीन फंड बनाए रखें।`
          : `To minimize market risks in ${loc}, source inventory directly from regional wholesale hubs and maintain a 10% emergency buffer pool.`;
      } else if (/emi|repay|interest|byaj|tenure|kist|month/i.test(qLower)) {
        smartAnswer = isHindi
          ? `${activeScheme} की वार्षिक ब्याज दर 4% से 6.5% है। 6 महीने की छूट अवधि के बाद आसान किश्तें शुरू होती हैं जो स्मार्ट कॉन्ट्रैक्ट पर रिकॉर्ड होती हैं।`
          : `Under ${activeScheme}, your repayment starts after a 6-month moratorium period. The interest rate is 4% to 6.5% p.a. with up to 7 years tenure.`;
      } else if (/apply|register|document|aadhar|udyam|kagaaz/i.test(qLower)) {
        smartAnswer = isHindi
          ? `आवेदन करने के लिए DApp पर 10% मार्जिन एस्क्रो जमा करें। राज्य SCA एजेंसी सत्यापन के बाद 90% ऋण राशि आपके लिए स्वीकृत करेगी।`
          : `To apply, deposit your 10% margin capital into the smart contract escrow. The State Channelizing Agency (SCA) will verify your details and disburse 90% funding.`;
      } else {
        smartAnswer = isHindi
          ? `${activeScheme} के तहत ${loc} में 10% मार्जिन पूंजी (₹${formData.marginCapital || '50,000'}) जमा करने पर 90% सरकारी ऋण सहायता मिलती है।`
          : `Under ${activeScheme} in ${loc}, depositing your 10% margin capital (₹${formData.marginCapital || '50,000'}) unlocks 90% concessional government loan funding.`;
      }

      setQaAnswer(smartAnswer);
      triggerAutomaticVoicePrompt(smartAnswer);
    } finally {
      setQaLoading(false);
    }
  };

  const startQAQuestionVoiceInput = () => {
    stopAllVoice();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    activeRecognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;

    if (formData.language === 'Hindi') recognition.lang = 'hi-IN';
    else if (formData.language === 'Marathi') recognition.lang = 'mr-IN';
    else if (formData.language === 'Bengali') recognition.lang = 'bn-IN';
    else recognition.lang = 'en-IN';

    setQaListening(true);
    let spokenQuery = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          spokenQuery += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const activeText = spokenQuery || interim;
      setQaQuery(activeText);
    };

    recognition.onend = () => {
      setQaListening(false);
      if (spokenQuery) {
        askAIQuestion(spokenQuery);
      }
    };

    recognition.onerror = () => {
      setQaListening(false);
    };

    recognition.start();
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopAllVoice();
      return;
    }

    if (!report) return;

    stopAllVoice();
    setIsSpeaking(true);
    
    const textToSpeak = `
      Hyper-Local Business Feasibility Report for ${formData.location}.
      Data Freshness: ${report.dataFreshnessTimestamp || "Verified Sept 2026"}.
      Market Reach: ${report.marketReach}.
      Opportunity Analysis: ${report.opportunityAnalysis}.
      SWOT Analysis.
      Strengths: ${report.swot?.strengths?.join('. ')}.
      Weaknesses: ${report.swot?.weaknesses?.join('. ')}.
      Opportunities: ${report.swot?.opportunities?.join('. ')}.
      Threats: ${report.swot?.threats?.join('. ')}.
      Competitor Mapping: ${report.competitorMapping}.
      MoSJE Scheme Eligibility: ${report.mosjeEligibility}.
    `;

    const cleanText = cleanTextForSpeech(textToSpeak);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    let langCode = 'en-IN';
    if (formData.language === 'Hindi') langCode = 'hi-IN';
    else if (formData.language === 'Marathi') langCode = 'mr-IN';
    else if (formData.language === 'Bengali') langCode = 'bn-IN';
    
    utterance.lang = langCode;
    utterance.rate = 0.85; // deliberate, professional pacing
    
    const voice = getBestVoice(langCode);
    if (voice) utterance.voice = voice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculateFinancials = () => {
    const capital = parseFloat(formData.marginCapital);
    if (isNaN(capital) || capital <= 0) return null;

    const projectCost = capital * 10;
    const loanAmount = projectCost * 0.90;
    
    let scheme = '';
    let interest = 0;
    let tenureYears = 7;
    let moratoriumMonths = 6;

    if (formData.socialCategory === 'SC') {
      if (formData.businessCategory === 'Artisan / Handicraft') {
        scheme = 'NSFDC - Shilpi Samriddhi Yojana';
        interest = 5.0;
      } else if (loanAmount <= 140000) {
        scheme = 'NSFDC - Micro Credit Finance (MCF)';
        interest = 5.0;
        tenureYears = 3;
      } else if (formData.gender === 'Female') {
        scheme = 'NSFDC - Mahila Samriddhi Yojana';
        interest = 4.0;
      } else {
        scheme = 'NSFDC - Term Loan';
        interest = 6.0;
      }
    } else if (formData.socialCategory === 'OBC') {
      if (formData.businessCategory === 'Artisan / Handicraft') {
        scheme = 'NBCFDC - Shilpi Samriddhi Yojana';
        interest = 5.0;
      } else if (loanAmount <= 100000) {
        scheme = 'NBCFDC - Micro Finance Scheme';
        interest = 5.0;
        tenureYears = 3;
      } else if (formData.gender === 'Female') {
        scheme = 'NBCFDC - Mahila Samriddhi Yojana';
        interest = 5.0;
      } else {
        scheme = 'NBCFDC - General Loan';
        interest = 6.5;
      }
    } else if (formData.socialCategory === 'Safai Karamchari' || formData.socialCategory === 'DNT') {
      if (formData.gender === 'Female') {
        scheme = 'NSKFDC - Mahila Samriddhi Yojana';
        interest = 4.0;
      } else {
        scheme = 'NSKFDC - Micro Credit Scheme';
        interest = 5.0;
      }
    } else {
      scheme = 'General MSME Scheme (Mudra)';
      interest = 8.5;
    }

    const principal = loanAmount;
    const totalMonths = (tenureYears * 12) - moratoriumMonths;
    let emi = 0;

    if (interest === 0) {
      emi = principal / totalMonths;
    } else {
      const monthlyRate = (interest / 100) / 12;
      emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
            (Math.pow(1 + monthlyRate, totalMonths) - 1);
    }

    return {
      projectCost,
      loanAmount,
      scheme,
      interest,
      tenureYears,
      moratoriumMonths,
      monthlyEMI: Math.round(emi),
      quarterlyEMI: Math.round(emi * 3)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null);
    setFinancialPlan(null);

    const financials = calculateFinancials();
    if (!financials) {
      setError("Please enter a valid margin capital amount.");
      setLoading(false);
      return;
    }
    setFinancialPlan(financials);

    if (isOffline) {
      setError("You are currently offline. Your form data is saved, and we will generate your report automatically when internet is restored.");
      setLoading(false);
      // Wait for sync logic could go here
      return;
    }

    try {
      const baseUrl = process.env.REACT_APP_BACKEND_URL || 'https://counting-semiconductor-alien-layout.trycloudflare.com';
      const apiUrl = baseUrl + '/api/ai/advisor';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success && data.data) {
        setReport(data.data);
      } else {
        setError(data.error || "Failed to generate AI report.");
      }
    } catch (err) {
      setError("Server error. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const isVoiceActive = autoFlowActive || listeningField || isSpeaking || activeReadingCard || qaListening;

  return (
    <div className="advisor-container">
      {/* Floating Emergency Master Voice Control Bar */}
      {isVoiceActive && (
        <div className="floating-voice-stop-pill">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="live-voice-dot"></span>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1D1D1F' }}>
              {autoFlowActive 
                ? `Auto-Flow Step ${autoFlowStepIndex + 1}/9 Active` 
                : listeningField 
                ? `Listening (${listeningField})...` 
                : isSpeaking 
                ? "Reading Aloud..." 
                : "Voice Assistant Active..."}
            </span>
            <button className="btn-stop-voice-master" onClick={stopAllVoice}>
              🛑 Stop Voice / बंद करें
            </button>
          </div>
        </div>
      )}

      <div className="advisor-grid">
        <div className="input-section card">
          
          <div className="wizard-header-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="42" height="42" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '12px' }}>
                  <defs>
                    <linearGradient id="udyamGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00C6FF" />
                      <stop offset="100%" stopColor="#30D158" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  {/* U shape */}
                  <path d="M 16 16 L 16 38 C 16 48 24 54 32 54 C 36 54 40 52.5 43 50" stroke="#00C6FF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#glow)"/>
                  {/* Trending upward sprout/checkmark */}
                  <path d="M 32 54 C 44 54 48 40 48 28 L 48 10 M 48 10 L 36 10 M 48 10 L 48 22" stroke="url(#udyamGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#glow)"/>
                  {/* Small Brain/AI node */}
                  <circle cx="48" cy="10" r="5" fill="#30D158" filter="url(#glow)"/>
                </svg>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', background: 'linear-gradient(90deg, #FFFFFF, #E2E8F0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Udyam AI</h2>
              </div>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Business Setup Wizard
            </div>
          </div>

          {/* Voice Input Assistance & Hands-Free Flow Banner - Now Sleeker inside card */}
          <div className="voice-assistance-banner" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🎙️</span>
                <div>
                  <strong style={{ color: 'white' }}>Hands-Free Voice Mode ({formData.language})</strong>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                    {autoFlowActive 
                      ? `Step ${autoFlowStepIndex + 1} of 9: Continuous voice flow active for ${completeVoiceSequence[autoFlowStepIndex]?.label}...` 
                      : "Speak ALL 9 form sections continuously from start to end in your language!"
                    }
                  </div>
                </div>
              </div>

              {speechSupported && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className={`guided-flow-btn ${autoFlowActive ? 'active' : ''}`}
                    onClick={autoFlowActive ? stopAllVoice : startGuidedVoiceFlow}
                    style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: '600' }}
                  >
                    {autoFlowActive ? "🛑 Stop Auto-Flow" : "⚡ Start Complete Voice Flow"}
                  </button>
                  {isVoiceActive && (
                    <button type="button" className="btn-stop-voice-master" onClick={stopAllVoice} style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                      🛑 Stop
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem' }}>
            {currentStep === 1 ? 'Step 1: Welcome to Udyam AI' : currentStep === 2 ? 'Step 2: Applicant Profile' : 'Step 3: Describe Your Rural Venture'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '2rem' }}>
            {currentStep === 1 ? 'Let\'s set up your language and verify your identity.' : currentStep === 2 ? 'Tell us a bit about yourself so we can find the best schemes.' : 'Help us understand your business idea by defining its core category and purpose.'}
          </p>
          <form onSubmit={handleSubmit}>

            <div className="wizard-progress-bar">
              <div className="progress-fill" style={{ width: `${(currentStep / 3) * 100}%` }}></div>
            </div>
            <div className="wizard-step-indicator">
              <span className={currentStep >= 1 ? 'active' : ''}>1. Onboarding</span>
              <span className={currentStep >= 2 ? 'active' : ''}>2. Profile</span>
              <span className={currentStep >= 3 ? 'active' : ''}>3. Business</span>
            </div>

            <div style={{ display: currentStep === 1 ? 'grid' : 'none', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                            <div className="form-group full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Language Preference for Voice & Report</label>
                  {speechSupported && (
                    <button 
                      type="button" 
                      className={`stt-mic-btn ${listeningField === 'language' ? 'listening' : ''}`}
                      onClick={() => startVoiceInput('language', 'Language Preference')}
                      title="Speak language"
                    >
                      {listeningField === 'language' ? <><Mic size={14} color="#FF453A" style={{marginRight: '6px'}}/> Listening...</> : <><Mic size={14} style={{marginRight: '6px'}}/> Speak</>}
                    </button>
                  )}
                </div>
                <select name="language" value={formData.language} onChange={handleChange}>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Marathi">Marathi (मराठी)</option>
                  <option value="Bengali">Bengali (বাংলা)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                </select>
              </div>
              <div className="form-group full-width">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ margin: 0 }}>Aadhar / Udyam eKYC</label>
                  <span style={{ fontSize: '0.8rem', color: '#1B8A3A', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    <ShieldAlert size={14} color="#1B8A3A"/> Government Secure
                  </span>
                </div>
                
                {digiLockerStatus === 'idle' && (
                  <button 
                    type="button" 
                    onClick={handleDigiLockerStart}
                    style={{ 
                      width: '100%', padding: '1rem', background: '#e0f5e4', 
                      border: '2px dashed #30D158', color: '#1B8A3A', 
                      borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', 
                      cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#d1f0d7'}
                    onMouseOut={e => e.currentTarget.style.background = '#e0f5e4'}
                  >
                    <FileText size={18} /> Connect DigiLocker to Verify Identity
                  </button>
                )}

                {digiLockerStatus === 'verified' && (
                  <div style={{ width: '100%', padding: '1rem', background: '#f0f9f0', border: '1px solid #30D158', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle size={24} color="#30D158" />
                      <div>
                        <div style={{ color: '#1D1D1F', fontWeight: 'bold', fontSize: '0.95rem' }}>Aadhaar Verified</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>Name: Rural Entrepreneur • Category: OBC</div>
                      </div>
                    </div>
                    <span style={{ background: '#30D158', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>eKYC COMPLETE</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: currentStep === 2 ? 'grid' : 'none', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                            <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Social Category (MoSJE Target Group)</label>
                  {speechSupported && (
                    <button 
                      type="button" 
                      className={`stt-mic-btn ${listeningField === 'socialCategory' ? 'listening' : ''}`}
                      onClick={() => startVoiceInput('socialCategory', 'Social Target Category')}
                      title="Speak category"
                    >
                      {listeningField === 'socialCategory' ? "🔴 Listening..." : "🎙️ Speak"}
                    </button>
                  )}
                </div>
                <select name="socialCategory" value={formData.socialCategory} onChange={handleChange}>
                  <option value="SC">Scheduled Caste (SC)</option>
                  <option value="OBC">Other Backward Class (OBC)</option>
                  <option value="Safai Karamchari">Safai Karamchari</option>
                  <option value="DNT">De-Notified Tribes (DNT)</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Applicant Gender</label>
                  {speechSupported && (
                    <button 
                      type="button" 
                      className={`stt-mic-btn ${listeningField === 'gender' ? 'listening' : ''}`}
                      onClick={() => startVoiceInput('gender', 'Applicant Gender')}
                      title="Speak gender"
                    >
                      {listeningField === 'gender' ? "🔴 Listening..." : "🎙️ Speak"}
                    </button>
                  )}
                </div>
                <select name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Transgender">Transgender</option>
                </select>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Applicant Age</label>
                  {speechSupported && (
                    <button 
                      type="button" 
                      className={`stt-mic-btn ${listeningField === 'age' ? 'listening' : ''}`}
                      onClick={() => startVoiceInput('age', 'Applicant Age')}
                      title="Speak age"
                    >
                      {listeningField === 'age' ? "🔴 Listening..." : "🎙️ Speak"}
                    </button>
                  )}
                </div>
                <input 
                  type="number" 
                  name="age"
                  placeholder="e.g. 28"
                  value={formData.age}
                  onChange={handleChange}
                  min="18"
                  max="70"
                  required
                />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Annual Family Income (₹)</label>
                  {speechSupported && (
                    <button 
                      type="button" 
                      className={`stt-mic-btn ${listeningField === 'annualIncome' ? 'listening' : ''}`}
                      onClick={() => startVoiceInput('annualIncome', 'Annual Family Income')}
                      title="Speak income"
                    >
                      {listeningField === 'annualIncome' ? "🔴 Listening..." : "🎙️ Speak"}
                    </button>
                  )}
                </div>
                <input 
                  type="number" 
                  name="annualIncome"
                  placeholder="e.g. 250000"
                  value={formData.annualIncome}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={{ display: currentStep === 3 ? 'grid' : 'none', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                            <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Geographic Location (Village/Block)</label>
                  {speechSupported && (
                    <button 
                      type="button" 
                      className={`stt-mic-btn ${listeningField === 'location' ? 'listening' : ''}`}
                      onClick={() => startVoiceInput('location', 'Geographic Location')}
                      title="Speak location"
                    >
                      {listeningField === 'location' ? <><Mic size={14} color="#FF453A" style={{marginRight: '6px'}}/> Listening...</> : <><Mic size={14} style={{marginRight: '6px'}}/> Speak</>}
                    </button>
                  )}
                </div>
                <input 
                  type="text" 
                  name="location"
                  placeholder="e.g. Palghar, Maharashtra"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>
            <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Pincode (6-digit) <span style={{color:'#30D158',fontSize:'0.75rem',fontWeight:600}}>📍 Precise Map</span></label>
                  {speechSupported && (
                    <button 
                      type="button" 
                      className={`stt-mic-btn ${listeningField === 'pincode' ? 'listening' : ''}`}
                      onClick={() => startVoiceInput('pincode', 'Pincode')}
                      title="Speak pincode"
                    >
                      {listeningField === 'pincode' ? <><Mic size={14} color="#FF453A" style={{marginRight: '6px'}}/> Listening...</> : <><Mic size={14} style={{marginRight: '6px'}}/> Speak</>}
                    </button>
                  )}
                </div>
                <input 
                  type="text" 
                  name="pincode"
                  placeholder="e.g. 205001 (Mainpuri)"
                  value={formData.pincode || ''}
                  onChange={handleChange}
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Proposed Business Category</label>
                  {speechSupported && (
                    <button 
                      type="button" 
                      className={`stt-mic-btn ${listeningField === 'businessCategory' ? 'listening' : ''}`}
                      onClick={() => startVoiceInput('businessCategory', 'Proposed Business Category')}
                      title="Speak category"
                    >
                      {listeningField === 'businessCategory' ? <><Mic size={14} color="#FF453A" style={{marginRight: '6px'}}/> Listening...</> : <><Mic size={14} style={{marginRight: '6px'}}/> Speak</>}
                    </button>
                  )}
                </div>
                <select name="businessCategory" value={formData.businessCategory} onChange={handleChange}>
                  <option value="">Select Category</option>
                  <option value="Agriculture & Allied">Agriculture & Allied</option>
                  <option value="Artisan / Handicraft">Artisan / Handicraft</option>
                  <option value="Retail / Kirana Store">Retail / Kirana Store</option>
                  <option value="Food Processing">Food Processing</option>
                  <option value="Textile & Apparel">Textile & Apparel</option>
                  <option value="Services / Repair Shop">Services / Repair Shop</option>
                </select>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Available Margin Capital (₹) [10%]</label>
                  {speechSupported && (
                    <button 
                      type="button" 
                      className={`stt-mic-btn ${listeningField === 'marginCapital' ? 'listening' : ''}`}
                      onClick={() => startVoiceInput('marginCapital', 'Margin Capital Amount')}
                      title="Speak amount"
                    >
                      {listeningField === 'marginCapital' ? <><Mic size={14} color="#FF453A" style={{marginRight: '6px'}}/> Listening...</> : <><Mic size={14} style={{marginRight: '6px'}}/> Speak</>}
                    </button>
                  )}
                </div>
                <input 
                  type="number" 
                  name="marginCapital"
                  placeholder="e.g. 50000"
                  value={formData.marginCapital}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="wizard-navigation">
              {currentStep > 1 && (
                <button type="button" className="btn-secondary" onClick={() => setCurrentStep(currentStep - 1)}>
                  Back
                </button>
              )}
              
              {currentStep < 3 && (
                <button type="button" className="btn-primary wizard-next-btn" onClick={() => setCurrentStep(currentStep + 1)}>
                  Continue
                </button>
              )}
              
              {currentStep === 3 && (
            <button 
              id="submit-feasibility-btn"
              type="submit" 
              disabled={loading} 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1rem' }}
            >
              {loading ? "Generating Hyper-Local Report..." : "Generate Business Feasibility Report"}
            </button>
              )}
            </div>
          </form>
          {error && <div className="error-alert">{error}</div>}
        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <div style={{ fontWeight: '600', color: '#0071E3', fontSize: '1.1rem' }}>Analyzing Hyper-Local Market & Geo Data...</div>
            <div style={{ color: '#6E6E73', fontSize: '0.9rem' }}>UdyamAI Custom Model is generating structured feasibility & confidence scores</div>
          </div>
        )}

        {financialPlan && (
          <div className="financial-section card highlight">
            <h3>Smart Financial Structuring</h3>
            <div className="financial-details">
              <p><strong>Total Project Cost:</strong> ₹{financialPlan.projectCost.toLocaleString()}</p>
              <p><strong>Max Government Loan (90%):</strong> ₹{financialPlan.loanAmount.toLocaleString()}</p>
              <hr />
              <div className="scheme-box">
                <h4>Recommended Scheme: {financialPlan.scheme}</h4>
                <ul>
                  <li>Interest Rate: {financialPlan.interest}% p.a.</li>
                  <li>Tenure: {financialPlan.tenureYears} Years</li>
                  <li>Moratorium: {financialPlan.moratoriumMonths} Months</li>
                </ul>
              </div>
              <p><strong>Est. Monthly EMI:</strong> ₹{financialPlan.monthlyEMI.toLocaleString()}</p>
              <p><strong>Est. Quarterly EMI:</strong> ₹{financialPlan.quarterlyEMI.toLocaleString()}</p>
              <button className="btn-success" onClick={onApply}>Apply for Smart Escrow Loan (10% Deposit)</button>
            </div>
          </div>
        )}
      </div>

      {report && (
        <div className="report-section card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>Hyper-Local Business Feasibility Report</h3>
              <div className="freshness-badge">
                ⏱️ Data Freshness: <strong>{report.dataFreshnessTimestamp || "Verified Real-Time (Sept 2026)"}</strong>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#86868B', marginTop: '0.25rem' }}>
                💡 <em>Tip: Tap any card below to listen ONLY to that section read aloud!</em>
              </p>
            </div>

            <button 
              onClick={toggleSpeech}
              className="btn-primary" 
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', background: isSpeaking ? '#FF3B30' : 'linear-gradient(135deg, #0071E3, #BF5AF2)', boxShadow: isSpeaking ? 'none' : '0 4px 14px rgba(191, 90, 242, 0.3)' }}
            >
              {isSpeaking ? "🔇 Stop Full Reading" : "🔊 Read Entire Report Aloud"}
            </button>
          </div>
          
          {/* Interactive Map Component */}
          <LocalMarketMap mapData={report.mapData} location={formData.location} pincode={formData.pincode} />

          {/* Interactive AI Voice QA Query Assistant Bar */}
          <div className="qa-assistant-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: '700', fontSize: '1rem', color: '#1D1D1F' }}>
                🧠 AI Voice Advisor Assistant (Ask any Question)
              </span>
              <span style={{ fontSize: '0.8rem', color: '#0071E3' }}>Powered by UdyamAI Custom Model</span>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); askAIQuestion(); }} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Ask any question about your scheme, market, or loan (e.g. 'Tell me more about this government scheme')"
                value={qaQuery}
                onChange={(e) => setQaQuery(e.target.value)}
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-light)', fontSize: '0.9rem' }}
              />

              {speechSupported && (
                <button 
                  type="button" 
                  className={`stt-mic-btn ${qaListening ? 'listening' : ''}`}
                  onClick={startQAQuestionVoiceInput}
                  style={{ padding: '0.75rem 1.25rem' }}
                >
                  {qaListening ? "🔴 Listening..." : "🎙️ Ask by Voice"}
                </button>
              )}

              <button type="submit" disabled={qaLoading} className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
                {qaLoading ? "Thinking..." : "Ask AI"}
              </button>
            </form>

            {qaAnswer && (
              <div className="qa-answer-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: '700', color: '#0071E3', fontSize: '0.95rem' }}>💡 AI Voice Answer:</span>
                  <button className="close-node-btn" onClick={() => setQaAnswer(null)}>✕</button>
                </div>
                <div style={{ margin: 0, fontSize: '0.95rem', color: '#1D1D1F', fontWeight: '500' }}>{renderMarkdown(qaAnswer)}</div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#0071E3', fontWeight: '600' }}>
                  🔊 <em>Reading response out loud in {formData.language}...</em>
                </div>
              </div>
            )}
          </div>

          <div className="report-grid" style={{ marginTop: '1.5rem' }}>
            <div 
              className={`report-card clickable ${activeReadingCard === 'marketReach' ? 'active-reading' : ''}`}
              onClick={() => readCardAloud('marketReach', `Market Reach: ${report.marketReach}`)}
            >
              <div className="card-header-flex">
                <h4>🎯 Market Reach <span className="speak-icon">{activeReadingCard === 'marketReach' ? '🔊 Reading...' : '🔊 Tap to Read'}</span></h4>
                <span className="confidence-badge ai-estimate">
                  🔵 {report.confidenceScores?.marketReach || 88}% Confidence (AI Estimate)
                </span>
              </div>
              <div className="parsed-markdown" style={{ fontSize: '0.95rem', color: '#1D1D1F' }}>{renderMarkdown(report.marketReach)}</div>
            </div>
            
            <div 
              className={`report-card clickable ${activeReadingCard === 'opportunity' ? 'active-reading' : ''}`}
              onClick={() => readCardAloud('opportunity', `Opportunity Analysis: ${report.opportunityAnalysis}`)}
            >
              <div className="card-header-flex">
                <h4>💡 Opportunity Analysis <span className="speak-icon">{activeReadingCard === 'opportunity' ? '🔊 Reading...' : '🔊 Tap to Read'}</span></h4>
                <span className="confidence-badge ai-estimate">
                  🔵 {report.confidenceScores?.opportunityAnalysis || 85}% Confidence (AI Estimate)
                </span>
              </div>
              <div className="parsed-markdown" style={{ fontSize: '0.95rem', color: '#1D1D1F' }}>{renderMarkdown(report.opportunityAnalysis)}</div>
            </div>
            
            <div 
              className={`report-card clickable ${activeReadingCard === 'productValue' ? 'active-reading' : ''}`}
              onClick={() => readCardAloud('productValue', `Product Market Value: ${report.productMarketValue}`)}
            >
              <div className="card-header-flex">
                <h4>💰 Product Market Value <span className="speak-icon">{activeReadingCard === 'productValue' ? '🔊 Reading...' : '🔊 Tap to Read'}</span></h4>
                <span className="confidence-badge ai-estimate">
                  🔵 {report.confidenceScores?.productMarketValue || 89}% Confidence (AI Estimate)
                </span>
              </div>
              <div className="parsed-markdown" style={{ fontSize: '0.95rem', color: '#1D1D1F' }}>{renderMarkdown(report.productMarketValue)}</div>
            </div>
            
            <div 
              className={`report-card clickable ${activeReadingCard === 'threats' ? 'active-reading' : ''}`}
              onClick={() => readCardAloud('threats', `Threats Identification: ${report.threatsIdentification}`)}
            >
              <div className="card-header-flex">
                <h4>⚠️ Threats Identification <span className="speak-icon">{activeReadingCard === 'threats' ? '🔊 Reading...' : '🔊 Tap to Read'}</span></h4>
                <span className="confidence-badge ai-estimate">
                  🔵 {report.confidenceScores?.threatsIdentification || 87}% Confidence (Risk Model)
                </span>
              </div>
              <div className="parsed-markdown" style={{ fontSize: '0.95rem', color: '#1D1D1F' }}>{renderMarkdown(report.threatsIdentification)}</div>
            </div>
            
            <div 
              className={`report-card full-width clickable ${activeReadingCard === 'competitors' ? 'active-reading' : ''}`}
              onClick={() => readCardAloud('competitors', `Competitor Mapping: ${report.competitorMapping}`)}
            >
              <div className="card-header-flex">
                <h4>📍 Competitor Mapping <span className="speak-icon">{activeReadingCard === 'competitors' ? '🔊 Reading...' : '🔊 Tap to Read'}</span></h4>
                <span className="confidence-badge ai-estimate">
                  🔵 {report.confidenceScores?.competitorMapping || 86}% Confidence (Density Model)
                </span>
              </div>
              <div className="parsed-markdown" style={{ fontSize: '0.95rem', color: '#1D1D1F' }}>{renderMarkdown(report.competitorMapping)}</div>
            </div>

            <div 
              className={`report-card full-width clickable ${activeReadingCard === 'mosje' ? 'active-reading' : ''}`}
              style={{ borderLeft: '4px solid #30D158' }}
              onClick={() => readCardAloud('mosje', `MoSJE Scheme Eligibility Assessment: ${report.mosjeEligibility}`)}
            >
              <div className="card-header-flex">
                <h4>🏛️ MoSJE Scheme Eligibility Assessment <span className="speak-icon">{activeReadingCard === 'mosje' ? '🔊 Reading...' : '🔊 Tap to Read'}</span></h4>
                <span className="confidence-badge verified-rule">
                  🟢 {report.confidenceScores?.mosjeEligibility || 98}% Confidence (Verified Govt Policy Engine)
                </span>
              </div>
              <div className="parsed-markdown" style={{ fontWeight: '500', color: '#1D1D1F', fontSize: '0.95rem' }}>{renderMarkdown(report.mosjeEligibility)}</div>
            </div>

            <div 
              className={`report-card full-width swot-box clickable ${activeReadingCard === 'swot' ? 'active-reading' : ''}`}
              onClick={() => readCardAloud('swot', `SWOT Analysis. Strengths: ${report.swot?.strengths?.join('. ')}. Weaknesses: ${report.swot?.weaknesses?.join('. ')}. Opportunities: ${report.swot?.opportunities?.join('. ')}. Threats: ${report.swot?.threats?.join('. ')}.`)}
            >
              <div className="card-header-flex">
                <h4>📊 SWOT Analysis <span className="speak-icon">{activeReadingCard === 'swot' ? '🔊 Reading...' : '🔊 Tap to Read'}</span></h4>
                <span className="confidence-badge ai-estimate">
                  🔵 {report.confidenceScores?.swot || 90}% Confidence (Analytical Model)
                </span>
              </div>
              <div className="swot-grid">
                <div className="swot-item">
                  <h5>Strengths</h5>
                  <ul>{report.swot?.strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
                <div className="swot-item">
                  <h5>Weaknesses</h5>
                  <ul>{report.swot?.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
                <div className="swot-item">
                  <h5>Opportunities</h5>
                  <ul>{report.swot?.opportunities?.map((o, i) => <li key={i}>{o}</li>)}</ul>
                </div>
                <div className="swot-item">
                  <h5>Threats</h5>
                  <ul>{report.swot?.threats?.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              </div>
            </div>

            {/* AI Recommendation Engine Feature */}
            {report.recommendationEngine && (
              <div 
                className={`report-card full-width rec-card clickable ${activeReadingCard === 'recommendations' ? 'active-reading' : ''}`}
                onClick={() => readCardAloud('recommendations', `AI Recommendation Engine. Top opportunity in ${formData.location} is ${report.recommendationEngine[0]?.category} with score ${report.recommendationEngine[0]?.viabilityScore} out of 100.`)}
              >
                <div className="card-header-flex">
                  <h4>🎯 AI Recommendation Engine: Top Local Opportunities <span className="speak-icon">{activeReadingCard === 'recommendations' ? '🔊 Reading...' : '🔊 Tap to Read'}</span></h4>
                  <span className="confidence-badge ai-estimate">
                    🔵 {report.confidenceScores?.recommendationEngine || 92}% Viability Index ({formData.location})
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#6E6E73', marginBottom: '1.25rem' }}>
                  Evaluated 5 high-yield micro-businesses suited for <strong>{formData.location}</strong> against your initial selection &quot;<em>{formData.businessCategory}</em>&quot; to prevent anecdotal choices:
                </p>

                <div className="rec-list">
                  {report.recommendationEngine.map((item, idx) => {
                    const isSelected = item.isUserChoice || item.category.toLowerCase() === formData.businessCategory.toLowerCase();
                    return (
                      <div key={idx} className={`rec-item ${isSelected ? 'selected-user-choice' : ''}`}>
                        <div className="rec-item-header">
                          <div className="rec-badge-title">
                            <span className={`rec-rank-pill rank-${item.rank || idx + 1}`}>#{item.rank || idx + 1}</span>
                            <span className="rec-category-name">{item.category}</span>
                            {isSelected && <span className="user-choice-badge">🎯 Current Choice</span>}
                          </div>
                          <div className="rec-score-wrapper">
                            <span className="rec-score-num">{item.viabilityScore}/100</span>
                          </div>
                        </div>

                        <div className="rec-progress-bg">
                          <div 
                            className="rec-progress-fill" 
                            style={{ 
                              width: `${item.viabilityScore}%`,
                              background: item.viabilityScore >= 80 ? 'linear-gradient(90deg, #30D158, #28CD41)' : item.viabilityScore >= 70 ? 'linear-gradient(90deg, #0071E3, #54A0FF)' : 'linear-gradient(90deg, #FF9F0A, #FFB340)'
                            }} 
                          />
                        </div>

                        <div className="rec-advantage-tag">
                          ⚡ <strong>Key Advantage:</strong> {item.keyAdvantage}
                        </div>

                        <p className="rec-rationale">{item.rationale}</p>

                        {!isSelected && (
                          <button 
                            type="button" 
                            className="btn-switch-category"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSwitchBusinessCategory(item.category);
                            }}
                          >
                            🔄 Switch to {item.category} (1-Click)
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* "What If?" Financial Simulator Matrix Feature */}
            {report.whatIfScenarios && (
              <div 
                className={`report-card full-width simulator-card clickable ${activeReadingCard === 'simulator' ? 'active-reading' : ''}`}
                onClick={() => readCardAloud('simulator', `"What If?" Financial Simulator. Comparing 3 financial scaling scenarios for your business.`)}
              >
                <div className="card-header-flex">
                  <h4>🔮 &quot;What If?&quot; Financial Scenario Matrix <span className="speak-icon">{activeReadingCard === 'simulator' ? '🔊 Reading...' : '🔊 Tap to Read'}</span></h4>
                  <span className="confidence-badge verified-rule">
                    🟢 90% Govt Loan Calculator
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#6E6E73', marginBottom: '1rem' }}>
                  Compare financial viability across 3 distinct operational scales based on margin capital availability:
                </p>

                {/* Interactive Margin Capital Slider */}
                <div className="simulator-slider-box" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: '700', fontSize: '0.875rem', color: '#1D1D1F' }}>
                      🎛️ Test Custom Margin Capital (10%): 
                    </label>
                    <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0071E3' }}>
                      ₹{((customMarginSim !== null ? customMarginSim : parseInt(formData.marginCapital, 10)) || 50000).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="10000"
                    max="500000"
                    step="5000"
                    value={(customMarginSim !== null ? customMarginSim : parseInt(formData.marginCapital, 10)) || 50000}
                    onChange={(e) => setCustomMarginSim(parseInt(e.target.value, 10))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#0071E3' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8E8E93', marginTop: '0.25rem' }}>
                    <span>₹10,000 (Micro)</span>
                    <span>₹2,50,000 (Medium)</span>
                    <span>₹5,00,000 (Max MoSJE Cap)</span>
                  </div>
                </div>

                {/* Scenario Matrix Table */}
                <div className="matrix-table-wrapper" onClick={(e) => e.stopPropagation()}>
                  <table className="scenario-matrix-table">
                    <thead>
                      <tr>
                        <th>Financial Metric</th>
                        {report.whatIfScenarios.map((sc, i) => {
                          const currentMargin = customMarginSim !== null ? customMarginSim : (parseInt(formData.marginCapital, 10) || 50000);
                          const multiplier = i === 0 ? 1.0 : i === 1 ? 1.5 : 2.0;
                          const title = i === 0 ? "Scenario A (Base Entry)" : i === 1 ? "Scenario B (1.5x Expansion)" : "Scenario C (Premium Hub)";
                          return (
                            <th key={sc.id || i} className={i === 0 ? 'active-col' : ''}>
                              <div className="scenario-th-title">{title}</div>
                              <div className="scenario-th-sub">₹{Math.round(currentMargin * 10 * multiplier).toLocaleString('en-IN')} Project</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const currentMargin = customMarginSim !== null ? customMarginSim : (parseInt(formData.marginCapital, 10) || 50000);
                        
                        const scenarios = [
                          {
                            title: "Scenario A: Base MoSJE Scheme",
                            multiplier: 1.0,
                            risk: "Low"
                          },
                          {
                            title: "Scenario B: 1.5x Capacity Expansion",
                            multiplier: 1.5,
                            risk: "Medium"
                          },
                          {
                            title: "Scenario C: Premium Retail & Branding",
                            multiplier: 2.0,
                            risk: "Medium"
                          }
                        ];

                        return (
                          <>
                            <tr>
                              <td className="metric-label">💵 Total Project Cost</td>
                              {scenarios.map((s, idx) => (
                                <td key={idx} className="metric-val">
                                  ₹{Math.round(currentMargin * 10 * s.multiplier).toLocaleString('en-IN')}
                                </td>
                              ))}
                            </tr>
                            <tr>
                              <td className="metric-label">🏛️ 90% Govt Loan Funding</td>
                              {scenarios.map((s, idx) => (
                                <td key={idx} className="metric-val loan-highlight">
                                  ₹{Math.round(currentMargin * 9 * s.multiplier).toLocaleString('en-IN')}
                                </td>
                              ))}
                            </tr>
                            <tr>
                              <td className="metric-label">📈 Est. Monthly Revenue</td>
                              {scenarios.map((s, idx) => (
                                <td key={idx} className="metric-val">
                                  ₹{Math.round(currentMargin * (idx === 0 ? 3.2 : idx === 1 ? 5.2 : 8.0)).toLocaleString('en-IN')}
                                </td>
                              ))}
                            </tr>
                            <tr>
                              <td className="metric-label">💚 Est. Monthly Net Profit</td>
                              {scenarios.map((s, idx) => (
                                <td key={idx} className="metric-val profit-highlight">
                                  ₹{Math.round(currentMargin * (idx === 0 ? 1.1 : idx === 1 ? 1.85 : 3.0)).toLocaleString('en-IN')}
                                </td>
                              ))}
                            </tr>
                            <tr>
                              <td className="metric-label">📅 Monthly EMI Burden</td>
                              {scenarios.map((s, idx) => {
                                const loan = currentMargin * 9 * s.multiplier;
                                const emi = Math.round((loan * 0.05 / 12) + (loan / 60));
                                return (
                                  <td key={idx} className="metric-val emi-val">
                                    ₹{emi.toLocaleString('en-IN')}/mo
                                  </td>
                                );
                              })}
                            </tr>
                            <tr>
                              <td className="metric-label">🛡️ Risk Rating</td>
                              {scenarios.map((s, idx) => (
                                <td key={idx} className="metric-val">
                                  <span className={`risk-badge risk-${s.risk.toLowerCase()}`}>
                                    {s.risk} Risk
                                  </span>
                                </td>
                              ))}
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice Failure Modal Popup with Automatic Audio & Retry / Stop Button */}
      {voiceErrorModal.open && (
        <div className="voice-error-overlay">
          <div className="voice-error-card">
            <div className="voice-error-icon">🎙️ ⚠️</div>
            <h4 style={{ margin: '0.5rem 0', color: '#1D1D1F', fontSize: '1.2rem' }}>
              Voice Not Captured / आवाज़ नहीं मिली
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#6E6E73', margin: '0.5rem 0 1rem 0' }}>
              {voiceErrorModal.message}
            </p>
            <div className="voice-audio-status">
              🔊 <em>&quot;Try again! Dobara koshish karein&quot;</em>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '0.75rem' }}
                onClick={() => {
                  const field = voiceErrorModal.fieldName;
                  const label = voiceErrorModal.fieldLabel;
                  setVoiceErrorModal({ open: false, fieldName: '', fieldLabel: '', message: '' });
                  startVoiceInput(field, label, autoFlowActive, autoFlowStepIndex);
                }}
              >
                🔁 Try Again (दोबारा करें)
              </button>
              <button 
                className="btn-secondary" 
                style={{ background: '#FF3B30', color: 'white', border: 'none', padding: '0.75rem 1rem', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontWeight: '600' }}
                onClick={stopAllVoice}
              >
                🛑 Stop Voice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realistic DigiLocker Mock Modal */}
      {showDlModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            {/* Header */}
            <div style={{ background: '#003366', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ShieldAlert size={20} color="#003366" />
                </div>
                <div style={{ color: 'white' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', lineHeight: '1.2' }}>DigiLocker</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>National eGovernance Division</div>
                </div>
              </div>
              {dlStep !== 3 && (
                <button onClick={() => setShowDlModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem', opacity: 0.7 }}>&times;</button>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: '2rem 1.5rem' }}>
              {dlStep === 1 && (
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1D1D1F' }}>Sign In to your account!</h3>
                  <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Enter your Aadhaar Number to fetch your documents securely.</p>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: '#555' }}>Aadhaar Number</label>
                    <input 
                      type="text" 
                      placeholder="12 digit Aadhaar number" 
                      value={dlAadhaar} 
                      onChange={e => setDlAadhaar(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px', fontSize: '1rem' }}
                      maxLength={12}
                    />
                  </div>

                  <button 
                    onClick={handleDlSubmitAadhaar}
                    disabled={dlAadhaar.length < 12}
                    style={{ width: '100%', padding: '0.8rem', background: dlAadhaar.length < 12 ? '#ccc' : '#003366', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: dlAadhaar.length < 12 ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                  >
                    Next
                  </button>
                </div>
              )}

              {dlStep === 2 && (
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1D1D1F' }}>Verify OTP</h3>
                  <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    OTP has been sent to your mobile number registered with Aadhaar ending in ******{dlAadhaar.slice(-4)}.
                  </p>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: '#555' }}>Enter 6-digit OTP</label>
                    <input 
                      type="text" 
                      placeholder="000000" 
                      value={dlOtp} 
                      onChange={e => setDlOtp(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px', fontSize: '1rem', textAlign: 'center', letterSpacing: '8px' }}
                      maxLength={6}
                    />
                  </div>

                  <button 
                    onClick={handleDlSubmitOtp}
                    disabled={dlOtp.length < 6}
                    style={{ width: '100%', padding: '0.8rem', background: dlOtp.length < 6 ? '#ccc' : '#003366', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: dlOtp.length < 6 ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
                  >
                    Submit
                  </button>
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#0071E3', cursor: 'pointer' }}>Resend OTP</span>
                  </div>
                </div>
              )}

              {dlStep === 3 && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div className="spinner" style={{ width: '40px', height: '40px', borderTopColor: '#003366', margin: '0 auto 1.5rem' }}></div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1D1D1F' }}>Verifying...</h3>
                  <p style={{ color: '#888', fontSize: '0.85rem' }}>Securely fetching demographic data from UIDAI.</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div style={{ background: '#f5f5f5', padding: '0.75rem', textAlign: 'center', fontSize: '0.7rem', color: '#888' }}>
              🔒 Powered by DigiLocker API (Mock Environment)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessAdvisor;

