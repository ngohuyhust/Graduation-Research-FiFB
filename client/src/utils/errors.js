// Helper errors dung chung trong client.
export function getErrorMessage(error) {
  if (typeof error === "string") return sanitizeMessage(error);
  if (error?.userMessage) return error.userMessage;

  const validationMessage = getValidationMessage(error?.details);
  if (validationMessage) return validationMessage;

  const message = error?.message || "";
  if (isInternalMessage(message) || error?.code === "SERVER_ERROR" || error?.status >= 500) {
    return "Something went wrong. Please check your information and try again.";
  }

  if (error?.code === "NETWORK_ERROR") return "Unable to reach server. Check your connection and try again.";
  if (error?.code === "VALIDATION_ERROR") return "Please check your information and try again.";

  return sanitizeMessage(message || "Something went wrong");
}

const fieldLabels = {
  email: "Email",
  password: "Password",
  fullName: "Full name",
  phone: "Phone number",
  role: "Role",
  fitnessGoal: "Fitness goal",
  gender: "Gender",
  weight: "Weight",
  height: "Height",
  experienceLevel: "Experience level",
};

const internalMessagePatterns = [
  /\bcolumn\b/i,
  /\brelation\b/i,
  /\bconstraint\b/i,
  /\bviolates\b/i,
  /\bduplicate key\b/i,
  /\binvalid input syntax\b/i,
  /\bsql\b/i,
  /\bapp_users\b/i,
  /\bnull value\b/i,
];

function getValidationMessage(details) {
  const fieldErrors = details?.fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") return null;

  const [field, messages] = Object.entries(fieldErrors).find(([, value]) => value?.length) || [];
  if (!field) return null;

  const label = fieldLabels[field] || field;
  const firstMessage = messages[0];
  if (!firstMessage || firstMessage === "Required") return `${label} is required.`;
  return `${label}: ${firstMessage}`;
}

function isInternalMessage(message = "") {
  return internalMessagePatterns.some((pattern) => pattern.test(message));
}

function sanitizeMessage(message) {
  if (isInternalMessage(message)) return "Something went wrong. Please check your information and try again.";
  return message || "Something went wrong";
}
