// Trang profile hien thi va xu ly luong nguoi dung.
import { Activity, Dumbbell, Ruler, Scale, TrendingDown, UserRound, Users, Zap } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { authApi } from "../../api/authApi";
import { userApi } from "../../api/userApi";
import FormField from "../../components/FormField";
import PageHeader from "../../components/PageHeader";
import { showError, showSuccess } from "../../components/ToastBridge";
import { useAuth } from "../../contexts/AuthContext";

const fitnessGoalOptions = [
  { value: "lose_weight", label: "Lose Weight", icon: TrendingDown },
  { value: "gain_muscle", label: "Gain Muscle", icon: Dumbbell },
  { value: "increase_strength", label: "Increase Strength", icon: Zap },
];

const genderOptions = [
  { value: "male", label: "Male", icon: UserRound },
  { value: "female", label: "Female", icon: Users },
];

function optionalNumber(value) {
  if (value === "" || value == null) return undefined;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : undefined;
}

export default function ProfilePage() {
  const { user, refreshCurrentUser } = useAuth();
  const profileForm = useForm({
    defaultValues: {
      fullName: "",
      phone: "",
      avatarUrl: "",
      fitnessGoal: "",
      experienceLevel: "",
      gender: "",
      weight: "",
      height: "",
    },
  });
  const passwordForm = useForm({ defaultValues: { currentPassword: "", newPassword: "" } });
  const profileGender = profileForm.watch("gender");
  const profileFitnessGoal = profileForm.watch("fitnessGoal");
  const profileExperienceLevel = profileForm.watch("experienceLevel");

  useEffect(() => {
    profileForm.reset({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      avatarUrl: user?.avatarUrl || "",
      fitnessGoal: user?.fitnessGoal || "",
      experienceLevel: user?.experienceLevel || "",
      gender: user?.gender || "",
      weight: user?.weight || "",
      height: user?.height || "",
    });
  }, [profileForm, user]);

  async function saveProfile(values) {
    try {
      await userApi.updateProfile({
        ...values,
        fitnessGoal: values.fitnessGoal || undefined,
        experienceLevel: values.experienceLevel || undefined,
        avatarUrl: values.avatarUrl || undefined,
        gender: values.gender || undefined,
        weight: optionalNumber(values.weight),
        height: optionalNumber(values.height),
      });
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
      <div className="mb-6 panel flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-mint/10 text-mint">
          {user?.avatarUrl ? (
            <img className="h-full w-full object-cover" src={user.avatarUrl} alt={user?.fullName || "Avatar"} />
          ) : (
            <UserRound size={36} />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink">{user?.fullName || user?.email || "FiFB profile"}</h2>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <form className="panel space-y-4" onSubmit={profileForm.handleSubmit(saveProfile)}>
          <FormField label="Full name">
            <input className="input" {...profileForm.register("fullName", { required: "Full name is required" })} />
          </FormField>
          <FormField label="Phone">
            <input className="input" {...profileForm.register("phone")} />
          </FormField>
          <FormField label="Avatar URL">
            <input className="input" {...profileForm.register("avatarUrl")} />
          </FormField>
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Gender</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {genderOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    className={`cursor-pointer rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${profileGender === option.value ? "border-mint bg-mint/5 text-mint shadow-glow" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                    key={option.value}
                  >
                    <input className="sr-only" type="radio" value={option.value} {...profileForm.register("gender")} />
                    <span className="flex items-center justify-center gap-2">
                      <Icon size={16} /> {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Weight (kg)">
              <div className="relative">
                <Scale
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />
                <input
                  className="input pl-10"
                  min="1"
                  step="0.1"
                  type="number"
                  {...profileForm.register("weight", {
                    min: { value: 1, message: "Weight must be positive" },
                  })}
                />
              </div>
            </FormField>
            <FormField label="Height (cm)">
              <div className="relative">
                <Ruler
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />
                <input
                  className="input pl-10"
                  min="1"
                  step="0.1"
                  type="number"
                  {...profileForm.register("height", {
                    min: { value: 1, message: "Height must be positive" },
                  })}
                />
              </div>
            </FormField>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fitness goal
            </span>
            <div className="grid gap-2 sm:grid-cols-3">
              {fitnessGoalOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all ${profileFitnessGoal === option.value ? "border-mint bg-mint/5 text-mint shadow-glow" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                    key={option.value}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      value={option.value}
                      {...profileForm.register("fitnessGoal")}
                    />
                    <Icon className="mx-auto mb-1" size={16} />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>
          <FormField label="Experience level">
            <div className="grid gap-2 sm:grid-cols-3">
              {["beginner", "intermediate", "advanced"].map((level) => (
                <label
                  className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all ${profileExperienceLevel === level ? "border-mint bg-mint/5 text-mint shadow-glow" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                  key={level}
                >
                  <input className="sr-only" type="radio" value={level} {...profileForm.register("experienceLevel")} />
                  <Activity className="mx-auto mb-1" size={16} />
                  {level}
                </label>
              ))}
            </div>
          </FormField>
          <button className="btn-primary" disabled={profileForm.formState.isSubmitting} type="submit">
            Save profile
          </button>
        </form>
        <form className="panel space-y-4" onSubmit={passwordForm.handleSubmit(changePassword)}>
          <h2 className="font-semibold">Change password</h2>
          <FormField label="Current password">
            <input
              className="input"
              type="password"
              {...passwordForm.register("currentPassword", { required: true })}
            />
          </FormField>
          <FormField label="New password">
            <input
              className="input"
              type="password"
              {...passwordForm.register("newPassword", { required: true, minLength: 8 })}
            />
          </FormField>
          <button className="btn-secondary" disabled={passwordForm.formState.isSubmitting} type="submit">
            Change password
          </button>
        </form>
      </div>
    </>
  );
}
