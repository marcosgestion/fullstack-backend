import fetch from "node-fetch";

const BASE_URL = process.env.BASE_URL || "http://localhost:3080";
const EMAIL = process.env.TEST_EMAIL || "usuario@example.com";
const PASSWORD = process.env.TEST_PASSWORD || "123456";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const testLogin = async () => {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(text);
  } catch (error) {
    console.error("Error al probar login:", error.message);
  }
};

const testRateLimit = async (times = 110) => {
  console.log(`\nProbando rate limit con ${times} requests...`);
  for (let i = 1; i <= times; i++) {
    try {
      const response = await fetch(`${BASE_URL}/users`);
      npm;
      console.log(`Request ${i} -> ${response.status}`);
    } catch (error) {
      console.error(`Request ${i} falló:`, error.message);
    }
  }
};

const run = async () => {
  console.log("Probando seguridad...");
  await testLogin();
  await delay(1000);
  await testRateLimit();
};

run();