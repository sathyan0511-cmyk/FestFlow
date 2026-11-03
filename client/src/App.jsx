import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import Clubs from './pages/Clubs';
import Venues from './pages/Venues';
import MyRegistrations from './pages/MyRegistrations';
import Competitions from './pages/Competitions';
import FinanceDashboard from './pages/FinanceDashboard';
import Sponsors from './pages/Sponsors';
import CateringManager from './pages/CateringManager';
import Certificates from './pages/Certificates';
import Volunteering from './pages/Volunteering';
import ClubManage from './pages/ClubManage';
import FacultyOrganizers from './pages/FacultyOrganizers';
import AdminFaculty from './pages/AdminFaculty';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import LoadingSpinner from './components/LoadingSpinner';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<DashboardLayout />}>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <EventDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/create"
            element={
              <ProtectedRoute allowedRoles={['admin', 'organizer']}>
                <CreateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/competitions"
            element={
              <ProtectedRoute>
                <Competitions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs"
            element={
              <ProtectedRoute>
                <Clubs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/venues"
            element={
              <ProtectedRoute>
                <Venues />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sponsors"
            element={
              <ProtectedRoute>
                <Sponsors />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catering"
            element={
              <ProtectedRoute>
                <CateringManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <Certificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/volunteering"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin', 'organizer']}>
                <Volunteering />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage/club/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'organizer', 'faculty', 'student']}>
                <ClubManage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/organizers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'faculty']}>
                <FacultyOrganizers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/faculty"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminFaculty />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances"
            element={
              <ProtectedRoute allowedRoles={['admin', 'organizer', 'faculty']}>
                <FinanceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-registrations"
            element={
              <ProtectedRoute allowedRoles={['student', 'organizer', 'faculty', 'admin']}>
                <MyRegistrations />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
