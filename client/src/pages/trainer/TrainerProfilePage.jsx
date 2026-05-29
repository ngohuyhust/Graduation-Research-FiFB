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
      <form className="panel space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Bio"><textarea className="input min-h-32" {...form.register("bio")} /></FormField>
        <FormField label="Specialization"><input className="input" {...form.register("specialization")} /></FormField>
        <FormField label="Years of experience"><input className="input" min="0" type="number" {...form.register("yearsOfExperience")} /></FormField>
        <button className="btn-primary" disabled={form.formState.isSubmitting} type="submit">Save profile</button>
      </form>
    </>
  );
}
