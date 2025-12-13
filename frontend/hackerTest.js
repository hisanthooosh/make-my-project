// File: frontend/hackerTest.js
const axios = require('axios');

// 1. The Setup: "Hacker" details
const hackerPayload = {
  name: "Mr. Evil Hacker",
  email: "hacker123@test.com",
  password: "password123",
  role: "hod" // <--- The attack! Trying to register as HOD
};

console.log("---------------------------------------------------");
console.log("🕵️  STARTING SECURITY TEST: 'The HOD Block'");
console.log("---------------------------------------------------");
console.log("Attempting to register:", hackerPayload.email);
console.log("Role requested:", hackerPayload.role);
console.log("Target URL: http://localhost:5000/api/users/register");
console.log("---------------------------------------------------\n");

// 2. The Attack: Sending the data
axios.post('http://localhost:5000/api/users/register', hackerPayload)
  .then(response => {
    // ❌ FAIL SCENARIO: The server accepted it (Status 200/201)
    console.log("❌ TEST FAILED: The server created the account!");
    console.log("Server Response:", response.data);
    console.log("Action Required: Your security fix IS NOT working.");
  })
  .catch(error => {
    // ✅ PASS SCENARIO: The server rejected it (Status 403)
    if (error.response && error.response.status === 403) {
      console.log("✅ TEST PASSED: The server blocked the attack!");
      console.log("Status Code:", error.response.status, "(Forbidden)");
      console.log("Server Message:", error.response.data.message);
      console.log("Result: Your system is SECURE against HOD impersonation.");
    } else {
      // ? UNEXPECTED ERROR (Server crash, network error, etc.)
      console.log("⚠️  TEST INCONCLUSIVE: Unexpected error.");
      console.log("Error:", error.message);
      if (error.response) console.log("Status:", error.response.status);
    }
  });