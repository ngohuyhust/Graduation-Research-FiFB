function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.email_verified_at,
    lastLoginAt: user.last_login_at,
    fitnessGoal: user.fitness_goal,
    experienceLevel: user.experience_level,
    gender: user.gender,
    weight: user.weight ? Number(user.weight) : null,
    height: user.height ? Number(user.height) : null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

module.exports = { publicUser };
