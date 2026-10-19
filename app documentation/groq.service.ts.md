# groq.service.ts

## Purpose of the File
`groq.service.ts` initializes and exports the Groq SDK client instance used by the backend controllers. It configures the Groq API key from environment variables, sets connection timeouts, and specifies maximum retry attempts for network reliability.

---

## Line-by-Line Code Breakdown

- **L1**: Imports default `Groq` class constructor from `groq-sdk`.
- **L2**: Imports `dotenv` for environment variable loading.
- **L4**: Calls `dotenv.config()` to read `.env` configuration.
- **L6–L10**: Instantiates and exports `groq` with configuration options:
  - `apiKey: process.env.GROQ_API_KEY`: Supplies the secret authentication key.
  - `timeout: 20 * 1000`: Sets 20-second client timeout threshold.
  - `maxRetries: 2`: Allows up to 2 automatic retry attempts on transient network or 5xx server failures.
