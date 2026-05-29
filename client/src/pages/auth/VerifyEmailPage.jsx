import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/authApi";
import ErrorState from "../../components/ErrorState";
import LoadingState from "../../components/LoadingState";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function verify() {
      try {
        await authApi.verifyEmail(params.get("token"));
        setStatus("success");
      } catch (err) {
        setError(err.message);
        setStatus("error");
      }
    }
    verify();
  }, [params]);

  if (status === "loading") return <LoadingState label="Verifying email..." />;
  if (status === "error") return <ErrorState message={error} />;

  return (
    <div className="panel space-y-4">
      <h1 className="text-2xl font-bold">Email verified</h1>
      <p className="text-sm text-slate-600">Your account is active. You can login now.</p>
      <Link className="btn-primary w-full" to="/login">Go to login</Link>
    </div>
  );
}
