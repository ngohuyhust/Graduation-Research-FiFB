import { Bell, Dumbbell, Heart, Layers, Link2, User, Users } from "lucide-react";
import AppShell from "./AppShell";

const navItems = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/exercises", label: "Exercises", icon: Dumbbell },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/workout-plans", label: "Workout Plans", icon: Layers },
  { to: "/trainers", label: "Trainers", icon: Users },
  { to: "/connections", label: "Connections", icon: Link2 },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export default function UserLayout() {
  return <AppShell navItems={navItems} />;
}
