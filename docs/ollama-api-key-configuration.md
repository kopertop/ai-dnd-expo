# Ollama API Key Configuration

This document explains how to configure and use API keys with the Ollama client in the AI D&D application.

## Configuration Options

The Ollama client supports API key authentication through multiple configuration methods:

### 1. Environment Variables

Set the `EXPO_PUBLIC_OLLAMA_API_KEY` environment variable:

```bash
# In your .env file
EXPO_PUBLIC_OLLAMA_API_KEY=your-api-key-here
```

### 2. Programmatic Configuration

Pass the API key directly when creating the Ollama client:

```typescript
import { OllamaClient } from '@/services/api/ollama-client';

const client = new OllamaClient({
  baseUrl: 'http://localhost:11434',
  defaultModel: 'llama3.2',
  apiKey: 'your-api-key-here'
});
```

### 3. AI Service Manager Configuration

Configure the API key through the AI service manager:

```typescript
import { AIServiceManager, DefaultAIConfig } from '@/services/ai/ai-service-manager';

const config = {
  ...DefaultAIConfig,
  ollama: {
    ...DefaultAIConfig.ollama,
    apiKey: 'your-api-key-here'
  }
};

const aiService = new AIServiceManager(config);
```

## How It Works

When an API key is provided, the Ollama client automatically adds an `Authorization: Bearer <api-key>` header to all requests sent to the Ollama server. This enables authentication with Ollama servers that require API key authentication.

## Security Considerations

1. **Environment Variables**: When using environment variables, make sure to add your `.env` file to `.gitignore` to prevent accidentally committing sensitive information.

2. **Web Platform**: On the web platform, environment variables prefixed with `EXPO_PUBLIC_` are embedded in the client-side bundle and are visible to users. For production applications, consider using a backend proxy to protect your API keys.

3. **Native Platforms**: On native platforms, environment variables are not exposed to the client-side code, providing better security for your API keys.

## Testing

The Ollama client includes tests to verify that API keys are properly included in requests:

- `tests/unit/services/api/ollama-client.test.ts` - Tests for API key functionality

## Troubleshooting

If you're having issues with API key authentication:

1. Verify that your API key is correct and active
2. Check that the Ollama server supports API key authentication
3. Ensure that the `Authorization` header is being sent correctly by checking network requests in browser dev tools
4. Verify that CORS settings on the Ollama server allow requests from your application origin

