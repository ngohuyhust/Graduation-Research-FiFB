import { LogIn } from "lucide-react";
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
    <form className="space-y-5 animate-fade-in" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-mint/10 text-mint">
          <LogIn size={22} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Use an active, verified FiFB account.</p>
      </div>
      <FormField label="Email" error={formState.errors.email?.message}>
        <input className="input" type="email" {...register("email", { required: "Email is required" })} />
      </FormField>
      <FormField label="Password" error={formState.errors.password?.message}>
        <input className="input" type="password" {...register("password", { required: "Password is required" })} />
      </FormField>
      <button className="btn-primary w-full py-3" disabled={formState.isSubmitting} type="submit">
        Login
      </button>
      <div className="border-t border-slate-100 pt-4">
        <div className="flex justify-between text-sm">
          <Link className="link-accent" to="/register">Create account</Link>
          <Link className="link-accent" to="/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </form>
  );
}
