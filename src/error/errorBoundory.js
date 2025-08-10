export async function retryWrapper(fn, args = [], maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(...args);
    } catch (error) {
      let errorMsg = error.message || error.toString();

      console.error(`Attempt ${attempt} failed with error: ${errorMsg}`);

      if (attempt < maxRetries) {
        console.log(`Retrying attempt ${attempt + 1} after ${delayMs} ms...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        console.error("Maximum retry attempts reached. Operation failed.");
        throw error;
      }
    }
  }
}
