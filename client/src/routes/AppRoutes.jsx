// Dinh nghia dieu huong va bao ve route app.
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../contexts/AuthContext";
import AdminLayout from "../layouts/AdminLayout";
import AuthLayout from "../layouts/AuthLayout";
import PublicLayout from "../layouts/PublicLayout";
import TrainerLayout from "../layouts/TrainerLayout";
import UserLayout from "../layouts/UserLayout";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

const AdminAuditLogsPage = lazy(() => import("../pages/admin/AdminAuditLogsPage"));
const AdminCertificatesPage = lazy(() => import("../pages/admin/AdminCertificatesPage"));
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage"));
const AdminEmailDeliveriesPage = lazy(() => import("../pages/admin/AdminEmailDeliveriesPage"));
const AdminExercisesPage = lazy(() => import("../pages/admin/AdminExercisesPage"));
const AdminUsersPage = lazy(() => import("../pages/admin/AdminUsersPage"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("../pages/auth/VerifyEmailPage"));
const TrainerCertificatesPage = lazy(() => import("../pages/trainer/TrainerCertificatesPage"));
const TrainerDashboardPage = lazy(() => import("../pages/trainer/TrainerDashboardPage"));
const TrainerExerciseSubmitPage = lazy(() => import("../pages/trainer/TrainerExerciseSubmitPage"));
const TrainerProfilePage = lazy(() => import("../pages/trainer/TrainerProfilePage"));
const TrainerRequestsPage = lazy(() => import("../pages/trainer/TrainerRequestsPage"));
const TrainerReviewsPage = lazy(() => import("../pages/trainer/TrainerReviewsPage"));
const ConnectionsPage = lazy(() => import("../pages/user/ConnectionsPage"));
const ChatPage = lazy(() => import("../pages/user/ChatPage"));
const ExerciseDetailPage = lazy(() => import("../pages/user/ExerciseDetailPage"));
const ExerciseLibraryPage = lazy(() => import("../pages/user/ExerciseLibraryPage"));
const FavoritesPage = lazy(() => import("../pages/user/FavoritesPage"));
const NotificationsPage = lazy(() => import("../pages/user/NotificationsPage"));
const ProfilePage = lazy(() => import("../pages/user/ProfilePage"));
const TrainerDetailPage = lazy(() => import("../pages/user/TrainerDetailPage"));
const TrainersPage = lazy(() => import("../pages/user/TrainersPage"));
const WorkoutHistoryPage = lazy(() => import("../pages/user/WorkoutHistoryPage"));
const WorkoutPlanEditorPage = lazy(() => import("../pages/user/WorkoutPlanEditorPage"));
const WorkoutPlansPage = lazy(() => import("../pages/user/WorkoutPlansPage"));
const WorkoutSessionPage = lazy(() => import("../pages/user/WorkoutSessionPage"));

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
    <Suspense fallback={<LoadingState />}>
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
              <Route path="/chat/:connectionId" element={<ChatPage />} />
              <Route path="/workout-sessions" element={<WorkoutHistoryPage />} />
              <Route path="/workout-sessions/:id" element={<WorkoutSessionPage />} />
            </Route>
          </Route>

          <Route element={<RoleRoute roles={["trainer"]} />}>
            <Route element={<TrainerLayout />}>
              <Route path="/trainer" element={<TrainerDashboardPage />} />
              <Route path="/trainer/user-profile" element={<ProfilePage />} />
              <Route path="/trainer/profile" element={<TrainerProfilePage />} />
              <Route path="/trainer/requests" element={<TrainerRequestsPage />} />
              <Route path="/trainer/certificates" element={<TrainerCertificatesPage />} />
              <Route path="/trainer/exercises" element={<TrainerExerciseSubmitPage />} />
              <Route path="/trainer/reviews" element={<TrainerReviewsPage />} />
              <Route path="/trainer/exercise-library" element={<ExerciseLibraryPage />} />
              <Route path="/trainer/exercise-library/:id" element={<ExerciseDetailPage />} />
              <Route path="/trainer/workout-plans" element={<WorkoutPlansPage />} />
              <Route path="/trainer/workout-plans/new" element={<WorkoutPlanEditorPage />} />
              <Route path="/trainer/workout-plans/:id" element={<WorkoutPlanEditorPage />} />
              <Route path="/trainer/notifications" element={<NotificationsPage />} />
              <Route path="/trainer/chat/:connectionId" element={<ChatPage />} />
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
    </Suspense>
  );
}
