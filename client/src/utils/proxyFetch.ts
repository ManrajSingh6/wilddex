interface FetchWithProxyInput {
  readonly endpoint: string;
  readonly method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  readonly headers?: Record<string, string>;
  readonly body?: BodyInit | null | undefined;
}

const maxRetries = 3;

export async function fetchWithProxy(
  input: FetchWithProxyInput
): Promise<Response> {
  const { endpoint, method, headers, body } = input;

  const primaryProxyUrl = (import.meta.env.VITE_MAIN_PROXY_URL || "") as string;
  const backupProxyUrl = (import.meta.env.VITE_BACKUP_PROXY_URL ||
    "") as string;

  for(var fetchTries = 0; fetchTries < maxRetries; fetchTries++) {
    try {
      console.log(`Primary Proxy URL: ${primaryProxyUrl}`);
      const primaryHealthCheck = await fetch(`${primaryProxyUrl}/health`);

      if (primaryHealthCheck.ok) {
        console.log(`Primary proxy fetch attempt # ${fetchTries}`);
        const response = await fetch(`${primaryProxyUrl}/api/${endpoint}`, {
          method,
          headers,
          body,
        });

        if (response.ok || fetchTries === maxRetries-1) {
          return response
        }
        
        if (response.status === 404) {
          return response
        }

      } else {
        if(fetchTries === maxRetries-1) {
          console.warn("Primary proxy is down. Attempting to use backup proxy.");
        }
      }
    } catch (error) {
      if (fetchTries === maxRetries-1) {
        console.error(`Error in primary proxy fetch: ${error}`);
      }
    }
  }

  for(var fetchTries = 0; fetchTries < maxRetries; fetchTries++) {
    try {
      console.log(`Backup Proxy URL: ${backupProxyUrl}`);
      const backupHealthCheck = await fetch(`${backupProxyUrl}/health`);
      console.log(`Backup proxy fetch attempt # ${fetchTries}`);
      if (backupHealthCheck.ok) {
        const response = await fetch(`${backupProxyUrl}/api/${endpoint}`, {
          method,
          headers,
          body,
        });

        if (response.ok || fetchTries === maxRetries-1) {
          return response
        }
        
        if (response.status === 404) {
          return response
        }

      } else {
        if(fetchTries === maxRetries-1) {
          throw new Error("Both proxies are down.");
        }
      }
    } catch (error) {
      if(fetchTries === maxRetries-1) {
        console.error(`Error in backup proxy fetch: ${error}`);
      }
    }
  }
  throw new Error("Both primary and backup proxies are down.");
}
