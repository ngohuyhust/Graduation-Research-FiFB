import { useForm } from "react-hook-form";
import { trainerApi } from "../../api/trainerApi";
import DataTable from "../../components/DataTable";
import ErrorState from "../../components/ErrorState";
import FormField from "../../components/FormField";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAsync } from "../../hooks/useAsync";
import { asItems } from "../../utils/format";

export default function TrainerCertificatesPage() {
  const { data, loading, error, reload } = useAsync(trainerApi.myCertificates, []);
  const form = useForm({ defaultValues: { title: "", issuer: "", certificateUrl: "", certificateNumber: "", verificationUrl: "", issuedAt: "", expiresAt: "" } });

  async function submit(values) {
    try {
      await trainerApi.submitCertificate(Object.fromEntries(Object.entries(values).filter(([, value]) => value)));
      form.reset();
      showSuccess("Certificate submitted");
      reload();
    } catch (err) {
      showError(err);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Trainer Certificates" />
      <form className="panel mb-6 grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
        <FormField label="Title"><input className="input" {...form.register("title", { required: true })} /></FormField>
        <FormField label="Issuer"><input className="input" {...form.register("issuer")} /></FormField>
        <FormField label="Certificate URL"><input className="input" {...form.register("certificateUrl")} /></FormField>
        <FormField label="Certificate number"><input className="input" {...form.register("certificateNumber")} /></FormField>
        <FormField label="Verification URL"><input className="input" {...form.register("verificationUrl")} /></FormField>
        <FormField label="Issued at"><input className="input" type="date" {...form.register("issuedAt")} /></FormField>
        <FormField label="Expires at"><input className="input" type="date" {...form.register("expiresAt")} /></FormField>
        <button className="btn-primary md:self-end" disabled={form.formState.isSubmitting} type="submit">Submit certificate</button>
      </form>
      <DataTable columns={[{ key: "title", header: "Title" }, { key: "issuer", header: "Issuer" }, { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> }, { key: "rejectionReason", header: "Reason", render: (row) => row.rejectionReason || row.rejection_reason || "-" }]} rows={asItems(data)} />
    </>
  );
}
