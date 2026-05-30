import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import AuthLayout from "../layouts/AuthLayout";
import PublicLayout from "../layouts/PublicLayout";
import TrainerLayout from "../layouts/TrainerLayout";
import UserLayout from "../layouts/UserLayout";
import AdminAuditLogsPage from "../pages/admin/AdminAuditLogsPage";
import AdminCertificatesPage from "../pages/admin/AdminCertificatesPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import AdminEmailDeliveriesPage from "../pages/admin/AdminEmailDeliveriesPage";
import AdminExercisesPage from "../pages/admin/AdminExercisesPage";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import VerifyEmailPage from "../pages/auth/VerifyEmailPage";
import TrainerCertificatesPage from "../pages/trainer/TrainerCertificatesPage";
import TrainerDashboardPage from "../pages/trainer/TrainerDashboardPage";
import TrainerExerciseSubmitPage from "../pages/trainer/TrainerExerciseSubmitPage";
import TrainerProfilePage from "../pages/trainer/TrainerProfilePage";
import TrainerRequestsPage from "../pages/trainer/TrainerRequestsPage";
import TrainerReviewsPage from "../pages/trainer/TrainerReviewsPage";
import ConnectionsPage from "../pages/user/ConnectionsPage";
import ExerciseDetailPage from "../pages/user/ExerciseDetailPage";
import ExerciseLibraryPage from "../pages/user/ExerciseLibraryPage";
import FavoritesPage from "../pages/user/FavoritesPage";
import NotificationsPage from "../pages/user/NotificationsPage";
import ProfilePage from "../pages/user/ProfilePage";
import TrainerDetailPage from "../pages/user/TrainerDetailPage";
import TrainersPage from "../pages/user/TrainersPage";
import WorkoutPlanEditorPage from "../pages/user/WorkoutPlanEditorPage";
import WorkoutPlansPage from "../pages/user/WorkoutPlansPage";
import { useAuth } from "../contexts/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

function HomeRedirect() {
  const { role, isAuthenticated, bootstrapping } = useAuth();
  if (bootstrapping) return null;
  if (!isAuthenticated) return <Navigate replace to="/exercises" />;
  if (role === "admin") return <Navigate replace to="/admin" />;
  if (role === "trainer") return <Navigate replace to="/trainer" />;
  return <Navigate replace to="/profile" />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/exercises" element={<ExerciseLibraryPage />} />
        <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
        <Route path="/trainers" element={<TrainersPage />} />
        <Route path="/trainers/:id" element={<TrainerDetailPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute roles={["user", "trainer"]} />}>
          <Route element={<UserLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/workout-plans" element={<WorkoutPlansPage />} />
            <Route path="/workout-plans/new" element={<WorkoutPlanEditorPage />} />
            <Route path="/workout-plans/:id" element={<WorkoutPlanEditorPage />} />
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        <Route element={<RoleRoute roles={["trainer"]} />}>
          <Route element={<TrainerLayout />}>
            <Route path="/trainer" element={<TrainerDashboardPage />} />
            <Route path="/trainer/profile" element={<TrainerProfilePage />} />
            <Route path="/trainer/requests" element={<TrainerRequestsPage />} />
            <Route path="/trainer/certificates" element={<TrainerCertificatesPage />} />
            <Route path="/trainer/exercises" element={<TrainerExerciseSubmitPage />} />
            <Route path="/trainer/reviews" element={<TrainerReviewsPage />} />
          </Route>
        </Route>

        <Route element={<RoleRoute roles={["admin"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/exercises" element={<AdminExercisesPage />} />
            <Route path="/admin/certificates" element={<AdminCertificatesPage />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="/admin/email-deliveries" element={<AdminEmailDeliveriesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
