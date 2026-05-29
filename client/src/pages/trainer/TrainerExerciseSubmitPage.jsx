import { useForm } from "react-hook-form";
import { exerciseApi } from "../../api/exerciseApi";
import FormField from "../../components/FormField";
import PageHeader from "../../components/PageHeader";
import { showError, showSuccess } from "../../components/ToastBridge";

export default function TrainerExerciseSubmitPage() {
  const form = useForm({ defaultValues: { name: "", gifUrl: "", instructionsText: "" } });

  async function submit(values) {
    try {
      await exerciseApi.submitAsTrainer({
        name: values.name,
        gifUrl: values.gifUrl || undefined,
        instructions: values.instructionsText.split("\n").map((line) => line.trim()).filter(Boolean),
      });
      form.reset();
      showSuccess("Exercise submitted for admin review");
    } catch (err) {
      showError(err);
    }
  }

  return (
    <>
      <PageHeader title="Submit Exercise" description="Trainer submissions are created as pending exercises for admin review." />
      <form className="panel space-y-4" onSubmit={form.handleSubmit(submit)}>
        <FormField label="Name"><input className="input" {...form.register("name", { required: true })} /></FormField>
        <FormField label="GIF URL"><input className="input" {...form.register("gifUrl")} /></FormField>
        <FormField label="Instructions"><textarea className="input min-h-40" placeholder="One instruction per line" {...form.register("instructionsText")} /></FormField>
        <button className="btn-primary" disabled={form.formState.isSubmitting} type="submit">Submit exercise</button>
      </form>
    </>
  );
}
