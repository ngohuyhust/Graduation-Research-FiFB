import { Award, BarChart3, Dumbbell, Mail, ScrollText, Users } from "lucide-react";
import AppShell from "./AppShell";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/exercises", label: "Exercises", icon: Dumbbell },
  { to: "/admin/certificates", label: "Certificates", icon: Award },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/admin/email-deliveries", label: "Email Logs", icon: Mail },
];

export default function AdminLayout() {
  return <AppShell navItems={navItems} />;
}
