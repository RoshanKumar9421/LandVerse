import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const [role, setRole] = useState('owner');
  const navigate = useNavigate();

  // State Variables
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone: phone || null,
          role,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      setSuccessMessage('Registration successful! Redirecting to login portal...');
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.session) {
        localStorage.setItem('session', JSON.stringify(data.session));
      }

      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      console.error('Registration failed:', err);
      setErrorMessage(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col selection:bg-primary selection:text-on-primary-container bg-mesh">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface-variant/40 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] h-20 px-8 flex justify-between items-center">
        <Link to="/" className="text-2xl font-headline font-bold tracking-widest text-primary">LandVerse</Link>
        <nav className="hidden md:flex space-x-8">
          <Link to="/" className="text-on-surface-variant hover:text-primary-dim transition-colors duration-300 font-headline">Explore</Link>
          <a className="text-on-surface-variant hover:text-primary-dim transition-colors duration-300 font-headline" href="#">Protocol</a>
          <a className="text-on-surface-variant hover:text-primary-dim transition-colors duration-300 font-headline" href="#">Ledger</a>
        </nav>
        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-primary font-bold hover:text-primary-dim transition-colors duration-300">Login</Link>
          <Link to="/connect-wallet" className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-6 py-2 rounded-md font-bold transition-transform active:scale-95">Connect Wallet</Link>
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
                Step into a decentralized ecosystem where property rights are immutable. Register to start managing or acquiring digital land on the Ethereal Ledger.
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
            
            <form className="space-y-6" onSubmit={handleRegister}>
              {/* Error Message Banner */}
              {errorMessage && (
                <div className="p-4 bg-error-container/30 border border-error/50 rounded-md text-xs text-error font-body">
                  {errorMessage}
                </div>
              )}

              {/* Success Message Banner */}
              {successMessage && (
                <div className="p-4 bg-primary-container/20 border border-primary/50 rounded-md text-xs text-primary font-body">
                  {successMessage}
                </div>
              )}

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
                    <input 
                      className="w-full bg-surface-container-lowest border-none rounded-sm px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-dim placeholder:text-outline/40" 
                      id="name" 
                      placeholder="Alex Sterling" 
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant" htmlFor="phone">Phone Number</label>
                  <input 
                    className="w-full bg-surface-container-lowest border-none rounded-sm px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-dim placeholder:text-outline/40" 
                    id="phone" 
                    placeholder="+1 (555) 000-0000" 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant" htmlFor="email">Email Address</label>
                <input 
                  className="w-full bg-surface-container-lowest border-none rounded-sm px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-dim placeholder:text-outline/40" 
                  id="email" 
                  placeholder="alex@protocol.eth" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant" htmlFor="password">Password</label>
                  <input 
                    className="w-full bg-surface-container-lowest border-none rounded-sm px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-dim placeholder:text-outline/40" 
                    id="password" 
                    placeholder="••••••••" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant" htmlFor="confirm">Confirm Password</label>
                  <input 
                    className="w-full bg-surface-container-lowest border-none rounded-sm px-4 py-3 text-on-surface focus:ring-1 focus:ring-primary-dim placeholder:text-outline/40" 
                    id="confirm" 
                    placeholder="••••••••" 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="pt-4 flex flex-col space-y-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary-container font-headline font-bold text-lg rounded-md hover:shadow-[0_0_20px_rgba(143,245,255,0.3)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Creating Registry...' : 'Register Account'}
                </button>
                <p className="text-center text-sm text-on-surface-variant">
                  By registering, you agree to our <a className="text-primary hover:underline" href="#">Terms of Service</a> and <a className="text-primary hover:underline" href="#">Privacy Protocol</a>.
                </p>
              </div>
            </form>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="w-full py-12 bg-surface-container-low mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 w-full max-w-7xl mx-auto space-y-4 md:space-y-0">
          <div className="flex items-center space-x-6">
            <span className="font-headline text-lg text-on-surface">LandVerse</span>
            <span className="font-body text-sm text-on-surface-variant opacity-80">© 2024 LandVerse. Built on The Ethereal Ledger.</span>
          </div>
          <div className="flex space-x-8">
            <a className="text-on-surface-variant hover:text-secondary transition-colors text-sm font-body" href="#">Protocol</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors text-sm font-body" href="#">Legal</a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors text-sm font-body" href="#">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RegisterPage;
