import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { authApi } from "../../api/authApi";
import FormField from "../../components/FormField";
import { showError, showSuccess } from "../../components/ToastBridge";

export default function RegisterPage() {
  const { register, handleSubmit, reset, formState } = useForm({
    defaultValues: { email: "", password: "", fullName: "", role: "user", fitnessGoal: "", experienceLevel: "" },
  });

  async function onSubmit(values) {
    try {
      const payload = { ...values, experienceLevel: values.experienceLevel || undefined };
      await authApi.register(payload);
      reset();
      showSuccess("Registration created. Check email to verify account.");
    } catch (error) {
      showError(error);
    }
  }

  return (
    <form className="panel space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <h1 className="text-2xl font-bold">Register</h1>
        <p className="mt-1 text-sm text-slate-500">Create a user or trainer account.</p>
      </div>
      <FormField label="Full name" error={formState.errors.fullName?.message}>
        <input className="input" {...register("fullName", { required: "Full name is required" })} />
      </FormField>
      <FormField label="Email" error={formState.errors.email?.message}>
        <input className="input" type="email" {...register("email", { required: "Email is required" })} />
      </FormField>
      <FormField label="Password" error={formState.errors.password?.message}>
        <input className="input" type="password" {...register("password", { required: "Password is required", minLength: { value: 8, message: "Password must be at least 8 characters" } })} />
      </FormField>
      <FormField label="Role">
        <select className="input" {...register("role")}>
          <option value="user">User</option>
          <option value="trainer">Trainer</option>
        </select>
      </FormField>
      <FormField label="Fitness goal">
        <textarea className="input min-h-24" {...register("fitnessGoal")} />
      </FormField>
      <FormField label="Experience level">
        <select className="input" {...register("experienceLevel")}>
          <option value="">Not set</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </FormField>
      <button className="btn-primary w-full" disabled={formState.isSubmitting} type="submit">Register</button>
      <Link className="block text-center text-sm font-semibold text-steel" to="/login">Already have an account?</Link>
    </form>
  );
}
