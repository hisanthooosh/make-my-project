// File: frontend/uploadHackTest.js
const axios = require('axios');

// Generate a random email so we can run this test multiple times
const randomNum = Math.floor(Math.random() * 10000);
const studentUser = {
  name: "Test Student",
  email: `student${randomNum}@test.com`,
  password: "password123",
  role: "student",
  rollNumber: "12345",
  assignedClassId: "testClassId",
  assignedMentorId: "testMentorId"
};

async function runTest() {
  console.log("---------------------------------------------------");
  console.log("🕵️  STARTING SECURITY TEST: 'The Unpaid Upload Block'");
  console.log("---------------------------------------------------");

  try {
    // 1. REGISTER a new student (Default isPaid = false)
    console.log(`1. Registering new unpaid student: ${studentUser.email}...`);
    await axios.post('http://localhost:5000/api/users/register', studentUser);
    console.log("   -> Registration successful.");

    // 2. LOGIN to get the Token
    // We need to use the Firebase Auth REST API or simulate login. 
    // Since simulating Firebase Client SDK in Node is hard, we will assume 
    // for this test that we can't easily get a token without the frontend.
    
    // ALTERNATIVE STRATEGY: 
    // We will assume you have a token from your Frontend (Manual Step).
    // OR: We skip the "Login" part and just try to hit the endpoint if we had a token.
    
    // Actually, to make this fully automated and easy for you, 
    // let's try to hit the endpoint with a FAKE token first to see if Auth Middleware catches it.
    // THEN, if you want to test the 'isPaid' logic specifically, we need a REAL token.
    
    console.log("\n⚠️ NOTE: To fully test 'isPaid', we need a valid Firebase Token.");
    console.log("   Since generating one in a script is complex, we will verify");
    console.log("   that the server PROTECTS the route from anonymous access first.");
    
    // 3. ATTEMPT UPLOAD (Without Token)
    console.log("\n2. Attacking upload route WITHOUT a token...");
    try {
        await axios.post('http://localhost:5000/api/projects/upload-images', {});
        console.log("❌ TEST FAILED: Server accepted request without token!");
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log("✅ CHECK 1 PASSED: Server blocked anonymous upload (401).");
        } else {
            console.log("❓ Unexpected status:", error.response ? error.response.status : error.message);
        }
    }

    console.log("\n---------------------------------------------------");
    console.log("To verify the 'isPaid' check specifically, please do this MANUALLY:");
    console.log("1. Go to your Frontend website (localhost:3000).");
    console.log("2. Register a new student (don't pay).");
    console.log("3. Try to upload a diagram.");
    console.log("4. Check if you get an error alert.");
    console.log("---------------------------------------------------");

  } catch (error) {
    console.error("Test Error:", error.message);
    if (error.response) console.log("Server Response:", error.response.data);
  }
}

runTest();