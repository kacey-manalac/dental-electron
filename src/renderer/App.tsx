import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import AppointmentsPage from './pages/AppointmentsPage';
import TreatmentsPage from './pages/TreatmentsPage';
import BillingPage from './pages/BillingPage';
import SuppliesPage from './pages/SuppliesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="treatments" element={<TreatmentsPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="supplies" element={<SuppliesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
