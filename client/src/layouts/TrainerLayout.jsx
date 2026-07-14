import {
  Award,
  Bell,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Inbox,
  Layers,
  LayoutDashboard,
  Star,
  User,
} from "lucide-react";
import AppShell from "./AppShell";

const navItems = [
  { to: "/trainer", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/trainer/user-profile", label: "User Profile", icon: User },
  { to: "/trainer/profile", label: "Trainer Profile", icon: GraduationCap },
  { to: "/trainer/requests", label: "Requests", icon: Inbox },
  { to: "/trainer/certificates", label: "Certificates", icon: Award },
  { to: "/trainer/exercises", label: "Submit Exercises", icon: Dumbbell },
  { to: "/trainer/reviews", label: "Reviews", icon: Star },
  { to: "/trainer/exercise-library", label: "Exercise Library", icon: BookOpen },
  { to: "/trainer/workout-plans", label: "Workout Plans", icon: Layers },
  { to: "/trainer/notifications", label: "Notifications", icon: Bell },
];

export default function TrainerLayout() {
  return <AppShell navItems={navItems} />;
}
