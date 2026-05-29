import AppShell from "./AppShell";

const navItems = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/exercises", label: "Exercises" },
  { to: "/admin/certificates", label: "Certificates" },
  { to: "/admin/audit-logs", label: "Audit Logs" },
  { to: "/admin/email-deliveries", label: "Email Logs" },
];

export default function AdminLayout() {
  return <AppShell navItems={navItems} />;
}
