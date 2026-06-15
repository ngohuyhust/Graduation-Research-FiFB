import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { workoutPlanApi } from "../../api/workoutPlanApi";
import FormField from "../../components/FormField";
import LoadingState from "../../components/LoadingState";
import PageHeader from "../../components/PageHeader";
import { showError, showSuccess } from "../../components/ToastBridge";

const defaults = { title: "", description: "", visibility: "private", items: [] };

export default function WorkoutPlanEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const form = useForm({ defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const isNew = !id || id === "new";

  useEffect(() => {
    if (isNew) return;
    workoutPlanApi
      .detail(id)
      .then((data) => {
        const plan = data?.plan || data;
        form.reset({
          title: plan.title || "",
          description: plan.description || "",
          visibility: plan.visibility || "private",
          items: plan.items || [],
        });
      })
      .catch(showError);
  }, [form, id, isNew]);

  async function onSubmit(values) {
    try {
      const payload = {
        ...values,
        items: values.items.map((item) => ({
          exerciseId: item.exerciseId,
          dayNumber: Number(item.dayNumber || 1),
          sortOrder: Number(item.sortOrder || 1),
          sets: item.sets ? Number(item.sets) : undefined,
          reps: item.reps ? Number(item.reps) : undefined,
          durationSeconds: item.durationSeconds ? Number(item.durationSeconds) : undefined,
          restSeconds: item.restSeconds ? Number(item.restSeconds) : undefined,
          note: item.note || undefined,
        })),
      };
      const saved = isNew ? await workoutPlanApi.create(payload) : await workoutPlanApi.update(id, payload);
      showSuccess(isNew ? "Workout plan created" : "Workout plan updated");
      navigate(`/workout-plans/${saved?.id || id}`);
    } catch (error) {
      showError(error);
    }
  }

  if (!isNew && form.formState.isLoading) return <LoadingState />;

  return (
    <>
      <PageHeader title={isNew ? "New Workout Plan" : "Edit Workout Plan"} />
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <section className="panel grid gap-4 md:grid-cols-2">
          <FormField label="Title">
            <input className="input" {...form.register("title", { required: true })} />
          </FormField>
          <FormField label="Visibility">
            <select className="input" {...form.register("visibility")}>
              <option value="private">Private</option>
              <option value="trainer_visible">Trainer visible</option>
              <option value="public">Public</option>
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Description">
              <textarea className="input min-h-24" {...form.register("description")} />
            </FormField>
          </div>
        </section>
        <section className="panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Plan items</h2>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => append({ exerciseId: "", dayNumber: 1, sortOrder: fields.length + 1 })}
            >
              <Plus size={16} /> Add item
            </button>
          </div>
          {fields.map((field, index) => (
            <div
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm md:grid-cols-6"
              key={field.id}
            >
              <div className="md:col-span-6 text-xs font-semibold uppercase tracking-wider text-mint">
                Day {form.watch(`items.${index}.dayNumber`) || 1} · Item {index + 1}
              </div>
              <input
                className="input md:col-span-2"
                placeholder="Exercise UUID"
                {...form.register(`items.${index}.exerciseId`, { required: true })}
              />
              <input className="input" placeholder="Day" type="number" {...form.register(`items.${index}.dayNumber`)} />
              <input
                className="input"
                placeholder="Order"
                type="number"
                {...form.register(`items.${index}.sortOrder`)}
              />
              <input className="input" placeholder="Sets" type="number" {...form.register(`items.${index}.sets`)} />
              <input className="input" placeholder="Reps" type="number" {...form.register(`items.${index}.reps`)} />
              <input
                className="input"
                placeholder="Rest seconds"
                type="number"
                {...form.register(`items.${index}.restSeconds`)}
              />
              <input className="input md:col-span-4" placeholder="Note" {...form.register(`items.${index}.note`)} />
              <button className="btn-secondary" type="button" onClick={() => remove(index)}>
                <Trash2 size={16} /> Remove
              </button>
            </div>
          ))}
        </section>
        <button className="btn-primary" disabled={form.formState.isSubmitting} type="submit">
          Save plan
        </button>
      </form>
    </>
  );
}
