import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/authApi";
import FormField from "../../components/FormField";
import { showError } from "../../components/ToastBridge";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [verified, setVerified] = useState(false);
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(""));
  const [otpError, setOtpError] = useState("");
  const otpRefs = useRef([]);
  const { register, handleSubmit, formState } = useForm({
    defaultValues: { email: params.get("email") || "" },
  });

  async function onSubmit(values) {
    const otp = otpDigits.join("");
    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Verification code must be 6 digits");
      return;
    }

    try {
      await authApi.verifyEmail({
        email: values.email.trim().toLowerCase(),
        otp,
      });
      setVerified(true);
    } catch (error) {
      showError(error);
    }
  }

  function updateDigit(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);
    setOtpError("");
    if (digit && index < otpDigits.length - 1) otpRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    const nextDigits = Array(6).fill("");
    pasted.split("").forEach((digit, index) => {
      nextDigits[index] = digit;
    });
    setOtpDigits(nextDigits);
    setOtpError("");
    otpRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
  }

  if (verified) {
    return (
      <div className="space-y-5 text-center animate-fade-in">
        <CheckCircle2 className="mx-auto animate-scale-in text-mint" size={64} />
        <h1 className="text-3xl font-bold tracking-tight">Email verified</h1>
        <p className="text-sm leading-6 text-slate-600">Your account is active. You can login now.</p>
        <Link className="btn-primary w-full py-3" to="/login">Go to login</Link>
      </div>
    );
  }

  return (
    <form className="space-y-5 animate-fade-in" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mint/10 text-mint">
          <ShieldCheck size={24} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Verify email</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Enter the 6-digit code sent to your Gmail.</p>
      </div>
      <FormField label="Email" error={formState.errors.email?.message}>
        <input className="input" type="email" {...register("email", { required: "Email is required" })} />
      </FormField>
      <FormField label="Verification code" error={otpError}>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft">
          <div className="grid grid-cols-6 gap-2">
            {otpDigits.map((digit, index) => (
              <input
                aria-label={`Verification digit ${index + 1}`}
                className="input h-14 p-0 text-center font-mono text-2xl font-semibold focus:border-mint"
                inputMode="numeric"
                key={index}
                maxLength={1}
                ref={(element) => {
                  otpRefs.current[index] = element;
                }}
                type="text"
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
              />
            ))}
          </div>
        </div>
      </FormField>
      <button className="btn-primary w-full py-3" disabled={formState.isSubmitting} type="submit">Verify email</button>
      <Link className="link-accent block text-center text-sm" to="/login">Back to login</Link>
    </form>
  );
}
