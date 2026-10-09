export async function amazonAction<T>(
  action: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`/api/admin/amazon/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ error: "Request failed" }));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}
