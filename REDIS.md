# Redis Setup for StyleVault Log Persistence

The StyleVault demo uses Redis to persist system log events with a 7-day TTL. Events are stored in a sorted set (`stylevault:logs`) and automatically pruned on each write.

## Quick Start (Local Development)

### Option A: Install directly

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu / Debian
sudo apt update && sudo apt install redis-server -y
sudo systemctl enable redis-server --now
```

### Option B: Docker

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

Verify it's running:

```bash
redis-cli ping
# → PONG
```

Start the app:

```bash
npm run dev
```

The server connects to `redis://127.0.0.1:6379` by default. You should see `[redis] connected` in the console output.

## EC2 Deployment

### Install Redis

```bash
sudo apt update && sudo apt install redis-server -y
```

### Configure (`/etc/redis/redis.conf`)

Open the config file:

```bash
sudo nano /etc/redis/redis.conf
```

Key settings to change:

```conf
# Bind to localhost only (never expose to the internet without auth)
bind 127.0.0.1

# Set a memory ceiling so Redis doesn't consume all available RAM.
# 256MB is generous for demo log events. Adjust based on your instance size.
maxmemory 256mb

# When memory limit is reached, evict the oldest keys first.
maxmemory-policy allkeys-lru

# Enable append-only file for better crash durability.
# Default RDB snapshots can lose the last few minutes of writes on a crash.
# For a demo app, RDB alone is fine -- enable AOF only if you need tighter guarantees.
appendonly yes

# Set a password (recommended even on localhost)
requirepass your-strong-password-here
```

Apply changes:

```bash
sudo systemctl restart redis-server
```

### Verify

```bash
redis-cli -a your-strong-password-here ping
# → PONG
```

### Environment Variable

Set `REDIS_URL` so the app connects with auth:

```bash
export REDIS_URL="redis://:your-strong-password-here@127.0.0.1:6379"
```

Or add it to your `.env` file:

```
REDIS_URL=redis://:your-strong-password-here@127.0.0.1:6379
```

If `REDIS_URL` is not set, the app defaults to `redis://127.0.0.1:6379` (no auth).

## How It Works

| Operation | Redis Command | Description |
|-----------|--------------|-------------|
| Write event | `ZADD stylevault:logs <timestamp> <json>` | Scored by Unix timestamp for time-ordered retrieval |
| Prune expired | `ZREMRANGEBYSCORE stylevault:logs -inf <7-days-ago>` | Runs on every write, removes entries older than 7 days |
| Read history | `ZRANGE stylevault:logs 0 -1` | Returns all events in chronological order |
| Clear all | `DEL stylevault:logs` | Wipes the log (triggered by the Clear button on `/logs`) |

## Limitations to Be Aware Of

**Memory** -- Redis stores everything in RAM. Log events are small (a few KB each), so 7-day retention at demo traffic levels is well under 256MB. Set `maxmemory` to cap usage and prevent the instance from running out of memory.

**No redundancy** -- a single Redis instance on one EC2 means no failover. If the instance goes down, logs are unavailable until it comes back. The data on disk (RDB/AOF) survives a Redis restart but not an EBS volume loss. For production workloads, consider Redis Sentinel or AWS ElastiCache.

**Persistence gaps** -- the default RDB snapshot has a window (typically 1-5 minutes) where recent writes can be lost on a hard crash. Enabling `appendonly yes` narrows this to ~1 second. For demo logs, either mode is acceptable.

**Security** -- Redis has no encryption in transit by default. On a single EC2 where the app and Redis are co-located on localhost, this is fine. If Redis is on a separate host, use stunnel or ElastiCache with TLS.

**Disk space** -- RDB snapshots and AOF files accumulate on disk. Negligible for demo-level traffic, but worth monitoring on small EBS volumes.

## Useful Commands

```bash
# Check how many log events are stored
redis-cli ZCARD stylevault:logs

# View the 5 most recent events
redis-cli ZREVRANGE stylevault:logs 0 4

# Check Redis memory usage
redis-cli INFO memory | grep used_memory_human

# Flush all logs manually
redis-cli DEL stylevault:logs
```
