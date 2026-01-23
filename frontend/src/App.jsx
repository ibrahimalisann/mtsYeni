import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import NewReservation from './pages/NewReservation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReservationList from './pages/ReservationList';
import Guests from './pages/Guests';

import Settings from './pages/Settings';

import { useState } from 'react';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Layout isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<NewReservation />} />
              <Route path="/login" element={<Login />} />

              {/* Protected Routes (Admin) */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute adminOnly>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reservations"
                element={
                  <ProtectedRoute adminOnly>
                    <ReservationList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reservations/new"
                element={
                  <ProtectedRoute adminOnly>
                    <NewReservation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guests"
                element={
                  <ProtectedRoute adminOnly>
                    <Guests />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute adminOnly>
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Layout>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
