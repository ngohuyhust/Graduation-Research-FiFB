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
    <form className="panel space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <FormField label="Email" error={formState.errors.email?.message}>
        <input className="input" type="email" {...register("email", { required: "Email is required" })} />
      </FormField>
      <button className="btn-primary w-full" disabled={formState.isSubmitting} type="submit">Send reset link</button>
      <Link className="block text-center text-sm font-semibold text-steel" to="/login">Back to login</Link>
    </form>
  );
}
