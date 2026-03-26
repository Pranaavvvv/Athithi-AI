const http = require('http');

const baseURL = 'http://localhost:5555';

async function fetchJson(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5555,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(responseData) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: responseData });
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.write(data);
      req.end();
  });
}

async function runTests() {
  console.log("--- STARTING TESTS ---");
  const rand = Math.floor(Math.random() * 1000000);
  const email = `testuser${rand}@example.com`;
  const phone = `+1${rand}000`;
  const password = `securepass${rand}`;

  try {
    console.log(`\nTesting Registration with email: ${email}, phone: ${phone}`);
    const regRes = await fetchJson('POST', '/users/register', { email, phone, password });
    console.log(`Status: ${regRes.statusCode}`);
    console.log(`Response:`, regRes.body);

    if (regRes.statusCode !== 201) throw new Error("Registration failed");

    console.log(`\nTesting Login with email: ${email}`);
    const loginEmailRes = await fetchJson('POST', '/users/login', { email, password });
    console.log(`Status: ${loginEmailRes.statusCode}`);
    console.log(`Response:`, loginEmailRes.body);
    
    if (loginEmailRes.statusCode !== 200) throw new Error("Login with email failed");

    console.log(`\nTesting Login with phone: ${phone}`);
    const loginPhoneRes = await fetchJson('POST', '/users/login', { phone, password });
    console.log(`Status: ${loginPhoneRes.statusCode}`);
    console.log(`Response:`, loginPhoneRes.body);

    if (loginPhoneRes.statusCode !== 200) throw new Error("Login with phone failed");

    console.log("\n--- ALL TESTS PASSED SUCCESSFULLY ---");

  } catch (error) {
    console.error("\nTEST FAILED:", error.message || error);
    process.exit(1);
  }
}

runTests();
