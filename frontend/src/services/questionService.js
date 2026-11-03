
import api from "./api";

export async function getQuestions({
  page = 1,
  limit = 20,
  exam,
  section,
  subject,
  topic,
  difficulty,
} = {}) {
  // Only send filters that are actually set ("all" means no filter)
  const params = { page, limit };
  const filters = { exam, section, subject, topic, difficulty };

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") params[key] = value;
  });

  const response = await api.get("/questions", { params });
  const body = response.data;

  // Backend shape: { success, data: { questions, ...pagination info } }
  const data = body?.data ?? body;

  const questions = Array.isArray(data)
    ? data
    : data?.questions ?? data?.items ?? [];

  // Pagination info may be nested (data.pagination) or sit directly on data
  const meta = data?.pagination ?? data?.meta ?? data ?? {};

  const total = Number(
    meta.total ?? meta.totalCount ?? meta.totalItems ?? questions.length
  );
  const pageLimit = Number(meta.limit ?? limit);
  const totalPages = Number(
    meta.totalPages ?? meta.pages ?? Math.max(1, Math.ceil(total / pageLimit))
  );

  return {
    questions,
    pagination: {
      page: Number(meta.page ?? page),
      limit: pageLimit,
      total,
      totalPages: Math.max(1, totalPages),
    },
  };
}

// For screens that need EVERY question (e.g. picking questions for a mock
// test). Walks through all pages of the paginated endpoint and returns
// one flat array, so callers don't need to know about pagination.
export async function getAllQuestions(filters = {}) {
  const PAGE_LIMIT = 100; // backend maximum
  const MAX_PAGES = 100; // safety stop so a bug can never loop forever

  const first = await getQuestions({ ...filters, page: 1, limit: PAGE_LIMIT });
  const all = [...first.questions];
  const totalPages = Math.min(first.pagination.totalPages, MAX_PAGES);

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await getQuestions({ ...filters, page, limit: PAGE_LIMIT });
    all.push(...next.questions);
  }

  return all;
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