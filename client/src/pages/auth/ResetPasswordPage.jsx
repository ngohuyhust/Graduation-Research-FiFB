import { KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/authApi";
import FormField from "../../components/FormField";
import { showError, showSuccess } from "../../components/ToastBridge";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const { register, handleSubmit, watch, formState } = useForm({ defaultValues: { newPassword: "" } });
  const strength = Math.min(100, (watch("newPassword") || "").length * 12.5);

  async function onSubmit(values) {
    try {
      await authApi.resetPassword({ token: params.get("token"), newPassword: values.newPassword });
      showSuccess("Password reset");
    } catch (error) {
      showError(error);
    }
  }

  return (
    <form className="space-y-5 animate-fade-in" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mint/10 text-mint">
          <KeyRound size={24} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Create a new password with at least 8 characters.</p>
      </div>
      <FormField label="New password" error={formState.errors.newPassword?.message}>
        <input
          className="input"
          type="password"
          {...register("newPassword", {
            required: "Password is required",
            minLength: { value: 8, message: "Password must be at least 8 characters" },
          })}
        />
      </FormField>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-mint to-mint-light transition-all duration-300"
          style={{ width: `${strength}%` }}
        />
      </div>
      <button
        className="btn-primary w-full py-3"
        disabled={formState.isSubmitting || !params.get("token")}
        type="submit"
      >
        Reset password
      </button>
      <Link className="link-accent block text-center text-sm" to="/login">
        Back to login
      </Link>
    </form>
  );
}
