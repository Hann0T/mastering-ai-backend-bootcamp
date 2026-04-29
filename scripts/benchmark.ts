import autocannon from 'autocannon';

async function run() {
  // First, login to get a token
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@docuchat.dev',
      password: 'user123',
    }),
  });
  const { accessToken } = await loginRes.json();

  console.log('\n=== Benchmarking GET /api/v1/documents ===\n');

  const result = await autocannon({
    url: 'http://localhost:3000/api/v1/documents',
    connections: 10,   // 10 concurrent connections
    duration: 10,       // Run for 10 seconds
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  console.log('Requests/sec:', result.requests.average);
  console.log('Latency (avg):', result.latency.average, 'ms');
  console.log('Latency (p99):', result.latency.p99, 'ms');
  console.log('Errors:', result.errors);
}

run();
