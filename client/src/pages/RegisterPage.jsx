import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const RegisterPage = () => {
  const [role, setRole] = useState('owner');
  const navigate = useNavigate();

  // State bindings for registration form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleMouseMove = (e) => {
      const moveX = (e.clientX - window.innerWidth / 2) / 50;
      const moveY = (e.clientY - window.innerHeight / 2) / 50;
      const cards = document.querySelectorAll('.glass-card-interactive');
      cards.forEach(card => {
        card.style.transform = `translate(${moveX}px, ${moveY}px)`;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    // Generate a secure mock Web3 wallet address for registration (39 hex digits matching frontend style)
    const randomHex = Array.from({ length: 39 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const walletAddress = '0x' + randomHex;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role, // owner/buyer (trigger translates owner -> seller)
          phone: phone,
          wallet_address: walletAddress
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col selection:bg-primary selection:text-on-primary-container bg-mesh">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface-variant/40 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] h-20 px-8 flex justify-between items-center">
        <Link to="/" className="text-2xl font-headline font-bold tracking-widest text-primary">LandVerse</Link>
      
        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-primary font-bold hover:text-primary-dim transition-colors duration-300">Login</Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4 relative overflow-hidden">
        {/* Decorative Ambient Element */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]"></div>
        
        <section className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8 glass-card glass-card-interactive rounded-lg overflow-hidden relative z-10 shadow-2xl">
          {/* Left Side: Editorial Content */}
          <div className="hidden lg:flex flex-col justify-between p-12 bg-surface-container-low relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="font-display text-5xl font-bold leading-tight mb-6 tracking-tight">Join the Digital <span className="text-primary">Frontier</span></h1>
              <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
                Step into a ecosystem where property rights are immutable. Register to start managing or acquiring digital land on the Ethereal Ledger.
              </p>
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">verified_user</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface">Immutable Ownership</p>
                  <p className="text-sm text-on-surface-variant">Secured by the protocol ledger.</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface">Seamless Transactions</p>
                  <p className="text-sm text-on-surface-variant">Direct peer-to-peer digital land exchange.</p>
                </div>
              </div>
            </div>
            <img 
              alt="Digital Frontier Artwork" 
              className="absolute bottom-0 right-0 w-3/4 h-3/4 object-cover mix-blend-overlay opacity-30 mask-image-linear" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgpi-EOwxtEqcEMKa_9q3sOt5gm-5VYAyicL7ksblq2wo05_5j8x3qcr4vAzfrpcIUTCsz9eq6R5tO69LKI_erjalMmddYAUckHojxoz-gA4IVMZTGjZBZMCrI9eTGLYEHyYfeIvZgAmOYw2tN57lEuW_mmS_4LSJ6PRhon5qiaxlnOI16_NJ_tvrJ8QXDOL5gJusAtvh9YnZsH_DB4__G-TGupHO2MHxXF0pkI8IyfJa8XmE7vrJ5PgFyk2XfjjSC3nij2jvJ_y5O"
            />
          </div>
          
          {/* Right Side: Registration Form */}
          <div className="p-8 md:p-12">
            <div className="mb-8">
              <h2 className="font-display text-3xl font-bold mb-2">Create Account</h2>
              <p className="text-on-surface-variant">Provide your details to initiate registry access.</p>
            </div>
            
            {/* Error Message Box */}
            {error && (
              <div className="mb-6 bg-error/10 text-error border border-error/20 p-4 rounded-md text-sm font-medium animate-pulse">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Role Selection */}
              <div className="space-y-3">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Identity Role</label>
                <div className="flex p-1 bg-surface-container-lowest rounded-md space-x-1">
                  <button 
                    className={`flex-1 py-3 rounded-sm text-sm font-bold transition-all duration-300 ${role === 'owner' ? 'active-role' : 'text-on-surface-variant hover:text-on-surface'}`}
                    onClick={() => setRole('owner')}
                    type="button"
                  >
                    Land Owner
                  </button>
                  <button 
                    className={`flex-1 py-3 rounded-sm text-sm font-bold transition-all duration-300 ${role === 'buyer' ? 'active-role' : 'text-on-surface-variant hover:text-on-surface'}`}
                    onClick={() => setRole('buyer')}
                    type="button"
                  >
                    Buyer
                  </button>
                </div>
              </div>
              
              {/* Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant" htmlFor="name">Full Name</label>
                  <div className="relative">
                    <input className="w-full bg-surface-container-lowest border-none rounded-sm px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-dim placeholder:text-outline/40" id="name" placeholder="Alex Sterling" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required/>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant" htmlFor="phone">Phone Number</label>
                  <input className="w-full bg-surface-container-lowest border-none rounded-sm px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-dim placeholder:text-outline/40" id="phone" placeholder="+1 (555) 000-0000" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}/>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant" htmlFor="email">Email Address</label>
                <input className="w-full bg-surface-container-lowest border-none rounded-sm px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-dim placeholder:text-outline/40" id="email" placeholder="alex@protocol.eth" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant" htmlFor="password">Password</label>
                  <input className="w-full bg-surface-container-lowest border-none rounded-sm px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-dim placeholder:text-outline/40" id="password" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
                </div>
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant" htmlFor="confirm">Confirm Password</label>
                  <input className="w-full bg-surface-container-lowest border-none rounded-sm px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-dim placeholder:text-outline/40" id="confirm" placeholder="••••••••" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required/>
                </div>
              </div>
              
              <div className="pt-4 flex flex-col space-y-4">
                <button disabled={loading} className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-headline font-bold text-lg rounded-md hover:shadow-[0_0_20px_rgba(143,245,255,0.3)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50">
                  {loading ? 'Registering...' : 'Register Account'}
                </button>
                <p className="text-center text-sm text-on-surface-variant">
                  By registering, you agree to our <a className="text-primary hover:underline" href="#">Terms of Service</a> and <a className="text-primary hover:underline" href="#">Privacy Protocol</a>.
                </p>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default RegisterPage;
