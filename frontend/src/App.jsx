import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import NewReservation from './pages/NewReservation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReservationList from './pages/ReservationList';
import Guests from './pages/Guests';
import Rooms from './pages/Rooms';
import Logs from './pages/Logs';
import AcceptanceProgram from './pages/AcceptanceProgram';
import AcceptanceInvite from './pages/AcceptanceInvite';
import MusafirhaneVisit from './pages/MusafirhaneVisit';
import MusafirhaneInvite from './pages/MusafirhaneInvite';
import MisafirListesi from './pages/MisafirListesi';

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
              <Route path="/kabulProgrami/:uuid" element={<AcceptanceInvite />} />
              <Route path="/musafirhaneZiyareti/:uuid" element={<MusafirhaneInvite />} />

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
                path="/rooms"
                element={
                  <ProtectedRoute adminOnly>
                    <Rooms />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/logs"
                element={
                  <ProtectedRoute adminOnly>
                    <Logs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/acceptance-program"
                element={
                  <ProtectedRoute adminOnly>
                    <AcceptanceProgram />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/musafirhane-ziyareti"
                element={
                  <ProtectedRoute adminOnly>
                    <MusafirhaneVisit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/misafir-listesi"
                element={
                  <ProtectedRoute adminOnly>
                    <MisafirListesi />
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
