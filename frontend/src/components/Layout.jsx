import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Calendar, Users, UserPlus } from 'lucide-react';

const Layout = ({ children }) => {
    const location = useLocation();
    const { isAuthenticated, isAdmin } = useAuth();

    const navigation = [
        { name: 'Dashboard', path: '/dashboard', icon: Home },
        { name: 'Rezervasyonlar', path: '/reservations', icon: Calendar },
        { name: 'Misafirler', path: '/guests', icon: Users },
        { name: 'Yeni Rezervasyon', path: '/reservations/new', icon: UserPlus },
    ];

    // Don't show sidebar if not authenticated or not admin
    if (!isAuthenticated || !isAdmin) {
        return <div className="w-full">{children}</div>;
    }

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900">🏨 MTS Admin</h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                to={item.path}
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

                {/* Footer */}
                <div className="p-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                        Misafir Takip Sistemi
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                    <div className="py-8 px-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
