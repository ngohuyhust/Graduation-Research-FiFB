import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/authApi";
import FormField from "../../components/FormField";
import { showError, showSuccess } from "../../components/ToastBridge";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const { register, handleSubmit, formState } = useForm({ defaultValues: { newPassword: "" } });

  async function onSubmit(values) {
    try {
      await authApi.resetPassword({ token: params.get("token"), newPassword: values.newPassword });
      showSuccess("Password reset");
    } catch (error) {
      showError(error);
    }
  }

  return (
    <form className="panel space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <h1 className="text-2xl font-bold">Reset password</h1>
      <FormField label="New password" error={formState.errors.newPassword?.message}>
        <input className="input" type="password" {...register("newPassword", { required: "Password is required", minLength: { value: 8, message: "Password must be at least 8 characters" } })} />
      </FormField>
      <button className="btn-primary w-full" disabled={formState.isSubmitting || !params.get("token")} type="submit">Reset password</button>
      <Link className="block text-center text-sm font-semibold text-steel" to="/login">Back to login</Link>
    </form>
  );
}
