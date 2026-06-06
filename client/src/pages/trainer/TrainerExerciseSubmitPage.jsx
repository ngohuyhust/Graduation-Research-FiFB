import { Dumbbell } from "lucide-react";
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
      <form className="panel space-y-5" onSubmit={form.handleSubmit(submit)}>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-mint/10 text-mint"><Dumbbell size={24} /></div>
          <div>
            <h2 className="font-semibold text-ink">Exercise details</h2>
            <p className="text-sm text-slate-500">Each instruction line becomes one ordered step.</p>
          </div>
        </div>
        <FormField label="Name"><input className="input" {...form.register("name", { required: true })} /></FormField>
        <FormField label="GIF URL"><input className="input" {...form.register("gifUrl")} /></FormField>
        <FormField label="Instructions"><textarea className="input min-h-40" placeholder={"1. Set your stance\n2. Control the movement\n3. Reset and repeat"} {...form.register("instructionsText")} /></FormField>
        <button className="btn-primary" disabled={form.formState.isSubmitting} type="submit">Submit exercise</button>
      </form>
    </>
  );
}
