import fs from "fs";

import {fileURLToPath, URL} from "url";


export async function parseUrl(inputUrl, maxRetries = 3, retryDelay = 1000) {
  try {
    const urlObj = new URL(inputUrl);

    if (urlObj.protocol === "file:") {
      const filePath = fileURLToPath(inputUrl);
      console.log(`File path: ${filePath}`);
      return fs.readFileSync(filePath, { encoding: "utf8" });
    } else if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
      console.log(`Service URL: ${inputUrl}`);
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(inputUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.text(); // or response.json() based on expected content type
        } catch (error) {
          console.error(`Attempt ${attempt} failed: ${error}`);
          if (attempt === maxRetries) throw error;
          console.log(`Retrying in ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    } else {
      throw new Error("Unsupported URL protocol");
    }
  } catch (error) {
    console.error("Error processing URL:", error);
    throw error; // Rethrow or handle as needed
  }
}
