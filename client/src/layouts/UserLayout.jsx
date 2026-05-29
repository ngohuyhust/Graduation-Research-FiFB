import AppShell from "./AppShell";

const navItems = [
  { to: "/profile", label: "Profile" },
  { to: "/exercises", label: "Exercises" },
  { to: "/favorites", label: "Favorites" },
  { to: "/workout-plans", label: "Workout Plans" },
  { to: "/trainers", label: "Trainers" },
  { to: "/connections", label: "Connections" },
  { to: "/notifications", label: "Notifications" },
];

export default function UserLayout() {
  return <AppShell navItems={navItems} />;
}
