// Atomic storage scripts (hosting-free-1). Each runs as ONE Lua script on Redis/Upstash, so checking and reserving
// capacity, or checking a cancellation and saving, cannot interleave with another request on any instance.
// Each Lua script has a JavaScript twin that mirrors it line by line for the in-process backend (MemoryKv).
// tests/kv-contract.test.ts runs the same cases against both, including against a real Redis-compatible server.

type Call = (...a: (string | number)[]) => unknown;
export type Twin = (call: Call, keys: string[], argv: string[]) => unknown;
const num = (v: unknown) => Number(v ?? 0) || 0;

/**
 * Live-review admission, optionally together with the save capacity it will need: check every limit, then reserve all
 * of them, or nothing. One script, so a refused review consumes neither review allowance nor saving quota, and the two
 * admissions cannot race (hosting-free-1 fix: before, save capacity was reserved first and kept when the review was
 * refused).
 * KEYS 1-5: judge-session hour counter, IP day counter, global day counter, global total counter, lease sorted set.
 * KEYS 6-11 (only when saving): the six ADMIT_WRITE keys for kind "version".
 * ARGV 1-10: now (ms), lease member (visitor:request), lease expiry (ms), max per judge hour, max per IP day,
 *       max per day, max total, max in flight, hour TTL (s), day TTL (s).
 * ARGV 11-19 (only when saving): the nine ADMIT_WRITE arguments.
 * Returns 0 (admitted) or the first limit reached: 1 judge hour, 2 IP day, 3 global day, 4 total, 5 in flight,
 * 6 this request already holds a lease (a duplicate execution), 11-16 the ADMIT_WRITE codes 1-6.
 * Concurrency uses one expiring lease per request (sorted-set member scored by its expiry), never a shared counter.
 */
export const ADMIT_REVIEW = `
redis.call('ZREMRANGEBYSCORE', KEYS[5], '-inf', ARGV[1])
local function n(k) return tonumber(redis.call('GET', k) or '0') end
if redis.call('ZSCORE', KEYS[5], ARGV[2]) then return 6 end
if n(KEYS[1]) >= tonumber(ARGV[4]) then return 1 end
if n(KEYS[2]) >= tonumber(ARGV[5]) then return 2 end
if n(KEYS[3]) >= tonumber(ARGV[6]) then return 3 end
if n(KEYS[4]) >= tonumber(ARGV[7]) then return 4 end
if redis.call('ZCARD', KEYS[5]) >= tonumber(ARGV[8]) then return 5 end
local w = #KEYS > 5
local b = 0
if w then
  b = tonumber(ARGV[11])
  if n(KEYS[6]) + 1 > tonumber(ARGV[12]) then return 11 end
  if n(KEYS[7]) + b > tonumber(ARGV[13]) then return 12 end
  if n(KEYS[8]) + 1 > tonumber(ARGV[14]) then return 13 end
  if n(KEYS[9]) + 1 > tonumber(ARGV[15]) then return 14 end
  if n(KEYS[10]) + 1 > tonumber(ARGV[16]) then return 15 end
  if n(KEYS[11]) + b > tonumber(ARGV[17]) then return 16 end
end
redis.call('INCR', KEYS[1]) redis.call('EXPIRE', KEYS[1], ARGV[9])
redis.call('INCR', KEYS[2]) redis.call('EXPIRE', KEYS[2], ARGV[10])
redis.call('INCR', KEYS[3]) redis.call('EXPIRE', KEYS[3], ARGV[10])
redis.call('INCR', KEYS[4])
redis.call('ZADD', KEYS[5], ARGV[3], ARGV[2])
if w then
  redis.call('INCR', KEYS[6]) redis.call('EXPIRE', KEYS[6], ARGV[18])
  redis.call('INCRBY', KEYS[7], b) redis.call('EXPIRE', KEYS[7], ARGV[18])
  redis.call('INCR', KEYS[8]) redis.call('EXPIRE', KEYS[8], ARGV[19])
  redis.call('INCR', KEYS[9]) redis.call('EXPIRE', KEYS[9], ARGV[19])
  redis.call('INCR', KEYS[10])
  redis.call('INCRBY', KEYS[11], b)
end
return 0`;
const admitReview: Twin = (call, K, A) => {
  call("ZREMRANGEBYSCORE", K[4], "-inf", A[0]);
  const n = (k: string) => num(call("GET", k));
  if (call("ZSCORE", K[4], A[1]) !== null) return 6;
  if (n(K[0]) >= num(A[3])) return 1;
  if (n(K[1]) >= num(A[4])) return 2;
  if (n(K[2]) >= num(A[5])) return 3;
  if (n(K[3]) >= num(A[6])) return 4;
  if (num(call("ZCARD", K[4])) >= num(A[7])) return 5;
  const w = K.length > 5;
  let b = 0;
  if (w) {
    b = num(A[10]);
    if (n(K[5]) + 1 > num(A[11])) return 11;
    if (n(K[6]) + b > num(A[12])) return 12;
    if (n(K[7]) + 1 > num(A[13])) return 13;
    if (n(K[8]) + 1 > num(A[14])) return 14;
    if (n(K[9]) + 1 > num(A[15])) return 15;
    if (n(K[10]) + b > num(A[16])) return 16;
  }
  call("INCR", K[0]); call("EXPIRE", K[0], A[8]);
  call("INCR", K[1]); call("EXPIRE", K[1], A[9]);
  call("INCR", K[2]); call("EXPIRE", K[2], A[9]);
  call("INCR", K[3]);
  call("ZADD", K[4], A[2], A[1]);
  if (w) {
    call("INCR", K[5]); call("EXPIRE", K[5], A[17]);
    call("INCRBY", K[6], b); call("EXPIRE", K[6], A[17]);
    call("INCR", K[7]); call("EXPIRE", K[7], A[18]);
    call("INCR", K[8]); call("EXPIRE", K[8], A[18]);
    call("INCR", K[9]);
    call("INCRBY", K[10], b);
  }
  return 0;
};

