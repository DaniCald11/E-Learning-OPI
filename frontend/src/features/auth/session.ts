import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
export interface Profile {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  bio?: string | null;
  avatarUrl?: string | null;
}
export const sessionKey = ["session"];
export async function fetchProfile(): Promise<Profile | null> {
  try {
    return (await api.get<Profile>("/users/me")).data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401)
      return null;
    throw error;
  }
}
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: fetchProfile,
    retry: false,
  });
}
export function landing(profile: Profile) {
  return profile.roles.includes("Admin") ? "/admin" : "/alumno/dashboard";
}
