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
      <div className="panel space-y-4">
        <h1 className="text-2xl font-bold">Email verified</h1>
        <p className="text-sm text-slate-600">Your account is active. You can login now.</p>
        <Link className="btn-primary w-full" to="/login">Go to login</Link>
      </div>
    );
  }

  return (
    <form className="panel space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <h1 className="text-2xl font-bold">Verify email</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the 6-digit code sent to your Gmail.</p>
      </div>
      <FormField label="Email" error={formState.errors.email?.message}>
        <input className="input" type="email" {...register("email", { required: "Email is required" })} />
      </FormField>
      <FormField label="Verification code" error={otpError}>
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <div className="grid grid-cols-6 gap-2">
            {otpDigits.map((digit, index) => (
              <input
                aria-label={`Verification digit ${index + 1}`}
                className="input h-12 p-0 text-center text-xl font-semibold"
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
      <button className="btn-primary w-full" disabled={formState.isSubmitting} type="submit">Verify email</button>
      <Link className="block text-center text-sm font-semibold text-steel" to="/login">Back to login</Link>
    </form>
  );
}