/**
 * Storage-write admission: check every record and byte limit, then reserve all of them, or nothing.
 * KEYS: visitor count (this kind), visitor bytes, IP day count (this kind), global day count (this kind),
 *       global total count (this kind), global bytes ever written.
 * ARGV: bytes, max visitor count, max visitor bytes, max IP day, max global day, max global total, max global bytes,
 *       visitor TTL (s; renewed with the visitor's data), day TTL (s).
 * Returns 0 or the first limit reached: 1 visitor count, 2 visitor bytes, 3 IP day, 4 global day, 5 global total,
 * 6 global bytes.
 */
export const ADMIT_WRITE = `
local b = tonumber(ARGV[1])
local function n(k) return tonumber(redis.call('GET', k) or '0') end
if n(KEYS[1]) + 1 > tonumber(ARGV[2]) then return 1 end
if n(KEYS[2]) + b > tonumber(ARGV[3]) then return 2 end
if n(KEYS[3]) + 1 > tonumber(ARGV[4]) then return 3 end
if n(KEYS[4]) + 1 > tonumber(ARGV[5]) then return 4 end
if n(KEYS[5]) + 1 > tonumber(ARGV[6]) then return 5 end
if n(KEYS[6]) + b > tonumber(ARGV[7]) then return 6 end
redis.call('INCR', KEYS[1]) redis.call('EXPIRE', KEYS[1], ARGV[8])
redis.call('INCRBY', KEYS[2], b) redis.call('EXPIRE', KEYS[2], ARGV[8])
redis.call('INCR', KEYS[3]) redis.call('EXPIRE', KEYS[3], ARGV[9])
redis.call('INCR', KEYS[4]) redis.call('EXPIRE', KEYS[4], ARGV[9])
redis.call('INCR', KEYS[5])
redis.call('INCRBY', KEYS[6], b)
return 0`;
const admitWrite: Twin = (call, K, A) => {
  const b = num(A[0]);
  const n = (k: string) => num(call("GET", k));
  if (n(K[0]) + 1 > num(A[1])) return 1;
  if (n(K[1]) + b > num(A[2])) return 2;
  if (n(K[2]) + 1 > num(A[3])) return 3;
  if (n(K[3]) + 1 > num(A[4])) return 4;
  if (n(K[4]) + 1 > num(A[5])) return 5;
  if (n(K[5]) + b > num(A[6])) return 6;
  call("INCR", K[0]); call("EXPIRE", K[0], A[7]);
  call("INCRBY", K[1], b); call("EXPIRE", K[1], A[7]);
  call("INCR", K[2]); call("EXPIRE", K[2], A[8]);
  call("INCR", K[3]); call("EXPIRE", K[3], A[8]);
  call("INCR", K[4]);
  call("INCRBY", K[5], b);
  return 0;
};

/**
 * Save a review version unless its request was cancelled (on any instance) or already saved once. Version numbers come
 * from HINCRBY, so concurrent saves never reuse or lose a number. Bytes beyond the size reserved at admission are
 * checked against the visitor and global byte limits and reserved in the same script, so neither limit is exceeded.
 * KEYS: visitor hash, cancel marker, saved marker, visitor byte counter, global byte counter.
 * ARGV: case id, version JSON, summary JSON, visitor TTL, marker TTL, review id, finding ids JSON (the index used to
 *       validate officer decisions without downloading the version), extra bytes, max visitor bytes, max global bytes.
 * Returns the new version number; -1 cancelled first; -2 this request already saved (duplicate execution);
 * -3 the extra bytes would exceed a byte limit (nothing saved).
 */
