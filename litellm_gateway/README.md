# LiteLLM Gateway

This folder runs a single LiteLLM gateway on `http://localhost:4000` that can front:

- local Ollama models over the OpenAI-compatible LiteLLM API
- OpenAI-hosted Codex models over the same OpenAI-compatible API
- Claude models over LiteLLM's Anthropic-compatible API surface

Hosted OpenAI and Anthropic calls are API-key backed. ChatGPT/Codex or Claude app subscriptions are not used as upstream provider auth in this Docker setup.

## Required environment variables

Copy `.env.example` to `.env` and set:

- `LITELLM_MASTER_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OLLAMA_API_BASE`
- `OPENAI_CODEX_MODEL`
- `ANTHROPIC_CLAUDE_MODEL`

Defaults in `.env.example`:

- `OLLAMA_API_BASE=http://host.docker.internal:11434`
- `OPENAI_CODEX_MODEL=gpt-5.3-codex`
- `ANTHROPIC_CLAUDE_MODEL=claude-sonnet-4-20250514`

## Start the gateway

From this folder:

```bash
docker compose up -d
```

The LiteLLM container will listen on port `4000`.

## OpenAI-compatible clients

Base URL:

```text
http://localhost:4000
```

Auth:

```text
Bearer $LITELLM_MASTER_KEY
```

Primary models:

- `local-llama`
- `local-coder`
- `gpt-5.3-codex`

Example request:

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -d '{
    "model": "local-coder",
    "messages": [
      {"role": "user", "content": "Say hello from the LiteLLM gateway."}
    ]
  }'
```

## Claude-compatible clients

Base URL:

```text
http://localhost:4000
```

Auth:

```text
ANTHROPIC_AUTH_TOKEN=$LITELLM_MASTER_KEY
```

Primary model:

- `claude-sonnet-4`

Example request:

```bash
curl http://localhost:4000/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4",
    "max_tokens": 256,
    "messages": [
      {"role": "user", "content": "Say hello from the LiteLLM gateway."}
    ]
  }'
```
