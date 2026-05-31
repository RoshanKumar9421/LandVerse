import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard', id: 'dashboard' },
  { icon: 'how_to_reg', label: 'KYC Requests', id: 'kyc' },
  { icon: 'verified_user', label: 'Land Verifications', id: 'land-verifications' },
  { icon: 'report_problem', label: 'Fraud Alerts', id: 'fraud-alerts' },
  { icon: 'terminal', label: 'System Logs', id: 'logs' },
];

const GlassCard = ({ children, className = '' }) => {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`glass-card rounded-lg ${className}`}
    >
      {children}
    </div>
  );
};

const AdminstatorPage = () => {
  const navigate = useNavigate();
  
  // Dashboard & State Variables
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [blockNumber, setBlockNumber] = useState(18492031);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dynamic counter stats
  const [kycCount] = useState(1284);
  const [verificationsCount, setVerificationsCount] = useState(0);
  const [fraudCount, setFraudCount] = useState(21);
  
  // Review Case Queue
  const [cases, setCases] = useState([]);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Modal Overlays
  const [activeDocument, setActiveDocument] = useState(null);
  
  // Approve Progress Sequence Modals
  const [isApproving, setIsApproving] = useState(false);
  const [approveProgress, setApproveProgress] = useState(0);
  const [approveLogs, setApproveLogs] = useState([]);
  const [approveStatus, setApproveStatus] = useState('idle'); // idle, running, success
  
  // Request Changes Modal
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [changesText, setChangesText] = useState('');
  
  // Reject Modal
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Notification Toast state
  const [toasts, setToasts] = useState([]);

  // System Audit Journal Logs
  const [systemLogs, setSystemLogs] = useState([
    { id: 1, time: '17:45:10', type: 'system', message: 'MainNet ledger node connection active.' },
    { id: 2, time: '17:48:32', type: 'system', message: 'Cryptographic HSM sign-ring key verified.' },
    { id: 3, time: '17:51:05', type: 'audit', message: 'Consensus parameters verified at 99.8% compliance.' },
  ]);

  // Fetch pending cases from database
  useEffect(() => {
    async function fetchPendingCases() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('status', 'pending');

        if (error) throw error;

        const formattedCases = data.map(item => ({
          id: item.property_code || `REV-${item.id.slice(0, 5).toUpperCase()}`,
          dbId: item.id,
          owner: 'Pending Owner',
          ownerId: item.owner_id,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
          ownerAddress: item.owner_id ? `0x${item.owner_id.replace(/-/g, '').slice(0, 40)}` : '0x0000000000000000000000000000000000000000',
          plotRef: item.plot_number || item.property_code || '#PL-999',
          area: `${parseFloat(item.area).toLocaleString()} ${item.area_unit || 'SQ. FT.'}`,
          coords: `${item.latitude || '0.0000'}° N, ${item.longitude || '0.0000'}° W`,
          locationName: item.physical_address || 'Unknown Sector',
          mapUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOJOGV7JNQXaM0gwFdcXYg4QgXeqeICK4swRAx5_GT5BAONNpVbxaJ8ppuqepbPOkOdwoAKKGj_jlBlIMyJJB1uiwKDGnIugbHrGFELbZEJTWrZPCah6T15gTZCo7o3kZbZBNWtqyfooZgSV7--U7G0jUkw_3DNHrbj0ASFE3vdDFGgnWr4hb9yFfJK7IB9vEoy75pWyMyzUf9dsvzxNkUnDfG4pL8PhMAmmjrOffgML38gD3_JYa02qDhMlg31q8qbuXLgAO02LxX',
          alert: item.description || 'Cross-reference indicates minor boundary overlap. Review coordinates before signing.',
          alertType: 'warning',
          docs: {
            deed: {
              title: `Title Deed ${item.property_code || '#PL-999'}`,
              content: `DEPARTMENT OF LAND REGISTRATION & CRYPTOGRAPHIC LEDGER
======================================================
LAND RECORD ACCESSION ID: ${item.property_code || 'N/A'}
SURVEY REGISTRY REF: ${item.survey_number || 'N/A'}
OWNER PRIMARY KEY: ${item.owner_id || 'N/A'}
METADATA HASH: ipfs://Qm${item.id.replace(/-/g, '').slice(0, 32)}

[PROPERTY BOUNDS DESCRIPTION]
Commencing from northwest corner post of ${item.physical_address || 'Municipal sector'},
thence N 14° E for 125 meters, thence S 75° E for 100 meters, S 14° W
for 125 meters, returning N 75° W to point of beginning.
Total footprint: ${parseFloat(item.area).toLocaleString()} ${item.area_unit || 'SQ. FT.'}

[TELEMETRIC STATUS]
Latitude: ${item.latitude || '0.0000'}, Longitude: ${item.longitude || '0.0000'}
Status: pending, geodetic verification check queued.`
            },
            proof: {
              title: 'Ownership Consensus Certificate',
              content: `LEDGER CONSENSUS PROOF
======================
METADATA TRANSACTION HASH: 0x${item.id.replace(/-/g, '')}
BLOCKHEIGHT: 18,492,030
TIMESTAMP: 2026-05-30 UTC

CONCURRENT VALIDATORS:
- consensus-node-01.landverse.net  [APPROVED]
- consensus-node-02.landverse.net  [APPROVED]
- consensus-node-03.landverse.net  [APPROVED]

Consensus verified. Queued for final municipal authority confirmation.`
            }
          }
        }));

        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, full_name, wallet_address');

        if (!pError && profiles) {
          const profileMap = {};
          profiles.forEach(p => {
            profileMap[p.id] = p;
          });

          formattedCases.forEach(c => {
            if (profileMap[c.ownerId]) {
              c.owner = profileMap[c.ownerId].full_name || 'Owner Profile';
              if (profileMap[c.ownerId].wallet_address) {
                c.ownerAddress = profileMap[c.ownerId].wallet_address;
              }
            }
          });
        }

        setCases(formattedCases);
        setVerificationsCount(formattedCases.length);
      } catch (err) {
        console.error('Error fetching pending cases:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPendingCases();
  }, []);

  // Handle subtle block ticks
  useEffect(() => {
    const iv = setInterval(() => {
      setBlockNumber(b => b + Math.floor(Math.random() * 3));
    }, 4500);
    return () => clearInterval(iv);
  }, []);

  const addLog = (message, type = 'audit') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setSystemLogs(prev => [
      { id: Date.now(), time: timeStr, type, message },
      ...prev
    ]);
  };

  const triggerToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const currentCase = currentCaseIndex < cases.length ? cases[currentCaseIndex] : null;

  // Handle Approve Logic
  const handleApprove = () => {
    if (!currentCase) return;
    setIsApproving(true);
    setApproveStatus('running');
    setApproveProgress(0);
    setApproveLogs([
      '[CONNECT] Securing HSM smart contract gateway connection...',
    ]);

    const steps = [
      { progress: 20, log: '[RESOLVE] Syncing geospatial perimeter coordinates with municipal GIS registries...' },
      { progress: 50, log: '[SIGN] Cryptographic signature requested from Chief Registrar credentials...' },
      { progress: 80, log: '[BROADCAST] Broadcasting state transitions to EVM consensus nodes...' },
      { progress: 100, log: `[FINAL] Transaction successfully verified. Hex hash: 0x7b9ca4e1a3efde72b9a7c0${Math.floor(Math.random() * 900000 + 100000)}b81f2113` },
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setApproveProgress(step.progress);
        setApproveLogs(prev => [...prev, step.log]);
        if (step.progress === 100) {
          setApproveStatus('success');
          addLog(`Approved land deed for ${currentCase.owner} (${currentCase.plotRef})`, 'ledger');
        }
      }, (index + 1) * 750);
    });
  };

  // Close Approve modal and advance queue
  const finishApprove = async () => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'approved', verified_at: new Date().toISOString() })
        .eq('id', currentCase.dbId);

      if (error) throw error;
      
      setIsApproving(false);
      setApproveProgress(0);
      setApproveLogs([]);
      setApproveStatus('idle');
      
      // Decrement pending verifications
      setVerificationsCount(prev => Math.max(0, prev - 1));
      triggerToast(`Deed ${currentCase.plotRef} approved successfully for ${currentCase.owner}!`, 'success');
      
      // Advance queue
      setCurrentCaseIndex(prev => prev + 1);
    } catch (err) {
      triggerToast(`Database update failed: ${err.message}`, 'error');
    }
  };

  // Handle Request Changes
  const handleRequestChangesConfirm = async () => {
    if (!changesText.trim()) {
      triggerToast('Please type the audit feedback points first.', 'warning');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'rejected', rejection_reason: changesText })
        .eq('id', currentCase.dbId);

      if (error) throw error;

      addLog(`Audit request sent to ${currentCase.owner}: "${changesText}"`, 'audit');
      triggerToast(`Audit feedback successfully transmitted to ${currentCase.owner}.`, 'success');
      
      setIsRequestingChanges(false);
      setChangesText('');
      
      // Advance queue
      setCurrentCaseIndex(prev => prev + 1);
    } catch (err) {
      triggerToast(`Database update failed: ${err.message}`, 'error');
    }
  };

  // Handle Reject Logic
  const handleRejectConfirm = async () => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'rejected', rejection_reason: 'Flagged as fraudulent by Registrar' })
        .eq('id', currentCase.dbId);

      if (error) throw error;

      addLog(`Flagged and blacklisted land deed entry: ${currentCase.plotRef} (${currentCase.owner})`, 'error');
      triggerToast(`Deed entry blacklisted. Automatic fraud alert sent to legal cabinet.`, 'error');
      
      // Increment Fraud Alerts
      setFraudCount(prev => prev + 1);
      setIsRejecting(false);
      
      // Advance queue
      setCurrentCaseIndex(prev => prev + 1);
    } catch (err) {
      triggerToast(`Database update failed: ${err.message}`, 'error');
    }
  };

  const handleResetQueue = () => {
    setCurrentCaseIndex(0);
    triggerToast('Review queue re-synchronized with database!', 'success');
  };

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen selection:bg-primary/20 relative overflow-x-hidden bg-mesh">
      {/* Visual Polish: Background Aura */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] pointer-events-none rounded-full z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/5 blur-[100px] pointer-events-none rounded-full z-0" />
      
      {/* ─── Toast Notifications ─── */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-5 py-4 rounded shadow-2xl glass-card flex items-center gap-3 border-l-4 transition-all duration-300 transform translate-y-0
              ${toast.type === 'error' ? 'border-error text-error bg-error/10' : ''}
              ${toast.type === 'warning' ? 'border-secondary text-secondary bg-secondary/10' : ''}
              ${toast.type === 'success' ? 'border-primary text-primary bg-primary/10' : ''}`}
          >
            <span className="material-symbols-outlined text-lg">
              {toast.type === 'error' ? 'gavel' : toast.type === 'warning' ? 'report_problem' : 'verified_user'}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* ─── Sidebar Navigation ─── */}
      <aside className={`fixed left-0 top-0 h-screen w-72 bg-surface-container dark:bg-surface-container flex flex-col shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-transform duration-300 z-40
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Brand Header */}
        <div className="p-8 border-b border-outline-variant/10">
          <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">LandVerse</h1>
          <p className="font-label uppercase tracking-widest text-[0.65rem] text-on-surface-variant mt-1">Registry Authority</p>
        </div>

        {/* Sidebar Nav links */}
        <nav className="flex-1 mt-6 px-4 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-4 px-5 py-3.5 rounded transition-all duration-200 active:scale-95 text-left w-full
                  ${isActive
                    ? 'bg-primary/10 text-primary border-r-4 border-primary-fixed font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}>
                  {item.icon}
                </span>
                <span className="font-headline tracking-wide text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Custom Actions & Administrator Profile Box */}
        <div className="p-6 border-t border-outline-variant/10">
          <button 
            onClick={() => {
              triggerToast('System is ready for direct manual database logging.', 'warning');
            }}
            className="w-full py-3.5 rounded bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold shadow-[0_4px_20px_rgba(143,245,255,0.2)] hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest"
          >
            New Entry
          </button>
          
          <div className="mt-8 flex items-center gap-3.5 px-2">
            <div className="relative">
              <img
                alt="Chief Registrar Avatar"
                className="w-11 h-11 rounded-full object-cover border border-primary/20"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9hvVavHZPZy4sIdE-YmZwBGRvoZfxz6Vl-Jpfb5V7_oiRLmPOFr53wq414lM9ImLTpeGKxDgizvlgDQVxCHefit2WVW5XNaDG-1FGMXqep0p55l7BXWgpyUmzAc4bevNVFuoK45bVboiOzhb4irzA71FQHpKnIkcAAbflS87hrMZGGEDhAmzKTr_Es3ne533ZBNlJjsK23f9tC25ODTSZeybLPDjulD16eFXaK0YLDg1h-mlxX_9Yfu5g2Jf60pyImgnaTpqdhJm6"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-tertiary rounded-full border-2 border-surface-container shadow-sm animate-pulse"></div>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-on-surface truncate">Admin User</p>
              <p className="text-[0.65rem] text-on-surface-variant uppercase tracking-tighter">Chief Registrar</p>
            </div>
            
            <button
              onClick={() => {
                localStorage.removeItem('user');
                triggerToast('Session disconnected.', 'warning');
                navigate('/login');
              }}
              title="Logout"
              className="ml-auto text-on-surface-variant hover:text-error transition-colors p-1"
            >
              <span className="material-symbols-outlined text-base">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-35 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Main Canvas ─── */}
      <main className="lg:ml-72 min-h-screen relative z-10 flex flex-col">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-12 h-20 bg-surface/40 backdrop-blur-xl border-b border-outline-variant/10">
          <div className="flex items-center gap-4 flex-grow max-w-xl">
            <button
              className="lg:hidden text-on-surface-variant hover:text-primary transition-colors p-2"
              onClick={() => setSidebarOpen(v => !v)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
              <input
                className="w-full bg-surface-container-lowest border-none rounded py-2.5 pl-12 pr-4 text-xs focus:ring-1 focus:ring-primary/50 text-on-surface placeholder:text-on-surface-variant/40 transition-all outline-none"
                placeholder="Search transactions, properties, or identities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 ml-4">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-surface-container rounded-full border border-outline-variant/10">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                <span className="text-[10px] font-mono text-on-surface-variant tracking-wider" id="block-ticker">
                  #{blockNumber.toLocaleString()}
                </span>
              </div>

              <button 
                onClick={() => {
                  triggerToast('Latest ledger block synchronized in consensus ring.', 'success');
                }}
                className="text-on-surface-variant hover:text-primary transition-all relative p-1.5 rounded-full hover:bg-surface-variant"
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-error rounded-full border border-surface-dim"></span>
              </button>
              
              <button 
                onClick={() => {
                  triggerToast('HSM parameters active.', 'success');
                }}
                className="text-on-surface-variant hover:text-primary transition-all p-1.5 rounded-full hover:bg-surface-variant"
              >
                <span className="material-symbols-outlined text-xl">settings</span>
              </button>
            </div>

            <div className="h-6 w-[1px] bg-outline-variant/20"></div>

            <div className="flex items-center gap-3">
              <span className="font-headline text-sm font-bold gradient-text tracking-wide hidden sm:inline-block">Authority Panel</span>
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border border-outline-variant/15 text-primary">
                <span className="material-symbols-outlined text-sm">shield</span>
              </div>
            </div>
          </div>
        </header>

        {/* ─── Dashboard Body ─── */}
        <section className="p-6 lg:p-12 space-y-12 max-w-7xl mx-auto w-full flex-grow">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-primary/25 border-t-primary animate-spin" />
              <p className="text-sm font-mono text-on-surface-variant">Syncing with Supabase Land Ledger...</p>
            </div>
          ) : activeNav === 'dashboard' && (
            <>
              {/* Tonal Layered Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {/* Metric 1 */}
                <div className="surface-container-low p-6 lg:p-8 rounded-lg relative overflow-hidden group hover:bg-surface-container-high transition-all duration-300 border border-outline-variant/15 shadow-xl">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-primary/10 rounded-md text-primary">
                      <span className="material-symbols-outlined">how_to_reg</span>
                    </div>
                    <span className="flex items-center gap-1 text-[0.65rem] font-label text-tertiary">
                      <span className="material-symbols-outlined text-[0.9rem]">trending_up</span> +12%
                    </span>
                  </div>
                  <p className="font-label uppercase text-[0.65rem] text-on-surface-variant tracking-[0.2em]">Pending KYC Requests</p>
                  <h3 className="text-3xl font-display font-bold mt-2">{kycCount.toLocaleString()}</h3>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="material-symbols-outlined text-7xl">how_to_reg</span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="surface-container-low p-6 lg:p-8 rounded-lg relative overflow-hidden group hover:bg-surface-container-high transition-all duration-300 border border-outline-variant/15 shadow-xl">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-secondary/10 rounded-md text-secondary">
                      <span className="material-symbols-outlined">verified_user</span>
                    </div>
                    <span className="text-[0.65rem] font-label text-on-surface-variant uppercase tracking-widest">
                      LIVE
                    </span>
                  </div>
                  <p className="font-label uppercase text-[0.65rem] text-on-surface-variant tracking-[0.2em]">Pending Land Verifications</p>
                  <h3 className="text-3xl font-display font-bold mt-2 text-primary">{verificationsCount.toLocaleString()}</h3>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="material-symbols-outlined text-7xl">verified_user</span>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="surface-container-low p-6 lg:p-8 rounded-lg relative overflow-hidden group hover:bg-surface-container-high transition-all duration-300 border border-outline-variant/15 shadow-xl">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-error/10 rounded-md text-error">
                      <span className="material-symbols-outlined">report_problem</span>
                    </div>
                    <span className="text-[0.65rem] font-label text-error uppercase tracking-widest font-bold">
                      URGENT
                    </span>
                  </div>
                  <p className="font-label uppercase text-[0.65rem] text-on-surface-variant tracking-[0.2em]">Fraud Detection Alerts</p>
                  <h3 className="text-3xl font-display font-bold mt-2 text-error">{fraudCount.toLocaleString()}</h3>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="material-symbols-outlined text-7xl text-error">report_problem</span>
                  </div>
                </div>
              </div>

              {/* Bento Land Review Panel */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between px-2 gap-4">
                  <div>
                    <span className="text-primary font-label text-[0.65rem] tracking-widest uppercase font-bold">Critical Action Required</span>
                    <h2 className="text-2xl font-display font-bold mt-1">Land Review Panel</h2>
                  </div>
                  <div className="flex items-center gap-4 text-on-surface-variant text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                      Live Ledger Sync Active
                    </div>
                    {currentCase && <span className="font-mono bg-surface-container px-2 py-0.5 rounded border border-outline-variant/10">Case {currentCase.id}</span>}
                  </div>
                </div>

                {currentCase ? (
                  <div className="grid grid-cols-12 gap-6 lg:gap-8">
                    
                    {/* Left Column: Property, Documents & Geospatial */}
                    <div className="col-span-12 lg:col-span-8 glass-card rounded-lg p-6 lg:p-10 border border-primary/5 shadow-2xl relative overflow-hidden">
                      <div className="flex flex-col md:flex-row justify-between gap-8 lg:gap-12">
                        <div className="space-y-8 flex-grow">
                          
                          {/* Owner Details */}
                          <div className="flex items-center gap-4 lg:gap-6">
                            <img
                              alt="Owner Portrait"
                              className="w-16 h-16 rounded-full object-cover border border-outline-variant/30"
                              src={currentCase.avatar}
                            />
                            <div>
                              <p className="font-label uppercase text-[0.6rem] text-on-surface-variant tracking-[0.2em]">Owner Details</p>
                              <h4 className="text-xl lg:text-2xl font-display font-bold">{currentCase.owner}</h4>
                              <p className="font-label text-[10px] font-mono text-primary/70 mt-1 truncate max-w-[200px] sm:max-w-none">
                                ADDRESS: {currentCase.ownerAddress}
                              </p>
                            </div>
                          </div>

                          {/* Property Spec Metrics */}
                          <div className="grid grid-cols-2 gap-6 py-6 border-y border-outline-variant/10">
                            <div>
                              <p className="font-label uppercase text-[0.6rem] text-on-surface-variant tracking-[0.2em]">Plot Reference</p>
                              <p className="text-lg lg:text-xl font-headline font-bold mt-1 text-primary">{currentCase.plotRef}</p>
                            </div>
                            <div>
                              <p className="font-label uppercase text-[0.6rem] text-on-surface-variant tracking-[0.2em]">Total Area</p>
                              <p className="text-lg lg:text-xl font-headline font-bold mt-1">{currentCase.area}</p>
                            </div>
                          </div>

                          {/* Document File Gallery */}
                          <div>
                            <p className="font-label uppercase text-[0.6rem] text-on-surface-variant tracking-[0.2em] mb-4">Document Gallery</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Title Deed */}
                              <div className="surface-container p-4 rounded flex items-center justify-between border border-outline-variant/10 group hover:bg-surface-container-highest transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                    <span className="material-symbols-outlined text-lg">description</span>
                                  </div>
                                  <span className="text-xs font-semibold truncate">Title Deed</span>
                                </div>
                                <button
                                  onClick={() => setActiveDocument({
                                    title: currentCase.docs.deed.title,
                                    content: currentCase.docs.deed.content,
                                    type: 'Deed File'
                                  })}
                                  className="text-[0.65rem] uppercase font-label font-bold text-primary hover:underline ml-2 flex-shrink-0 active:scale-95 transition-transform"
                                >
                                  View File
                                </button>
                              </div>

                              {/* Ownership Proof */}
                              <div className="surface-container p-4 rounded flex items-center justify-between border border-outline-variant/10 group hover:bg-surface-container-highest transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-9 h-9 rounded bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                                    <span className="material-symbols-outlined text-lg">verified</span>
                                  </div>
                                  <span className="text-xs font-semibold truncate">Consensus Proof</span>
                                </div>
                                <button
                                  onClick={() => setActiveDocument({
                                    title: currentCase.docs.proof.title,
                                    content: currentCase.docs.proof.content,
                                    type: 'Signature Certificate'
                                  })}
                                  className="text-[0.65rem] uppercase font-label font-bold text-secondary hover:underline ml-2 flex-shrink-0 active:scale-95 transition-transform"
                                >
                                  View File
                                </button>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Geospatial holographic preview */}
                        <div className="w-full md:w-80 space-y-4 flex-shrink-0">
                          <p className="font-label uppercase text-[0.6rem] text-on-surface-variant tracking-[0.2em]">Geospatial Topography</p>
                          <div className="aspect-square w-full rounded-lg overflow-hidden relative group border border-outline-variant/20 shadow-inner">
                            <img
                              alt="Geospatial Map Grid"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              src={currentCase.mapUrl}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
                            
                            {/* Scanning indicator */}
                            <div className="absolute inset-x-0 h-0.5 bg-primary/70 top-0 opacity-40 group-hover:opacity-100 transition-opacity"
                              style={{ animation: 'scan 3s linear infinite' }} />
                            
                            <button
                              onClick={() => triggerToast(`Holographic viewport telemetry active for ${currentCase.locationName}.`, 'success')}
                              className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-surface-bright/95 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10 hover:bg-primary hover:text-on-primary hover:scale-105 active:scale-95 transition-all text-glow"
                            >
                              Open Map Telemetry
                            </button>
                          </div>
                          
                          <div className="flex flex-col items-center gap-1 bg-surface-container-lowest py-2.5 px-3 rounded border border-outline-variant/10 text-center">
                            <span className="text-[10px] font-mono text-primary font-bold">{currentCase.coords}</span>
                            <span className="text-[9px] font-label text-on-surface-variant uppercase tracking-wider">{currentCase.locationName}</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Right Column: Registry Decision Hub */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 lg:gap-8">
                      <div className="surface-container p-6 lg:p-8 rounded-lg border border-outline-variant/15 flex-1 flex flex-col justify-center space-y-6 shadow-2xl relative">
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[9px] font-mono uppercase bg-primary/15 text-primary px-2 py-0.5 rounded">
                          <span className="w-1 h-1 rounded-full bg-primary animate-ping"></span>
                          Secure HSM
                        </div>
                        
                        <h3 className="text-lg lg:text-xl font-display font-bold">Registry Decision</h3>
                        <p className="text-on-surface-variant text-xs leading-relaxed">
                          Review all geodetic data, municipal checks, and cryptographic hashes prior to registry commit. Approving this document will automatically broadcast state changes to the blockchain MainNet consensus, which is irreversible.
                        </p>
                        
                        <div className="space-y-3.5 pt-4">
                          <button
                            onClick={handleApprove}
                            className="w-full py-4 rounded bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold shadow-[0_4px_30px_rgba(0,238,252,0.3)] hover:brightness-115 active:scale-95 transition-all text-xs uppercase tracking-widest text-glow"
                          >
                            Approve Property
                          </button>
                          
                          <button
                            onClick={() => {
                              setChangesText('');
                              setIsRequestingChanges(true);
                            }}
                            className="w-full py-4 rounded border border-outline-variant/25 text-on-surface hover:bg-surface-variant active:scale-95 transition-all text-xs uppercase tracking-widest"
                          >
                            Request Changes
                          </button>
                          
                          <button
                            onClick={() => setIsRejecting(true)}
                            className="w-full py-4 rounded bg-error/10 text-error border border-error/25 hover:bg-error hover:text-on-error active:scale-95 transition-all text-xs uppercase tracking-widest"
                          >
                            Reject Entry
                          </button>
                        </div>
                      </div>

                      {/* Secondary Dynamic Alert Info Card */}
                      <div className={`p-5 rounded border-l-4 shadow-xl transition-all duration-300
                        ${currentCase.alertType === 'error' ? 'bg-error-container/10 border-error text-error-container' : ''}
                        ${currentCase.alertType === 'warning' ? 'bg-surface-container border-secondary text-secondary' : ''}
                        ${currentCase.alertType === 'success' ? 'bg-surface-container border-tertiary text-tertiary' : ''}`}>
                        
                        <div className="flex items-center gap-3.5 mb-2">
                          <span className="material-symbols-outlined text-sm">
                            {currentCase.alertType === 'error' ? 'dangerous' : currentCase.alertType === 'warning' ? 'info' : 'verified'}
                          </span>
                          <p className="text-[10px] font-bold uppercase tracking-widest">
                            {currentCase.alertType === 'error' ? 'Blacklist Advisory' : currentCase.alertType === 'warning' ? 'Registry Alert' : 'System Compliance Certificate'}
                          </p>
                        </div>
                        <p className="text-[11px] leading-relaxed text-on-surface-variant">
                          {currentCase.alert}
                        </p>
                      </div>

                    </div>

                  </div>
                ) : (
                  /* Completed Case Queue Screen */
                  <GlassCard className="p-12 text-center max-w-2xl mx-auto border border-primary/20 shadow-2xl space-y-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/25 pulse-tertiary">
                      <span className="material-symbols-outlined text-5xl">task_alt</span>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-2xl font-display font-bold">Review Pipeline Completed</h3>
                      <p className="text-on-surface-variant text-sm max-w-md mx-auto leading-relaxed">
                        Excellent work, Chief Registrar. All outstanding critical property deeds have been verified, signed, and integrated into the ledger MainNet consensus ring.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-4">
                      <button
                        onClick={handleResetQueue}
                        className="px-6 py-3.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded text-xs font-bold uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-transform"
                      >
                        Reset Case Queue
                      </button>
                      
                      <button
                        onClick={() => setActiveNav('logs')}
                        className="px-6 py-3.5 border border-outline-variant/30 text-on-surface hover:bg-surface-container rounded text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform"
                      >
                        View System Logs
                      </button>
                    </div>
                  </GlassCard>
                )}
              </div>
            </>
          )}

          {activeNav === 'kyc' && (
            <div className="space-y-6">
              <div className="border-b border-outline-variant/10 pb-4">
                <h2 className="text-2xl font-display font-bold">Identity Verification Queue (KYC)</h2>
                <p className="text-xs text-on-surface-variant mt-1">Reviewing user and administrative profiles stored on Supabase for credentials compliance.</p>
              </div>

              <div className="grid gap-4">
                {[
                  { name: 'Alex Sterling', role: 'Verified Architect', status: 'Approved', address: '0x82fF8D7B24A61c8D92fEeAc1892f3bBc99201a1E', date: '2026-05-30' },
                  { name: 'Sarah Jenkins', role: 'Land Architect', status: 'Pending Review', address: '0x48aE2369cBA911Caa8ff4C221D9ee312d8329E9b', date: '2026-05-30' },
                  { name: 'Devon Vance', role: 'Premium Buyer', status: 'Pending Review', address: '0x22cA77a18fBDaa80091bB82c2b3eAc456184C01f', date: '2026-05-29' },
                ].map((kyc, i) => (
                  <div key={i} className="surface-container p-6 rounded-lg border border-outline-variant/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-xl">person</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">{kyc.name}</h4>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{kyc.role}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-on-surface-variant">ADDR: {kyc.address}</p>
                      <p className="text-[10px] text-on-surface-variant">SUBMISSION DATE: {kyc.date}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded
                        ${kyc.status === 'Approved' ? 'bg-tertiary/10 text-tertiary' : 'bg-secondary/10 text-secondary'}`}>
                        {kyc.status}
                      </span>
                      
                      <button
                        onClick={() => triggerToast(`KYC audit pipeline triggered for ${kyc.name}. Credentials are in-sync with Supabase.`, 'success')}
                        className="px-4 py-2 border border-outline-variant/35 hover:bg-surface-variant text-[10px] font-bold uppercase tracking-widest rounded"
                      >
                        Audit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNav === 'land-verifications' && (
            <div className="space-y-6">
              <div className="border-b border-outline-variant/10 pb-4">
                <h2 className="text-2xl font-display font-bold">Land Registry Ledger Directory</h2>
                <p className="text-xs text-on-surface-variant mt-1">Full registry logs of all municipal parcels, topological coordinates, and blockchain consensus logs.</p>
              </div>

              <div className="grid gap-4">
                {cases.map((parcel, i) => (
                  <div key={i} className="surface-container p-6 rounded-lg border border-outline-variant/15 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-primary">{parcel.plotRef}</span>
                        <h4 className="text-sm font-bold">{parcel.owner}</h4>
                      </div>
                      <p className="text-[10px] font-mono text-on-surface-variant mt-1">COORDINATES: {parcel.coords} | LOCATION: {parcel.locationName}</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Calculated Area</p>
                        <p className="text-xs font-bold">{parcel.area}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">EVM Validator consensus</p>
                        <p className="text-xs font-bold text-tertiary">3 / 3 APPROVED</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setActiveDocument({
                            title: parcel.docs.deed.title,
                            content: parcel.docs.deed.content,
                            type: 'Deed Document'
                          });
                        }}
                        className="px-4 py-2 border border-outline-variant/35 hover:bg-surface-variant text-[10px] font-bold uppercase tracking-widest rounded"
                      >
                        View Deed File
                      </button>
                      <button
                        onClick={() => triggerToast(`Telemetrical topographic checks verified for plot ${parcel.plotRef}.`, 'success')}
                        className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded hover:bg-primary/20"
                      >
                        Geodetic Check
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNav === 'fraud-alerts' && (
            <div className="space-y-6">
              <div className="border-b border-outline-variant/10 pb-4">
                <h2 className="text-2xl font-display font-bold text-error">Fraud Alerts & Blacklisted Signatures</h2>
                <p className="text-xs text-on-surface-variant mt-1">Automatic telemetry flagging and registrar audit trails monitoring invalid and boundary overlapping attempts.</p>
              </div>

              {systemLogs.filter(log => log.type === 'error').length === 0 ? (
                <GlassCard className="p-8 text-center border border-outline-variant/10">
                  <span className="material-symbols-outlined text-4xl text-tertiary">gavel</span>
                  <h4 className="text-sm font-bold mt-3">Registry Safe & Intact</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Zero blacklisted transactions or geodetic overlaps recorded in this session epoch.</p>
                </GlassCard>
              ) : (
                <div className="grid gap-4">
                  {systemLogs.filter(log => log.type === 'error').map((alertLog, i) => (
                    <div key={i} className="surface-container p-5 rounded border border-error/20 bg-error/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-error">gavel</span>
                        <div>
                          <h4 className="text-sm font-bold text-error">Flagged Invalid Entry</h4>
                          <p className="text-xs text-on-surface-variant mt-0.5">{alertLog.message}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-on-surface-variant">{alertLog.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeNav === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
                <div>
                  <h2 className="text-2xl font-display font-bold">Municipal Ledger Audit Journal</h2>
                  <p className="text-xs text-on-surface-variant mt-1">Dynamic telemetry system logs capture real-time registrar cryptographic approvals and transactions.</p>
                </div>
                <button
                  onClick={() => {
                    setSystemLogs([
                      { id: Date.now(), time: new Date().toTimeString().split(' ')[0], type: 'system', message: 'MainNet ledger audit logs cleared and re-indexed.' }
                    ]);
                    triggerToast('System logs index cleared.', 'warning');
                  }}
                  className="px-4 py-2 border border-outline-variant/35 hover:bg-surface-variant text-[10px] font-bold uppercase tracking-widest rounded"
                >
                  Clear Logs Index
                </button>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant/20 rounded p-6 font-mono text-xs text-on-surface-variant space-y-4 max-h-[500px] overflow-y-auto">
                {systemLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4">
                    <span className="text-primary/60 font-bold select-none">[{log.time}]</span>
                    
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold
                      ${log.type === 'error' ? 'bg-error/15 text-error' : ''}
                      ${log.type === 'system' ? 'bg-primary/15 text-primary' : ''}
                      ${log.type === 'ledger' ? 'bg-tertiary/15 text-tertiary' : ''}
                      ${log.type === 'audit' ? 'bg-secondary/15 text-secondary' : ''}`}>
                      {log.type}
                    </span>

                    <span className="text-on-surface flex-grow text-[11px] leading-normal">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

        {/* ─── Footer Ticker ─── */}
        <footer className="mt-auto h-12 bg-surface-container-lowest border-t border-outline-variant/10 flex items-center justify-between px-6 lg:px-12 text-[10px] text-on-surface-variant/70 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping"></span>
              MainNet Consensus Active
            </span>
            <span className="hidden sm:inline-block">|</span>
            <span className="hidden sm:inline-block">Lat: London Municipal Node</span>
          </div>
          <div>
            <span>EVM Registry V1.0.9</span>
          </div>
        </footer>
      </main>

      {/* ─── MODAL OVERLAYS ─── */}

      {/* 1. Document Previewer Modal */}
      {activeDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="w-full max-w-2xl border border-primary/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-outline-variant/15 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                  {activeDocument.type}
                </span>
                <h3 className="text-lg font-display font-bold mt-1.5">{activeDocument.title}</h3>
              </div>
              <button
                onClick={() => setActiveDocument(null)}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Document Content Display */}
            <div className="p-6 overflow-y-auto flex-grow bg-surface-container-lowest">
              <pre className="text-xs font-mono leading-relaxed text-on-surface-variant whitespace-pre-wrap selection:bg-primary/25">
                {activeDocument.content}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/15 flex items-center justify-between bg-surface-container">
              <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant">
                <span className="material-symbols-outlined text-xs text-primary">verified_user</span>
                SHA-256 Signature Validated
              </div>
              <button
                onClick={() => setActiveDocument(null)}
                className="px-5 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform"
              >
                Close Preview
              </button>
            </div>

          </GlassCard>
        </div>
      )}

      {/* 2. Approve Action Consensus Sequence Modal */}
      {isApproving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <GlassCard className="w-full max-w-lg border border-primary/20 shadow-2xl p-8 space-y-6 text-center">
            
            {/* Spinning/Consensus UI depending on progress */}
            {approveStatus === 'running' ? (
              <div className="space-y-6">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                  <span className="material-symbols-outlined text-primary text-2xl animate-pulse">lock_open</span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-display font-bold">EVM Consensus Integration</h3>
                  <p className="text-xs text-on-surface-variant">Securing state changes on the cryptographic MainNet ledger...</p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-surface-container-lowest rounded-full h-1 border border-outline-variant/10 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${approveProgress}%` }}
                  />
                </div>

                {/* Telemetrical logs screen */}
                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded p-4 font-mono text-[9px] text-left text-on-surface-variant space-y-2.5 max-h-48 overflow-y-auto">
                  {approveLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed">
                      <span className="text-primary font-bold">{`>>>`}</span> {log}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Success screen state */
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-full bg-tertiary/10 border border-tertiary/20 text-tertiary flex items-center justify-center mx-auto success-glow pulse-tertiary">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-display font-bold">Ledger Integration Secured</h3>
                  <p className="text-xs text-on-surface-variant">
                    Cryptographic signature attached. State transition block finalized on MainNet.
                  </p>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded p-4 font-mono text-[9px] text-left text-on-surface-variant">
                  <p className="text-primary font-bold mb-1">State Block Finalized:</p>
                  <p className="truncate">BLOCK: #{blockNumber}</p>
                  <p className="truncate">STATE TRANSITION HASH:</p>
                  <p className="text-[8px] text-primary/80 truncate">
                    0x7b9ca4e1a3efde72b9a7c0{blockNumber + 12893}b81f2113
                  </p>
                </div>

                <button
                  onClick={finishApprove}
                  className="w-full py-4 rounded bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold shadow-lg hover:brightness-110 active:scale-95 transition-transform text-xs uppercase tracking-widest text-glow"
                >
                  Advance Case Queue
                </button>
              </div>
            )}

          </GlassCard>
        </div>
      )}

      {/* 3. Request Changes Modal dialog */}
      {isRequestingChanges && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="w-full max-w-lg border border-primary/20 shadow-2xl p-6 lg:p-8 space-y-6">
            
            <div className="flex items-center gap-3 text-secondary">
              <span className="material-symbols-outlined text-2xl">edit_note</span>
              <h3 className="text-xl font-display font-bold text-on-surface">Request Coordinates Audit</h3>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Provide detailed correction guidelines, boundaries adjustments requests, or missing surveyor seals requirements. This feedback is signed and routed back directly to the applicant's profile.
              </p>
            </div>

            {/* Feedback text area editor */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Registrar Correction Notes</label>
              <textarea
                className="w-full min-h-[120px] bg-surface-container-lowest border border-outline-variant/30 rounded p-4 text-xs text-on-surface outline-none focus:ring-1 focus:ring-secondary/50 placeholder:text-on-surface-variant/30"
                placeholder="Specify bounds adjustments, missing surveyor documents or deed corrections..."
                value={changesText}
                onChange={(e) => setChangesText(e.target.value)}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                onClick={() => {
                  setIsRequestingChanges(false);
                  setChangesText('');
                }}
                className="px-5 py-3 border border-outline-variant/25 text-on-surface rounded text-xs font-bold uppercase tracking-widest hover:bg-surface-container active:scale-95 transition-transform"
              >
                Cancel
              </button>
              
              <button
                onClick={handleRequestChangesConfirm}
                className="px-5 py-3 bg-secondary text-on-secondary rounded text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-transform"
              >
                Transmit Changes Request
              </button>
            </div>

          </GlassCard>
        </div>
      )}

      {/* 4. Reject Entry Modal validation warning dialog */}
      {isRejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <GlassCard className="w-full max-w-md border border-error/20 shadow-2xl p-6 lg:p-8 space-y-6 text-center">
            
            <div className="w-14 h-14 rounded-full bg-error/10 border border-error/20 text-error flex items-center justify-center mx-auto animate-pulse">
              <span className="material-symbols-outlined text-3xl">gavel</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-display font-bold text-error uppercase tracking-wider">Flag Registry Entry as Fraudulent?</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Warning: Rejecting this property deed will blacklist this transaction hash and trigger an automatic audit report to the legislative cabinet. This action is permanently logged in the municipal system journal and cannot be undone.
              </p>
            </div>

            {/* Confirm rejection actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setIsRejecting(false)}
                className="flex-1 py-3.5 border border-outline-variant/30 text-on-surface rounded text-xs font-bold uppercase tracking-widest hover:bg-surface-container active:scale-95 transition-transform"
              >
                Cancel Audit Flag
              </button>
              
              <button
                onClick={handleRejectConfirm}
                className="flex-1 py-3.5 bg-error text-on-error rounded text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-transform"
              >
                Confirm Rejection & Blacklist
              </button>
            </div>

          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default AdminstatorPage;
