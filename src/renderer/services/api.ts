export function unwrap<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) throw new Error(response.error || 'Unknown error');
  return response.data!;
}
