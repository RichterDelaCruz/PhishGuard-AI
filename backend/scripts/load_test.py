import asyncio
import httpx
import statistics
import time
import os

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")
N = int(os.getenv("N", "75"))
CONCURRENCY = int(os.getenv("CONCURRENCY", "10"))

SAMPLE = {
    "content": "Please verify your account password at http://example.com/login to avoid suspension.",
    "type": "email",
}


async def worker(client: httpx.AsyncClient, latencies: list[float]):
    for _ in range(N // CONCURRENCY):
        t0 = time.perf_counter()
        r = await client.post(f"{BASE_URL}/api/analyze", json=SAMPLE, timeout=10)
        r.raise_for_status()
        dt = (time.perf_counter() - t0) * 1000
        latencies.append(dt)


async def main():
    async with httpx.AsyncClient() as client:
        latencies: list[float] = []
        tasks = [
            asyncio.create_task(worker(client, latencies)) for _ in range(CONCURRENCY)
        ]
        await asyncio.gather(*tasks)
    p50 = statistics.quantiles(latencies, n=100)[49]
    p95 = statistics.quantiles(latencies, n=100)[94]
    print(
        {
            "n": len(latencies),
            "p50_ms": round(p50, 2),
            "p95_ms": round(p95, 2),
            "min_ms": round(min(latencies), 2),
            "max_ms": round(max(latencies), 2),
        }
    )


if __name__ == "__main__":
    asyncio.run(main())
