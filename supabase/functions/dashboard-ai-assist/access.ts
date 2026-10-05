type RpcClient = {
  rpc(
    name: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

export async function checkDashboardAiAccess(staff: RpcClient, admin: RpcClient, userId: string) {
  const assurance = await staff.rpc("dashboard_staff_access_ready");
  if (assurance.error) return { status: 503, error: "authorization_unavailable" };
  if (assurance.data !== true) return { status: 403, error: "dashboard_second_factor_required" };
  const result = await admin.rpc("consume_edge_rate_limit", {
    _key: `dashboard-ai:${userId}`,
    _window_seconds: 60,
    _limit: 20,
  });
  if (result.error) return { status: 503, error: "rate_limit_unavailable" };
  const rate = (Array.isArray(result.data) ? result.data[0] : result.data) as {
    allowed?: boolean;
    reset_at?: string;
  } | null;
  if (!rate?.allowed) return { status: 429, error: "rate_limit_exceeded", retryAfter: 60 };
  return null;
}
