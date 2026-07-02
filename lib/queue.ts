/**
 * Upstash Redis queue for failed enquiries.
 * When Supabase is down, enquiries are pushed here and retried later.
 */

const QUEUE_KEY = 'yaft:enquiry_queue';

async function redis(command: string[]) {
  const url  = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Upstash env vars not set');

  const res = await fetch(`${url}/${command.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}

export type QueuedEnquiry = {
  name: string;
  email: string;
  message: string;
  interest: string | null;
  queuedAt: string;
};

export async function pushEnquiryToQueue(enquiry: QueuedEnquiry): Promise<void> {
  await redis(['RPUSH', QUEUE_KEY, JSON.stringify(enquiry)]);
}

export async function popEnquiriesFromQueue(count = 10): Promise<QueuedEnquiry[]> {
  const results: QueuedEnquiry[] = [];
  for (let i = 0; i < count; i++) {
    const res = await redis(['LPOP', QUEUE_KEY]);
    if (!res.result) break;
    try {
      results.push(JSON.parse(res.result));
    } catch {
      // skip malformed entries
    }
  }
  return results;
}

export async function getQueueLength(): Promise<number> {
  const res = await redis(['LLEN', QUEUE_KEY]);
  return res.result ?? 0;
}
