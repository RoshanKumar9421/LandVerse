import { useState, useEffect } from 'react';

const Navbar = () => {
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'how-it-works', 'features'];
      const scrollPosition = window.scrollY + 200; // Offset to trigger early

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger once initially

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (section) => {
    setActiveSection(section);
  };

  return (
    <nav className="bg-[#0c0e16]/40 backdrop-blur-xl docked full-width top-0 sticky z-50 shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
      <div className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
        <div className="text-2xl font-black tracking-tighter text-[#00E5FF] font-headline">LandVerse</div>
        <div className="hidden md:flex items-center space-x-10">
          <a
            onClick={() => handleLinkClick('hero')}
            className={`font-['Space_Grotesk'] tracking-wide uppercase text-sm font-bold border-b-2 pb-1 transition-all duration-300
              ${activeSection === 'hero'
                ? 'text-[#00E5FF] border-[#00E5FF]'
                : 'text-slate-400 hover:text-white border-transparent'}`}
            href="#hero"
          >
            Explore
          </a>
          <a
            onClick={() => handleLinkClick('how-it-works')}
            className={`font-['Space_Grotesk'] tracking-wide uppercase text-sm font-bold border-b-2 pb-1 transition-all duration-300
              ${activeSection === 'how-it-works'
                ? 'text-[#00E5FF] border-[#00E5FF]'
                : 'text-slate-400 hover:text-white border-transparent'}`}
            href="#how-it-works"
          >
            How It Works
          </a>
          <a
            onClick={() => handleLinkClick('features')}
            className={`font-['Space_Grotesk'] tracking-wide uppercase text-sm font-bold border-b-2 pb-1 transition-all duration-300
              ${activeSection === 'features'
                ? 'text-[#00E5FF] border-[#00E5FF]'
                : 'text-slate-400 hover:text-white border-transparent'}`}
            href="#features"
          >
            Features
          </a>
        </div>
        <a href="#demo" className="bg-gradient-to-r from-primary to-primary-container text-on-primary-container px-6 py-2 rounded-full font-headline font-bold text-sm tracking-wider uppercase scale-95 active:scale-90 transition-transform hover:shadow-[0_0_20px_rgba(0,238,252,0.4)]">
          View Demo
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
