import api from "./api";

function unwrap(response) {
  const body = response.data;
  return body?.data ?? body;
}

export async function getMockTests() {
  const data = unwrap(await api.get("/mock-tests"));
  const tests = data?.mockTests ?? data?.tests ?? data;
  return Array.isArray(tests) ? tests : [];
}

export async function getMockTestById(id) {
  const data = unwrap(await api.get(`/mock-tests/${id}`));
  return data?.mockTest ?? data?.test ?? data;
}

export async function createMockTest(payload) {
  return unwrap(await api.post("/mock-tests", payload));
}

export async function startMockTestAttempt(testId) {
  const data = unwrap(
    await api.post(`/mock-tests/${testId}/attempts`)
  );

  return data?.attempt ?? data;
}

export async function deleteMockTest(testId) {
  const response = await api.delete(`/mock-tests/${testId}`);
  return response.data;
}


export async function getAllMockTestResults({
  status = "completed",
  page = 1,
  limit = 10,
} = {}) {
  const response = await api.get("/results/all-mockTest-results", {
    params: { status, page, limit },
  });

  return response.data;
}
