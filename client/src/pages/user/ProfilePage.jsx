import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { authApi } from "../../api/authApi";
import { userApi } from "../../api/userApi";
import FormField from "../../components/FormField";
import PageHeader from "../../components/PageHeader";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfilePage() {
  const { user, refreshCurrentUser } = useAuth();
  const profileForm = useForm({ defaultValues: { fullName: "", phone: "", avatarUrl: "", fitnessGoal: "", experienceLevel: "" } });
  const passwordForm = useForm({ defaultValues: { currentPassword: "", newPassword: "" } });

  useEffect(() => {
    profileForm.reset({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      avatarUrl: user?.avatarUrl || "",
      fitnessGoal: user?.fitnessGoal || "",
      experienceLevel: user?.experienceLevel || "",
    });
  }, [profileForm, user]);

  async function saveProfile(values) {
    try {
      await userApi.updateProfile({ ...values, experienceLevel: values.experienceLevel || undefined, avatarUrl: values.avatarUrl || undefined });
      await refreshCurrentUser();
      showSuccess("Profile updated");
    } catch (error) {
      showError(error);
    }
  }

  async function changePassword(values) {
    try {
      await authApi.changePassword(values);
      passwordForm.reset();
      showSuccess("Password changed. Other sessions were revoked.");
    } catch (error) {
      showError(error);
    }
  }

  return (
    <>
      <PageHeader title="Profile" description="Manage your FiFB account and training preferences." />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <form className="panel space-y-4" onSubmit={profileForm.handleSubmit(saveProfile)}>
          <FormField label="Full name"><input className="input" {...profileForm.register("fullName", { required: "Full name is required" })} /></FormField>
          <FormField label="Phone"><input className="input" {...profileForm.register("phone")} /></FormField>
          <FormField label="Avatar URL"><input className="input" {...profileForm.register("avatarUrl")} /></FormField>
          <FormField label="Fitness goal"><textarea className="input min-h-28" {...profileForm.register("fitnessGoal")} /></FormField>
          <FormField label="Experience level">
            <select className="input" {...profileForm.register("experienceLevel")}>
              <option value="">Not set</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </FormField>
          <button className="btn-primary" disabled={profileForm.formState.isSubmitting} type="submit">Save profile</button>
        </form>
        <form className="panel space-y-4" onSubmit={passwordForm.handleSubmit(changePassword)}>
          <h2 className="font-semibold">Change password</h2>
          <FormField label="Current password"><input className="input" type="password" {...passwordForm.register("currentPassword", { required: true })} /></FormField>
          <FormField label="New password"><input className="input" type="password" {...passwordForm.register("newPassword", { required: true, minLength: 8 })} /></FormField>
          <button className="btn-secondary" disabled={passwordForm.formState.isSubmitting} type="submit">Change password</button>
        </form>
      </div>
    </>
  );
}
