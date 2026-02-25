import Cookies from "js-cookie";
import { User, AuthToken } from "@/types";

export const setAuth = (token: AuthToken) => {
  Cookies.set("token", token.access_token, { expires: 1 });
  Cookies.set("user", JSON.stringify(token.user), { expires: 1 });
};

export const clearAuth = () => {
  Cookies.remove("token");
  Cookies.remove("user");
};

export const getToken = (): string | undefined => Cookies.get("token");

export const getUser = (): User | null => {
  const userStr = Cookies.get("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
};

export const isAdmin = (): boolean => getUser()?.role === "admin";
export const isResearcher = (): boolean => getUser()?.role === "researcher";
export const isAdminOrResearcher = (): boolean =>
  ["admin", "researcher"].includes(getUser()?.role || "");
