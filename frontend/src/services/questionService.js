
import api from "./api";

export async function getQuestions() {
  const response = await api.get("/questions");
  const body = response.data;

  // Support the documented success/data envelope and direct arrays.
  const questions =
    body?.data?.questions ??
    body?.questions ??
    body?.data ??
    body;

  return Array.isArray(questions) ? questions : [];
}

export async function getQuestionById(id) {
  const response = await api.get(`/questions/${id}`);
  const body = response.data;

  return body?.data?.question ?? body?.question ?? body?.data ?? body;
}

export async function importQuestions(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/questions/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function deleteQuestion(id) {
  const response = await api.delete(`/questions/${id}`);
  return response.data;
}
