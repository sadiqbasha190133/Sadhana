
import api from "./api";

export async function signUp({ name, email, password }) {
  const response = await api.post("/auth/signup", {
    name,
    email,
    password,
  });

  return response.data;
}

export async function signIn({ email, password }) {
  const response = await api.post("/auth/signin", {
    email,
    password,
  });

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data;
}
