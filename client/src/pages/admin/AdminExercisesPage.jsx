import { useState } from "react";
import { adminApi } from "../../api/adminApi";
import { exerciseApi } from "../../api/exerciseApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import FormField from "../../components/FormField";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function AdminExercisesPage() {
  const [form, setForm] = useState({ name: "", gifUrl: "", instructionsText: "" });
  const { data, loading, error, reload } = useAsync(() => adminApi.exercises({ page: 1, limit: 50 }), []);

  async function create(event) {
    event.preventDefault();
    try {
      await exerciseApi.create({ name: form.name, gifUrl: form.gifUrl || undefined, instructions: form.instructionsText.split("\n").filter(Boolean), status: "active" });
      setForm({ name: "", gifUrl: "", instructionsText: "" });
      showSuccess("Exercise created");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  async function review(id, status) {
    try {
      await adminApi.reviewExercise(id, status === "approved" ? { status } : { status, rejectionReason: "Rejected by admin" });
      showSuccess("Exercise reviewed");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  async function deactivate(id) {
    try {
      await adminApi.deactivateExercise(id);
      showSuccess("Exercise deactivated");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Manage Exercises" />
      <form className="panel mb-6 grid gap-4 md:grid-cols-2" onSubmit={create}>
        <FormField label="Name"><input className="input" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField>
        <FormField label="GIF URL"><input className="input" value={form.gifUrl} onChange={(event) => setForm({ ...form, gifUrl: event.target.value })} /></FormField>
        <div className="md:col-span-2"><FormField label="Instructions"><textarea className="input min-h-28" value={form.instructionsText} onChange={(event) => setForm({ ...form, instructionsText: event.target.value })} /></FormField></div>
        <button className="btn-primary" type="submit">Create exercise</button>
      </form>
      <DataTable
        columns={[
          { key: "name", header: "Name" },
          { key: "source", header: "Source" },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          { key: "actions", header: "Actions", render: (row) => <div className="flex flex-wrap gap-2"><button className="btn-primary" type="button" onClick={() => review(row.id, "approved")}>Approve</button><button className="btn-secondary" type="button" onClick={() => review(row.id, "rejected")}>Reject</button><button className="btn-danger" type="button" onClick={() => deactivate(row.id)}>Deactivate</button></div> },
        ]}
        rows={asItems(data)}
      />
    </>
  );
}
