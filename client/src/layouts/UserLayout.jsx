import { Activity, Bell, Dumbbell, Heart, Layers, MessageCircle, User, Users } from "lucide-react";
import AppShell from "./AppShell";

const navItems = [
  { to: "/profile", label: "Profile", icon: User },
  { to: "/exercises", label: "Exercises", icon: Dumbbell },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/workout-plans", label: "Workout Plans", icon: Layers },
  { to: "/workout-sessions", label: "Workout Sessions", icon: Activity },
  { to: "/trainers", label: "Trainers", icon: Users },
  { to: "/connections", label: "Connections & Chat", icon: MessageCircle },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export default function UserLayout() {
  return <AppShell navItems={navItems} />;
}
