import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const loginBtnRef = useRef(null);

  // State Variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Background parallax
      const blobs = document.querySelectorAll('.animate-pulse-slow');
      const x = (window.innerWidth / 2 - e.pageX) / 50;
      const y = (window.innerHeight / 2 - e.pageY) / 50;
      
      blobs.forEach(blob => {
        blob.style.transform = `translate(${x}px, ${y}px)`;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleBtnMouseMove = (e) => {
    if (!loginBtnRef.current) return;
    const rect = loginBtnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    loginBtnRef.current.style.setProperty('--mouse-x', `${x}px`);
    loginBtnRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Please provide both email and security key.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate with registry.');
      }

      const isAdmin = data.user?.role === 'admin' || data.user?.table === 'adminstartator';
      const redirectPath = isAdmin ? '/admin' : '/dashboard';
      const targetName = isAdmin ? 'authority panel' : 'dashboard';

      setSuccessMessage(`Access granted! Redirecting to secure ${targetName}...`);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.session) {
        localStorage.setItem('session', JSON.stringify(data.session));
      }

      setTimeout(() => {
        navigate(redirectPath);
      }, 1500);
    } catch (err) {
      console.error('Login failed:', err);
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden bg-surface text-on-surface">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface-variant/40 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        <div className="flex justify-between items-center h-20 px-8 w-full">
          <Link to="/" className="text-2xl font-headline font-bold tracking-widest text-primary">LandVerse</Link>
          <nav className="hidden md:flex space-x-8 items-center">
            <a className="font-headline text-on-surface-variant hover:text-primary-dim transition-colors duration-300 active:scale-95 transition-transform" href="#">Marketplace</a>
            <a className="font-headline text-on-surface-variant hover:text-primary-dim transition-colors duration-300 active:scale-95 transition-transform" href="#">Genesis</a>
            <a className="font-headline text-on-surface-variant hover:text-primary-dim transition-colors duration-300 active:scale-95 transition-transform" href="#">Registry</a>
            <div className="h-6 w-[1px] bg-outline-variant/30"></div>
            <Link to="/login" className="font-headline text-primary font-bold hover:text-primary-dim transition-colors duration-300 active:scale-95 transition-transform">Access Portal</Link>
          </nav>
          <div className="md:hidden">
            <span className="material-symbols-outlined text-on-surface">menu</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center relative px-6 py-24">
        {/* Atmospheric Background Elements */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-container/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-secondary-container/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        
        {/* Login Container */}
        <div className="w-full max-w-lg relative z-10">
          {/* Asymmetric Accent Image */}
          <div className="absolute -top-12 -right-12 w-32 h-32 md:w-48 md:h-48 z-20">
            <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl rotate-6 border border-primary/20 bg-surface-container">
              <img 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" 
                data-alt="Futuristic digital plot of land" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5dn1Yv4qBwGKXj2k8O0qJU3hP0leFhCZ7tXnSus09ttl3zM9_t1rVnnMEof8TOlX9k4vQ56ol-lUN-zd9k2-2rxJHA12soXgaEk_lSLRIxnZS6WrfEgA_qGj4OhTaHXlFoUuTVFWH1kph4x4sWA1ln36ae51DxgokbymEXwq3didJFoUtB7qoW6hhrHTKGrUAvrrDOiRcPvOQMUjhBYNYv4VN_8LvGoGOkEDOzp5Jid48zMlTRgX2R1CpeijifHLZOCFd21EscJGV"
                alt="Digital land rendering"
              />
            </div>
          </div>
          
          <div className="glass-panel p-10 md:p-14 rounded-lg shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-outline-variant/10">
            <div className="mb-10">
              <div className="flex items-center space-x-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                <span className="font-label text-[10px] tracking-[0.2em] uppercase text-on-surface-variant">Secure Ledger Auth</span>
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-on-surface">Welcome Back</h1>
              <p className="font-body text-on-surface-variant mt-2 text-sm">Securely access your digital land holdings and title records.</p>
            </div>
            
            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 bg-error-container/30 border border-error/50 rounded-md text-xs text-error font-body">
                  {errorMessage}
                </div>
              )}

              {/* Success Alert */}
              {successMessage && (
                <div className="p-4 bg-primary-container/20 border border-primary/50 rounded-md text-xs text-primary font-body">
                  {successMessage}
                </div>
              )}

              {/* Email/User ID Input */}
              <div className="space-y-2">
                <label className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant ml-1" htmlFor="username">Email Address</label>
                <div className="relative group">
                  <input 
                    className="w-full bg-surface-container-lowest border-none rounded-md px-5 py-4 text-on-surface focus:ring-1 focus:ring-primary-dim transition-all duration-300 placeholder:text-outline/50" 
                    id="username" 
                    placeholder="arch@landverse.xyz" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-primary-dim transition-colors">person</span>
                </div>
              </div>
              
              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="font-label text-[10px] tracking-widest uppercase text-on-surface-variant" htmlFor="password">Security Key</label>
                  <a className="text-[10px] tracking-widest uppercase text-primary hover:text-primary-dim transition-colors" href="#">Forgot?</a>
                </div>
                <div className="relative group">
                  <input 
                    className="w-full bg-surface-container-lowest border-none rounded-md px-5 py-4 text-on-surface focus:ring-1 focus:ring-primary-dim transition-all duration-300 placeholder:text-outline/50" 
                    id="password" 
                    placeholder="••••••••••••" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-primary-dim transition-colors">lock</span>
                </div>
              </div>
              
              {/* Login Button */}
              <div className="pt-4">
                <button 
                  ref={loginBtnRef}
                  onMouseMove={handleBtnMouseMove}
                  disabled={loading}
                  type="submit"
                  className="w-full primary-gradient text-on-primary-fixed py-5 rounded-md font-headline font-bold text-lg tracking-wide hover:shadow-[0_0_20px_rgba(143,245,255,0.4)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? 'Decrypting Portal...' : 'Login to Registry'}
                </button>
              </div>
            </form>
            
            {/* Footer Links */}
            <div className="mt-12 pt-8 border-t border-outline-variant/10">
              <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:justify-between md:items-center">
                <Link to="/register" className="font-label text-xs tracking-wider text-on-surface-variant hover:text-secondary transition-colors inline-flex items-center space-x-2">
                  <span>Register New Account</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@landverse.com');
                    setPassword('admin12345');
                  }}
                  className="font-label text-xs tracking-wider text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity text-left outline-none"
                >
                  Admin Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low w-full py-12 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 w-full max-w-7xl mx-auto space-y-4 md:space-y-0">
          <div className="flex flex-col items-center md:items-start space-y-2">
            <div className="font-headline text-lg text-on-surface font-bold tracking-widest">LandVerse</div>
            <div className="font-body text-sm text-on-surface-variant opacity-80 hover:opacity-100 transition-opacity">
                © 2024 LandVerse. Built on The Ethereal Ledger.
            </div>
          </div>
          <div className="flex space-x-8">
            <a className="font-body text-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Protocol</a>
            <a className="font-body text-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Legal</a>
            <a className="font-body text-sm text-on-surface-variant hover:text-secondary transition-colors" href="#">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
