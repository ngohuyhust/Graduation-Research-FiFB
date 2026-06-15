import { Activity, Dumbbell, UserRound, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import FormField from "../../components/FormField";
import { showError, showSuccess } from "../../components/ToastBridge";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, reset, watch, formState } = useForm({
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      phone: "",
      role: "user",
      fitnessGoal: "",
      experienceLevel: "",
    },
  });
  const role = watch("role");
  const experienceLevel = watch("experienceLevel");

  async function onSubmit(values) {
    try {
      const payload = { ...values, phone: values.phone.trim(), experienceLevel: values.experienceLevel || undefined };
      await authApi.register(payload);
      reset();
      showSuccess("Registration created. Check email for your verification code.");
      navigate(`/verify-email?email=${encodeURIComponent(values.email.trim().toLowerCase())}`);
    } catch (error) {
      showError(error);
    }
  }

  return (
    <form className="space-y-5 animate-fade-in" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-mint/10 text-mint">
          <Users size={22} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Register</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Create a user or trainer account.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Full name" error={formState.errors.fullName?.message}>
          <input className="input" {...register("fullName", { required: "Full name is required" })} />
        </FormField>
        <FormField label="Email" error={formState.errors.email?.message}>
          <input className="input" type="email" {...register("email", { required: "Email is required" })} />
        </FormField>
        <FormField label="Phone number" error={formState.errors.phone?.message}>
          <input
            className="input"
            type="tel"
            {...register("phone", {
              required: "Phone number is required",
              maxLength: { value: 40, message: "Phone number must be at most 40 characters" },
            })}
          />
        </FormField>
        <FormField label="Password" error={formState.errors.password?.message}>
          <input
            className="input"
            type="password"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Password must be at least 8 characters" },
            })}
          />
        </FormField>
      </div>
      <FormField label="Role">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: "user", label: "User", icon: UserRound },
            { value: "trainer", label: "Trainer", icon: Dumbbell },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <label
                className={`cursor-pointer rounded-xl border p-4 transition-all ${role === option.value ? "border-mint bg-mint/5 shadow-glow" : "border-slate-200 bg-white hover:border-slate-300"}`}
                key={option.value}
              >
                <input className="sr-only" type="radio" value={option.value} {...register("role")} />
                <span className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <Icon size={18} /> {option.label}
                </span>
              </label>
            );
          })}
        </div>
      </FormField>
      <FormField label="Fitness goal">
        <textarea className="input min-h-24" {...register("fitnessGoal")} />
      </FormField>
      <FormField label="Experience level">
        <div className="grid gap-2 sm:grid-cols-3">
          {["beginner", "intermediate", "advanced"].map((level) => (
            <label
              className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all ${experienceLevel === level ? "border-mint bg-mint/5 text-mint shadow-glow" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
              key={level}
            >
              <input className="sr-only" type="radio" value={level} {...register("experienceLevel")} />
              <Activity className="mx-auto mb-1" size={16} />
              {level}
            </label>
          ))}
        </div>
      </FormField>
      <button className="btn-primary w-full py-3" disabled={formState.isSubmitting} type="submit">
        Register
      </button>
      <Link className="link-accent block text-center text-sm" to="/login">
        Already have an account?
      </Link>
    </form>
  );
}
