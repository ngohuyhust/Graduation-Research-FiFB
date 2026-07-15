// Trang forgot password hien thi va xu ly luong nguoi dung.
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { authApi } from "../../api/authApi";
import FormField from "../../components/FormField";
import { showError, showSuccess } from "../../components/ToastBridge";

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState } = useForm({ defaultValues: { email: "" } });

  async function onSubmit(values) {
    try {
      await authApi.requestPasswordReset(values.email);
      showSuccess("If the email exists, a reset link has been sent");
    } catch (error) {
      showError(error);
    }
  }

  return (
    <form className="space-y-5 animate-fade-in" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mint/10 text-mint">
          <Mail size={24} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Forgot password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Enter your account email and FiFB will send the reset flow if the address exists.
        </p>
      </div>
      <FormField label="Email" error={formState.errors.email?.message}>
        <input className="input" type="email" {...register("email", { required: "Email is required" })} />
      </FormField>
      <button className="btn-primary w-full py-3" disabled={formState.isSubmitting} type="submit">
        Send reset link
      </button>
      <Link className="link-accent block text-center text-sm" to="/login">
        Back to login
      </Link>
    </form>
  );
}
