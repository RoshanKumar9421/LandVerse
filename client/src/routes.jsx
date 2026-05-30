import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OTPVerificationPage from './pages/OTPVerificationPage';
import ConnectWalletPage from './pages/ConnectWalletPage';
import KYCVerificationPage from './pages/KYCVerificationPage';
import DashboardPage from './pages/DashboardPage';
import MarketPage from './pages/MarketPage';
import NFT_miningPage from './pages/NFT_miningPage';
import PropertyDetailsPage from './pages/PropertyDetailsPage';

export const routes = [
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify', element: <OTPVerificationPage /> },
  { path: '/connect-wallet', element: <ConnectWalletPage /> },
  { path: '/kyc', element: <KYCVerificationPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/marketplace', element: <MarketPage /> },
  { path: '/mint', element: <NFT_miningPage /> },
  { path: '/property/:id', element: <PropertyDetailsPage /> },
];
