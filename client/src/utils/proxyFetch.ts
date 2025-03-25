interface FetchWithProxyInput {
  readonly endpoint: string;
  readonly method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  readonly headers?: Record<string, string>;
  readonly body?: BodyInit | null | undefined;
}

export async function fetchWithProxy(
  input: FetchWithProxyInput
): Promise<Response> {
  const { endpoint, method, headers, body } = input;

  const primaryProxyUrl = (import.meta.env.VITE_MAIN_PROXY_URL || "") as string;
  const backupProxyUrl = (import.meta.env.VITE_BACKUP_PROXY_URL ||
    "") as string;

  try {
    console.log(`Primary Proxy URL: ${primaryProxyUrl}`);
    const primaryHealthCheck = await fetch(`${primaryProxyUrl}/health`);

    if (primaryHealthCheck.ok) {
      return await fetch(`${primaryProxyUrl}/api/${endpoint}`, {
        method,
        headers,
        body,
      });
    } else {
      console.warn("Primary proxy is down. Attempting to use backup proxy.");
    }
  } catch (error) {
    console.error(`Error in primary proxy fetch: ${error}`);
  }

  try {
    console.log(`Backup Proxy URL: ${backupProxyUrl}`);
    const backupHealthCheck = await fetch(`${backupProxyUrl}/health`);

    if (backupHealthCheck.ok) {
      return await fetch(`${backupProxyUrl}/api/${endpoint}`, {
        method,
        headers,
        body,
      });
    } else {
      throw new Error("Both proxies are down.");
    }
  } catch (error) {
    console.error(`Error in backup proxy fetch: ${error}`);
    throw new Error("Both primary and backup proxies are down.");
  }
}
