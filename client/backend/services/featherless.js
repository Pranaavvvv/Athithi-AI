const axios = require('axios');

const FEATHERLESS_API_KEY = process.env.FEATHERLESS_API_KEY || "";
const FEATHERLESS_BASE_URL = process.env.FEATHERLESS_BASE_URL || "https://api.featherless.ai/v1";
const FEATHERLESS_MODEL = process.env.FEATHERLESS_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct";

/**
 * Sends a generic chat completion request to Featherless.ai using axios.
 */
async function callFeatherless(systemPrompt, userPrompt, maxTokens = 500) {
    if (!FEATHERLESS_API_KEY) {
        console.warn("Featherless API Key is missing. Returning fallback response.");
        return null;
    }

    try {
        const response = await axios.post(
            `${FEATHERLESS_BASE_URL}/chat/completions`,
            {
                model: FEATHERLESS_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: maxTokens,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${FEATHERLESS_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Featherless AI call failed:", error.response?.data || error.message);
        throw new Error("AI analysis failed.");
    }
}

/**
 * Service A: The Efficiency Pilot.
 * Ranks vendors based on their Operational Friction Score.
 * 
 * @param {Array} vendors - Array of vendor objects from DB (id, name, reliability, price)
 * @param {Number} budget - The budget allocated for this category
 * @returns {Array} - The ranked array of vendors with AI reasoning attached.
 */
async function calculateOperationalFriction(vendors, budget) {
    if (!vendors || vendors.length === 0) return [];
    
    const systemPrompt = `You are the 'Efficiency Pilot' AI for a banquet management platform. 
Your objective is to rank the provided vendors according to their 'Operational Friction Score'.
Lower friction is better. A vendor with high reliability but slightly higher price often has less friction than an unreliable cheap vendor.
If a vendor exceeds the provided category budget, note it heavily in the friction score but do not eliminate them entirely.
Respond with a strict JSON array of objects. Format:
[
  {
    "id": "vendor-uuid",
    "friction_score": number (1-10, lower is better),
    "reasoning": "1 sentence explanation"
  }
]
IMPORTANT: Return ONLY valid JSON, do not wrap in markdown or backticks.`;

    const vendorContext = vendors.map(v => 
        `ID: ${v.id} | Name: ${v.name} | Reliability Score: ${v.historical_reliability_score}/10 | Base Price: Rs.${v.base_price_point}`
    ).join("\n");

    const userPrompt = `Target Budget: Rs.${budget}\n\nAvailable Vendors:\n${vendorContext}\n\nRank them across an Operational Friction Score. Output pure JSON format array.`;

    try {
        const aiResponse = await callFeatherless(systemPrompt, userPrompt, 800);
        if (!aiResponse) return vendors.map(v => ({...v, friction_score: 5, reasoning: "AI API disabled. Default score."}));
        
        let parsedRatings;
        try {
            parsedRatings = JSON.parse(aiResponse.trim());
        } catch(e) {
            // Strip markdown backticks if the model ignores the strict instruction
            const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedRatings = JSON.parse(cleaned);
        }

        // Map the reasoning and score back to the original vendor objects and sort
        const ranked = vendors.map(v => {
            const aiData = parsedRatings.find(r => r.id === v.id) || {};
            return {
                ...v,
                efficiency_pilot: {
                    friction_score: aiData.friction_score || 5,
                    reasoning: aiData.reasoning || "No reasoning provided."
                }
            };
        });

        return ranked.sort((a, b) => a.efficiency_pilot.friction_score - b.efficiency_pilot.friction_score);

    } catch (e) {
        console.error("Friction Score computation failed:", e.message);
        // Fallback: manually rank by reliability
        return vendors.sort((a, b) => b.historical_reliability_score - a.historical_reliability_score).map(v => ({
            ...v,
            efficiency_pilot: { friction_score: null, reasoning: "AI fallback (ranked by raw reliability)" }
        }));
    }
}

module.exports = {
    calculateOperationalFriction
};
