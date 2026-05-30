import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FormField from "../../components/FormField";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, formState } = useForm({ defaultValues: { email: "", password: "" } });

  async function onSubmit(values) {
    try {
      const user = await login(values);
      showSuccess("Logged in");
      const fallback = user.role === "admin" ? "/admin" : user.role === "trainer" ? "/trainer" : "/profile";
      navigate(location.state?.from?.pathname || fallback, { replace: true });
    } catch (error) {
      console.error("[Login Failed]", error);
      showError(error);
    }
  }

  return (
    <form className="panel space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-1 text-sm text-slate-500">Use an active, verified FiFB account.</p>
      </div>
      <FormField label="Email" error={formState.errors.email?.message}>
        <input className="input" type="email" {...register("email", { required: "Email is required" })} />
      </FormField>
      <FormField label="Password" error={formState.errors.password?.message}>
        <input className="input" type="password" {...register("password", { required: "Password is required" })} />
      </FormField>
      <button className="btn-primary w-full" disabled={formState.isSubmitting} type="submit">
        Login
      </button>
      <div className="flex justify-between text-sm">
        <Link className="font-semibold text-steel" to="/register">Create account</Link>
        <Link className="font-semibold text-steel" to="/forgot-password">Forgot password?</Link>
      </div>
    </form>
  );
}