export const SAVE_VERSION = `
if redis.call('EXISTS', KEYS[2]) == 1 then return -1 end
if redis.call('EXISTS', KEYS[3]) == 1 then return -2 end
local x = tonumber(ARGV[8])
if x > 0 then
  if tonumber(redis.call('GET', KEYS[4]) or '0') + x > tonumber(ARGV[9]) then return -3 end
  if tonumber(redis.call('GET', KEYS[5]) or '0') + x > tonumber(ARGV[10]) then return -3 end
  redis.call('INCRBY', KEYS[4], x) redis.call('EXPIRE', KEYS[4], ARGV[4])
  redis.call('INCRBY', KEYS[5], x)
end
local n = redis.call('HINCRBY', KEYS[1], 'n:' .. ARGV[1], 1)
redis.call('HSET', KEYS[1], 'ver:' .. ARGV[1] .. ':' .. n, ARGV[2], 'sum:' .. ARGV[1], ARGV[3], 'rev:' .. ARGV[1] .. ':' .. ARGV[6], ARGV[7])
redis.call('EXPIRE', KEYS[1], ARGV[4])
redis.call('SET', KEYS[3], n, 'EX', ARGV[5])
return n`;
const saveVersion: Twin = (call, K, A) => {
  if (num(call("EXISTS", K[1])) === 1) return -1;
  if (num(call("EXISTS", K[2])) === 1) return -2;
  const x = num(A[7]);
  if (x > 0) {
    if (num(call("GET", K[3])) + x > num(A[8])) return -3;
    if (num(call("GET", K[4])) + x > num(A[9])) return -3;
    call("INCRBY", K[3], x); call("EXPIRE", K[3], A[3]);
    call("INCRBY", K[4], x);
  }
  const n = num(call("HINCRBY", K[0], "n:" + A[0], 1));
  call("HSET", K[0], "ver:" + A[0] + ":" + n, A[1], "sum:" + A[0], A[2], "rev:" + A[0] + ":" + A[5], A[6]);
  call("EXPIRE", K[0], A[3]);
  call("SET", K[2], n, "EX", A[4]);
  return n;
};

/**
 * Claim a request id for one execution (hosting-free-1 fix: a second execution of a claimed, running or completed id
 * is refused). req:{id} holds "<visitor>|run" (claimed by an execution) or "<visitor>|pre" (claimed by a cancel that
 * arrived before the request started). Visitor ids never contain "|".
 * KEYS: request state.  ARGV: visitor id, state TTL (s).
 * Returns "claimed", "cancelled" (this visitor cancelled it before it started), or "conflict".
 */
export const CLAIM_REQUEST = `
local cur = redis.call('GET', KEYS[1])
if not cur then redis.call('SET', KEYS[1], ARGV[1] .. '|run', 'EX', ARGV[2]) return 'claimed' end
if cur == ARGV[1] .. '|pre' then redis.call('SET', KEYS[1], ARGV[1] .. '|done', 'EX', ARGV[2]) return 'cancelled' end
return 'conflict'`;
const claimRequest: Twin = (call, K, A) => {
  const cur = call("GET", K[0]) as string | null;
  if (cur === null || cur === undefined) { call("SET", K[0], A[0] + "|run", "EX", A[1]); return "claimed"; }
  if (cur === A[0] + "|pre") { call("SET", K[0], A[0] + "|done", "EX", A[1]); return "cancelled"; }
  return "conflict";
};

/**
 * Cancel a review request, only for the visitor that owns it. A cancel that arrives before the request started claims
 * the (random, unguessable) id for this visitor, so the request, when it claims the id, finds itself cancelled.
 * KEYS: request state, cancel marker, saved marker.  ARGV: visitor id, marker TTL.
 * Returns ["unknown"] (another visitor's request), ["saved", version], or ["cancelled"].
 */
export const CANCEL_REQUEST = `
local cur = redis.call('GET', KEYS[1])
if not cur then
  redis.call('SET', KEYS[1], ARGV[1] .. '|pre', 'EX', ARGV[2])
  redis.call('SET', KEYS[2], '1', 'EX', ARGV[2])
  return {'cancelled'}
end
local owner = string.match(cur, '^(.*)|')
if owner ~= ARGV[1] then return {'unknown'} end
local saved = redis.call('GET', KEYS[3])
if saved then return {'saved', saved} end
redis.call('SET', KEYS[2], '1', 'EX', ARGV[2])
return {'cancelled'}`;
const cancelRequest: Twin = (call, K, A) => {
  const cur = call("GET", K[0]) as string | null;
  if (cur === null || cur === undefined) { call("SET", K[0], A[0] + "|pre", "EX", A[1]); call("SET", K[1], "1", "EX", A[1]); return ["cancelled"]; }
  const i = cur.lastIndexOf("|");
  if ((i >= 0 ? cur.slice(0, i) : null) !== A[0]) return ["unknown"];
  const saved = call("GET", K[2]);
  if (saved !== null && saved !== undefined) return ["saved", String(saved)];
  call("SET", K[1], "1", "EX", A[1]);
  return ["cancelled"];
};

export const SCRIPT_TWINS = new Map<string, Twin>([
  [ADMIT_REVIEW, admitReview],
  [ADMIT_WRITE, admitWrite],
  [SAVE_VERSION, saveVersion],
  [CLAIM_REQUEST, claimRequest],
  [CANCEL_REQUEST, cancelRequest],
]);
