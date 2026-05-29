import AppShell from "./AppShell";

const navItems = [
  { to: "/trainer", label: "Dashboard" },
  { to: "/profile", label: "User Profile" },
  { to: "/trainer/profile", label: "Trainer Profile" },
  { to: "/trainer/requests", label: "Requests" },
  { to: "/trainer/certificates", label: "Certificates" },
  { to: "/trainer/exercises", label: "Submit Exercises" },
  { to: "/trainer/reviews", label: "Reviews" },
  { to: "/exercises", label: "Exercise Library" },
  { to: "/workout-plans", label: "Workout Plans" },
  { to: "/notifications", label: "Notifications" },
];

export default function TrainerLayout() {
  return <AppShell navItems={navItems} />;
}
