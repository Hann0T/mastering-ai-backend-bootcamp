import autocannon from 'autocannon';

const HOST = process.env.BENCH_HOST || 'http://localhost:3000';
const CONNS = Number(process.env.AUTOCANNON_CONNECTIONS || 10);
const DURATION = Number(process.env.AUTOCANNON_DURATION || 10);

function printResult(name: string, result: any) {
  console.log(`\n=== ${name} ===`);
  console.log('Requests/sec:', result.requests.average);
  console.log('Latency (avg):', result.latency.average, 'ms');
  console.log('Latency (p99):', result.latency.p99, 'ms');
  console.log('Errors:', result.errors);
}

async function runAutocannon(opts: any) {
  return await autocannon({
    connections: CONNS,
    duration: DURATION,
    ...opts,
  });
}

async function run() {
  // Login to get token for auth-protected endpoints
  const loginRes = await fetch(`${HOST}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@docuchat.dev', password: 'user123' }),
  });
  const { accessToken } = await loginRes.json();

  // 1) Health endpoint (no auth)
  const r1 = await runAutocannon({ url: `${HOST}/health` });
  printResult('GET /health', r1);

  // 2) List documents (auth)
  const r2 = await runAutocannon({
    url: `${HOST}/api/v1/documents`,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  printResult('GET /api/v1/documents', r2);

  // 3) Create document (auth) - small POST body
  const docBody = JSON.stringify({ title: 'bench doc', content: 'lorem ipsum' });
  const r3 = await runAutocannon({
    url: `${HOST}/api/v1/documents`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: docBody,
  });
  printResult('POST /api/v1/documents', r3);

  // 4) If we can get an existing document id, benchmark single doc GET
  try {
    const listRes = await fetch(`${HOST}/api/v1/documents?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await listRes.json();
    const id = json?.data?.[0]?.id;
    if (id) {
      const r4 = await runAutocannon({
        url: `${HOST}/api/v1/documents/${id}`,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      printResult(`GET /api/v1/documents/${id}`, r4);
    } else {
      console.log('No document id found to benchmark single-doc GET');
    }
  } catch (err) {
    console.warn('Could not fetch document id for single-doc benchmark', err);
  }
}

run().catch(err => {
  console.error('Benchmark failed', err);
  process.exit(1);
});
