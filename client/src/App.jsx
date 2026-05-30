import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OTPVerificationPage from './pages/OTPVerificationPage';
import ConnectWalletPage from './pages/ConnectWalletPage';
import KYCVerificationPage from './pages/KYCVerificationPage';
import DashboardPage from './pages/DashboardPage';
import LandRegistrationPage from './pages/LandRegistrationPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<OTPVerificationPage />} />
        <Route path="/connect-wallet" element={<ConnectWalletPage />} />
        <Route path="/kyc" element={<KYCVerificationPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/land-registration" element={<LandRegistrationPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
