// Flowise adapter: normalizes Flowise API to match Sales Arena's provider interface
// Supports both self-hosted and cloud Flowise deployments

function createFlowiseProvider(url, key, chatflowId) {
  if (!url || !key) return null;
  return {
    name: 'flowise',
    url: url.replace(/\/$/, ''), // remove trailing slash
    key,
    chatflowId,
    fast: 'chatflow',
    smart: 'chatflow'
  };
}

async function flowiseChat({ url, key, chatflowId, messages, max_tokens, timeoutMs = 8000 }) {
  if (!url || !key || !chatflowId) {
    throw new Error('Flowise configuration incomplete (url, key, chatflowId required)');
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array is required');
  }

  // Convert OpenAI format to Flowise format
  const question = messages[messages.length - 1].content;
  if (typeof question !== 'string') {
    throw new Error('Last message content must be a string');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = `${url}/api/v1/prediction/${chatflowId}`;
    const payload = {
      question,
      chatId: messages[0]?.metadata?.chatId || undefined
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const err = new Error(
        errorData?.message ||
        errorData?.error?.message ||
        `Flowise error (${res.status})`
      );
      err.status = res.status;
      throw err;
    }

    const data = await res.json();

    // Handle Flowise response format
    let content = data?.text || data?.message || '';
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('Flowise returned empty response');
    }

    return {
      content: content.trim(),
      provider: 'flowise',
      model: 'chatflow',
      chatId: data?.chatId,
      metadata: data?.metadata
    };
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('Flowise request timeout');
      err.status = 408;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export { createFlowiseProvider, flowiseChat };
