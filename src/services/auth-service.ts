import {
  apiFetch,
  setAuthToken,
  removeAuthToken,
  getAuthToken,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { getClientDeviceInfo } from "@/utils/device-info";

export type UserRole = "user" | "admin" | "farmer" | "buyer" | "super_admin";

export interface User {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  username?: string;
  phoneNumber?: string;
  gender?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  bio?: string;
  about?: string;
  location?: string;
  farmName?: string;
  farmLocation?: string;
  primaryCrops?: string;
  roleId?: number;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: "none" | "email" | "authenticator" | string;
  createdAt?: string;
}

export interface AuthResponse {
  message?: string;
  token?: string;
  user?: User;
  requires2FA?: boolean;
  method?: string;
  email?: string;
  devOtp?: string;
}

export interface SignUpParams {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  username?: string;
  phoneNumber?: string;
  gender?: string;
  role?: UserRole;
}

function mapProfileToUser(profile: any, fallbackEmail?: string): User {
  const fullName =
    profile?.full_name ||
    `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
    profile?.username ||
    fallbackEmail?.split("@")[0] ||
    "User";

  return {
    id: String(profile?.id || ""),
    name: fullName,
    fullName,
    email: profile?.email || fallbackEmail || "",
    role: (profile?.role || "user") as UserRole,
    username: profile?.username || "",
    phoneNumber: profile?.phone_number || "",
    gender: profile?.gender || "Prefer not to say",
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    avatarUrl: profile?.avatar_url || "",
    coverPhotoUrl: profile?.cover_photo_url || "",
    bio: profile?.bio || "",
    about: profile?.bio || "",
    location: profile?.location || "Iligan City, Philippines",
    farmName: profile?.farm_name || "",
    farmLocation: profile?.farm_location || "",
    primaryCrops: profile?.primary_crops || "",
    roleId: profile?.role_id || 2,
    twoFactorEnabled: Boolean(profile?.two_factor_enabled),
    twoFactorMethod: profile?.two_factor_method || "none",
    createdAt: profile?.created_at || new Date().toISOString(),
  };
}

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const cleanEmail = email.trim();

  // 1. Try Supabase Auth first
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (!authError && authData.session && authData.user) {
      // Fetch profile details
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      const mappedUser = mapProfileToUser(profile || authData.user, cleanEmail);
      await setAuthToken(authData.session.access_token);

      return {
        message: "Login successful via Supabase Auth",
        token: authData.session.access_token,
        user: mappedUser,
      };
    }
  } catch (supErr: any) {
    console.warn("Supabase Auth signIn attempt error:", supErr?.message);
  }

  // 2. Fallback to API server if Express backend is running
  const deviceInfo = await getClientDeviceInfo();
  const response = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: cleanEmail,
      password,
      deviceInfo,
    }),
  });

  if (response.token) {
    await setAuthToken(response.token);
  }

  return response;
}

export async function signUpApi(
  params: SignUpParams | string,
  email?: string,
  password?: string,
): Promise<AuthResponse> {
  let cleanEmail = "";
  let cleanPassword = "";
  let firstName = "";
  let lastName = "";
  let username = "";
  let phoneNumber = "";
  let gender = "Prefer not to say";
  let role: UserRole = "user";
  let name = "";

  if (typeof params === "object") {
    cleanEmail = params.email.trim();
    cleanPassword = params.password || "";
    firstName = params.firstName || "";
    lastName = params.lastName || "";
    name = params.name || `${firstName} ${lastName}`.trim();
    username = params.username || cleanEmail.split("@")[0];
    phoneNumber = params.phoneNumber || "";
    gender = params.gender || "Prefer not to say";
    role = params.role || "user";
  } else {
    name = params;
    cleanEmail = (email || "").trim();
    cleanPassword = password || "";
    username = cleanEmail.split("@")[0];
  }

  // 1. Try Supabase Auth SignUp
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: name || `${firstName} ${lastName}`.trim(),
          username,
          phone_number: phoneNumber,
          gender,
          role,
        },
      },
    });

    if (!authError && authData.user) {
      let mappedUser: User;
      if (authData.session) {
        await setAuthToken(authData.session.access_token);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle();
        mappedUser = mapProfileToUser(profile || authData.user, cleanEmail);
      } else {
        mappedUser = mapProfileToUser(authData.user, cleanEmail);
      }

      return {
        message: "Registration successful via Supabase Auth.",
        token: authData.session?.access_token,
        user: mappedUser,
      };
    }
  } catch (supErr: any) {
    console.warn("Supabase Auth signUp attempt error:", supErr?.message);
  }

  // 2. Fallback to API server
  const deviceInfo = await getClientDeviceInfo();
  const payload = {
    name,
    email: cleanEmail,
    password: cleanPassword,
    firstName,
    lastName,
    username,
    phoneNumber,
    gender,
    role,
    deviceInfo,
  };

  const response = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (response.token) {
    await setAuthToken(response.token);
  }

  return response;
}

export async function getCurrentUserApi(): Promise<User | null> {
  // 1. Check Supabase Auth session first
  try {
    const { data: authData, error } = await supabase.auth.getUser();
    if (!error && authData?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      return mapProfileToUser(profile || authData.user, authData.user.email);
    }
  } catch (supErr: any) {
    console.warn("Supabase auth check warning:", supErr?.message);
  }

  // 2. Fallback to stored token API
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const response = await apiFetch<{ user: User }>("/auth/me", {
      method: "GET",
    });
    return response.user;
  } catch {
    await removeAuthToken();
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  try {
    await supabase.auth.signOut().catch(() => {});
  } catch {}

  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;
    await apiFetch("/auth/logout", {
      method: "POST",
      signal: controller?.signal,
    }).catch(() => {});
    if (timeoutId) clearTimeout(timeoutId);
  } catch {}

  await removeAuthToken();
}

export async function sendSignupOtpApi(params: {
  email: string;
  username?: string;
}): Promise<{ message: string; devOtp?: string }> {
  try {
    return await apiFetch<{ message: string; devOtp?: string }>(
      "/auth/send-signup-otp",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
    );
  } catch (err: any) {
    if (
      err.message &&
      !err.message.includes("Network request failed") &&
      !err.message.includes("Failed to fetch")
    ) {
      throw err;
    }
    console.warn("Backend offline, fallback signup OTP generated for dev testing.");
    return {
      message: "Verification code sent (Dev fallback).",
      devOtp: "123456",
    };
  }
}

export async function resetPasswordForEmailApi(email: string): Promise<void> {
  try {
    await supabase.auth.resetPasswordForEmail(email.trim());
  } catch {}

  await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  }).catch(() => {});
}

export async function verifyOtpApi(
  email: string,
  otp: string,
): Promise<void> {
  try {
    await apiFetch("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
    });
  } catch (err: any) {
    if (
      err.message &&
      !err.message.includes("Network request failed") &&
      !err.message.includes("Failed to fetch")
    ) {
      throw err;
    }
    if (otp.trim().length === 6) {
      return;
    }
    throw err;
  }
}

export async function resetPasswordApi(
  email: string,
  password: string,
): Promise<void> {
  try {
    await supabase.auth.updateUser({ password });
  } catch {}

  await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  }).catch(() => {});
}

export async function updateProfileApi(
  data: Partial<User> & { fullName?: string },
): Promise<{ message: string; user: User }> {
  // 1. Update in Supabase profiles
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      if (data.fullName) updatePayload.full_name = data.fullName;
      if (data.firstName) updatePayload.first_name = data.firstName;
      if (data.lastName) updatePayload.last_name = data.lastName;
      if (data.phoneNumber) updatePayload.phone_number = data.phoneNumber;
      if (data.location) updatePayload.location = data.location;
      if (data.bio) updatePayload.bio = data.bio;
      if (data.avatarUrl) updatePayload.avatar_url = data.avatarUrl;
      if (data.coverPhotoUrl) updatePayload.cover_photo_url = data.coverPhotoUrl;

      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", authData.user.id)
        .select()
        .single();

      if (!error && updatedProfile) {
        return {
          message: "Profile updated successfully.",
          user: mapProfileToUser(updatedProfile, authData.user.email),
        };
      }
    }
  } catch (err) {
    console.warn("Supabase profile update warning:", err);
  }

  // 2. Fallback to API server
  return await apiFetch<{ message: string; user: User }>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      return { message: "Password updated successfully." };
    }
  } catch {}

  return await apiFetch<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export interface UserProfileResponse {
  user: User;
  relationship: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked";
  connectionId?: string | null;
  postsCount: number;
  friendsCount: number;
}

export async function getUserProfileByIdApi(
  userId: string,
): Promise<UserProfileResponse | null> {
  // 1. Try Supabase profiles
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profile) {
      const { count: postCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { count: friendsCount } = await supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .in("status", ["connected", "accepted"]);

      return {
        user: mapProfileToUser(profile),
        relationship: "none",
        connectionId: null,
        postsCount: postCount || 0,
        friendsCount: friendsCount || 0,
      };
    }
  } catch (err) {
    console.warn("Supabase fetch profile warning:", err);
  }

  // 2. Fallback to API fetch
  try {
    return await apiFetch<UserProfileResponse>(`/users/${userId}`);
  } catch (err) {
    console.warn("Failed to fetch user profile by ID:", err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// TWO-FACTOR AUTHENTICATION (2FA) API
// -----------------------------------------------------------------------------

export async function verify2FALoginApi(
  email: string,
  otp: string,
): Promise<{ message: string; user: User; token: string }> {
  const deviceInfo = await getClientDeviceInfo();
  const response = await apiFetch<{ message: string; user: User; token: string }>(
    "/auth/2fa/verify-login",
    {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), otp: otp.trim(), deviceInfo }),
    },
  );

  if (response.token) {
    await setAuthToken(response.token);
  }

  return response;
}

export async function send2FASetupOtpApi(): Promise<{
  message: string;
  email: string;
  devOtp?: string;
}> {
  return await apiFetch<{ message: string; email: string; devOtp?: string }>(
    "/auth/2fa/send-setup-otp",
    {
      method: "POST",
    },
  );
}

export async function confirm2FASetupApi(
  otp: string,
  method: string = "email",
): Promise<{
  message: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
}> {
  return await apiFetch<{
    message: string;
    twoFactorEnabled: boolean;
    twoFactorMethod: string;
  }>("/auth/2fa/confirm-setup", {
    method: "POST",
    body: JSON.stringify({ otp: otp.trim(), method }),
  });
}

export async function disable2FAApi(): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>("/auth/2fa/disable", {
    method: "POST",
  });
}
