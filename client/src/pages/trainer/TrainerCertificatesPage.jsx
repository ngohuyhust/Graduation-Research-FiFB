// Trang trainer certificates hien thi va xu ly luong nguoi dung.
import { Award, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trainerApi } from "../../api/trainerApi";
import EmptyState from "../../components/EmptyState";
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
  const form = useForm({
    defaultValues: {
      title: "",
      issuer: "",
      certificateUrl: "",
      certificateNumber: "",
      verificationUrl: "",
      issuedAt: "",
      expiresAt: "",
    },
  });
  const [showForm, setShowForm] = useState(false);

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
      <PageHeader
        title="Trainer Certificates"
        actions={
          <button className="btn-primary" type="button" onClick={() => setShowForm(!showForm)}>
            <Plus size={17} /> Submit certificate <ChevronDown className={showForm ? "rotate-180" : ""} size={16} />
          </button>
        }
      />
      {showForm && (
        <form className="panel mb-6 grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
          <FormField label="Title">
            <input className="input" {...form.register("title", { required: true })} />
          </FormField>
          <FormField label="Issuer">
            <input className="input" {...form.register("issuer")} />
          </FormField>
          <FormField label="Certificate URL">
            <input className="input" {...form.register("certificateUrl")} />
          </FormField>
          <FormField label="Certificate number">
            <input className="input" {...form.register("certificateNumber")} />
          </FormField>
          <FormField label="Verification URL">
            <input className="input" {...form.register("verificationUrl")} />
          </FormField>
          <FormField label="Issued at">
            <input className="input" type="date" {...form.register("issuedAt")} />
          </FormField>
          <FormField label="Expires at">
            <input className="input" type="date" {...form.register("expiresAt")} />
          </FormField>
          <button className="btn-primary md:self-end" disabled={form.formState.isSubmitting} type="submit">
            Submit certificate
          </button>
        </form>
      )}
      {asItems(data).length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {asItems(data).map((row) => (
            <article className="panel-hover" key={row.id || row.title}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-500">
                    <Award size={20} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-ink">{row.title || "-"}</h2>
                    <p className="mt-1 text-sm text-slate-500">{row.issuer || "-"}</p>
                  </div>
                </div>
                <StatusBadge value={row.status} />
              </div>
              {(row.rejectionReason || row.rejection_reason) && (
                <p className="mt-3 text-sm text-red-600">{row.rejectionReason || row.rejection_reason}</p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No certificates" description="Submitted trainer certificates will appear here." />
      )}
    </>
  );
}
