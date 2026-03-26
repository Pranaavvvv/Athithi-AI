const axios = require('axios');

async function runMock() {
  console.log("🚀 Firing Mock [generate_quote] tool call...");
  try {
    const res1 = await axios.post('http://localhost:5555/vapi/tools', {
      message: {
        type: "tool-calls",
        toolWithToolCallList: [
          {
            toolCall: {
              id: "mock_quote_123",
              type: "function",
              function: {
                name: "generate_quote",
                arguments: JSON.stringify({
                  package_name: "Elite",
                  guests: 350,
                  hall: "Grand Crystal Ballroom"
                })
              }
            }
          }
        ]
      }
    });
    console.log("✅ Quote Success!", res1.data);
  } catch (err) {
    console.error("❌ Quote Failed:", err.response ? err.response.data : err.message);
  }

  // Wait 4 seconds so the user can see the drawer
  console.log("⏳ Waiting 4 seconds before mock booking...");
  await new Promise(resolve => setTimeout(resolve, 4000));

  console.log("🚀 Firing Mock [create_booking] tool call...");
  try {
    const res2 = await axios.post('http://localhost:5555/vapi/tools', {
      message: {
        type: "tool-calls",
        toolWithToolCallList: [
          {
            toolCall: {
              id: "mock_book_456",
              type: "function",
              function: {
                name: "create_booking",
                arguments: JSON.stringify({
                  event_name: "Sharma Mega Reception",
                  event_type: "wedding",
                  date: "2026-11-20",
                  guest_count: 350,
                  package_name: "Elite",
                  client_phone: "+919876543210",
                  client_name: "Rohan Sharma"
                })
              }
            }
          }
        ]
      }
    });
    console.log("✅ Booking Success!", res2.data);
  } catch (err) {
    console.error("❌ Booking Failed:", err.response ? err.response.data : err.message);
  }
}

runMock();
