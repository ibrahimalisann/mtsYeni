import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Calendar, Users, UserPlus, Settings, Menu, X } from 'lucide-react';
import Navbar from './Navbar';
import { useState } from 'react';

const Layout = ({ children, isSidebarOpen, setIsSidebarOpen }) => {
    const location = useLocation();
    const { isAuthenticated, isAdmin } = useAuth();
    // const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Removed internal state

    const navigation = [
        { name: 'Dashboard', path: '/dashboard', icon: Home },
        { name: 'Rezervasyonlar', path: '/reservations', icon: Calendar },
        { name: 'Misafirler', path: '/guests', icon: Users },
        { name: 'Yeni Rezervasyon', path: '/reservations/new', icon: UserPlus },
        { name: 'Ayarlar', path: '/admin/settings', icon: Settings },
    ];

    // Don't show sidebar if not authenticated or not admin
    if (!isAuthenticated || !isAdmin) {
        return <div className="w-full">{children}</div>;
    }

    const NavContent = () => (
        <>
            <div className="h-16 flex items-center px-6 border-b border-gray-200 justify-between md:justify-start">
                <h1 className="text-xl font-bold text-gray-900">🏨 MTS Admin</h1>
                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setIsSidebarOpen(false)} // Close on mobile navigation
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200 mt-auto">
                <p className="text-xs text-gray-500 text-center">
                    Misafir Takip Sistemi
                </p>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-full">
                <NavContent />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="relative w-64 max-w-xs bg-white h-full shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out">
                        <NavContent />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

                <main className="flex-1 overflow-y-auto w-full flex flex-col relative z-0">
                    <div className="py-8 px-4 md:px-6 flex-1">
                        {children}
                    </div>

                    {/* Crafted By Footer */}
                    <div className="py-4 text-center mt-auto">
                        <p className="text-[10px] text-gray-400 font-medium tracking-wide">
                            &lt;crafted by <a href="https://mavera.site" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">mavera in istanbul</a>&gt;
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
