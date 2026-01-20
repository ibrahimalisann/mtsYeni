import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">🚫</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Erişim Reddedildi</h2>
                    <p className="text-gray-600 mb-6">Bu sayfaya erişim için admin yetkisine sahip olmanız gerekiyor.</p>
                    <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                        ← Ana sayfaya dön
                    </a>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
