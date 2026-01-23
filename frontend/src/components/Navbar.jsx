import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, LogOut, User, Shield, Menu } from 'lucide-react';

const Navbar = ({ setIsSidebarOpen, isSidebarOpen }) => {
    const navigate = useNavigate();
    const { user, isAuthenticated, isAdmin, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="bg-transparent pt-4 pb-2 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left Side - Mobile Menu Toggle (Replaces Logo) */}
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="md:hidden p-2 -ml-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Right Side - Auth */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <>
                                {/* User Info */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 border border-gray-200/50 rounded-lg backdrop-blur-sm">
                                    <User className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-900 hidden md:inline">{user?.username}</span>
                                    {isAdmin && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] md:text-xs font-semibold rounded-full flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            Admin
                                        </span>
                                    )}
                                </div>

                                {/* Dashboard Link */}
                                {isAdmin && (
                                    <Link
                                        to="/dashboard"
                                        className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                                    >
                                        Dashboard
                                    </Link>
                                )}

                                {/* Logout Button */}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden md:inline">Çıkış Yap</span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium shadow-sm"
                            >
                                <LogIn className="w-4 h-4" />
                                Giriş Yap
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
