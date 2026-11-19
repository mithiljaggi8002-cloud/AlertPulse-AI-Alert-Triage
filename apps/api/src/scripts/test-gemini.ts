
import "dotenv/config";
import { generateAIResponse } from "../services/gemini.service.js";

async function main() {
  try {
    const response = await generateAIResponse(
      "Explain what a backend API is in two sentences."
    );

    console.log("Gemini response:", response);
  } catch (error) {
    console.error("Gemini test failed:", error);
  }
}

main();
