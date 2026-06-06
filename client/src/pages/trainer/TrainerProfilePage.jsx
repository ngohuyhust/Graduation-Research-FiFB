import { UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { trainerApi } from "../../api/trainerApi";
import FormField from "../../components/FormField";
import PageHeader from "../../components/PageHeader";
import { showError, showSuccess } from "../../components/ToastBridge";

export default function TrainerProfilePage() {
  const form = useForm({ defaultValues: { bio: "", specialization: "", yearsOfExperience: 0 } });

  async function onSubmit(values) {
    try {
      await trainerApi.updateProfile({ ...values, yearsOfExperience: Number(values.yearsOfExperience || 0) });
      showSuccess("Trainer profile saved");
    } catch (error) {
      showError(error);
    }
  }

  return (
    <>
      <PageHeader title="Trainer Profile" />
      <form className="panel space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-mint/10 text-mint"><UserRound size={30} /></div>
          <div>
            <h2 className="font-semibold text-ink">Public trainer identity</h2>
            <p className="text-sm text-slate-500">This information appears on your trainer profile.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><FormField label="Bio"><textarea className="input min-h-32" {...form.register("bio")} /></FormField></div>
          <FormField label="Specialization"><input className="input" {...form.register("specialization")} /></FormField>
          <FormField label="Years of experience"><input className="input" min="0" type="number" {...form.register("yearsOfExperience")} /></FormField>
        </div>
        <button className="btn-primary" disabled={form.formState.isSubmitting} type="submit">Save profile</button>
      </form>
    </>
  );
}
