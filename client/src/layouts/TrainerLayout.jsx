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
  { to: "/trainer", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "User Profile", icon: User },
  { to: "/trainer/profile", label: "Trainer Profile", icon: GraduationCap },
  { to: "/trainer/requests", label: "Requests", icon: Inbox },
  { to: "/trainer/certificates", label: "Certificates", icon: Award },
  { to: "/trainer/exercises", label: "Submit Exercises", icon: Dumbbell },
  { to: "/trainer/reviews", label: "Reviews", icon: Star },
  { to: "/exercises", label: "Exercise Library", icon: BookOpen },
  { to: "/workout-plans", label: "Workout Plans", icon: Layers },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export default function TrainerLayout() {
  return <AppShell navItems={navItems} />;
}
