interface FetchWithProxyInput {
  readonly endpoint: string;
  readonly method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  readonly headers?: Record<string, string>;
  readonly body?: BodyInit | null | undefined;
}

const MAX_RETRIES = 3;

export async function fetchWithProxy(
  input: FetchWithProxyInput
): Promise<Response> {
  const { endpoint, method, headers, body } = input;

  const primaryProxyUrl = (import.meta.env.VITE_MAIN_PROXY_URL || "") as string;
  const backupProxyUrl = (import.meta.env.VITE_BACKUP_PROXY_URL ||
    "") as string;

  for (
    let primaryFetchTries = 0;
    primaryFetchTries < MAX_RETRIES;
    primaryFetchTries++
  ) {
    console.info(`Primary proxy fetch attempt # ${primaryFetchTries + 1}`);
    try {
      console.info(`Primary Proxy URL: ${primaryProxyUrl}`);
      const primaryHealthCheck = await fetch(`${primaryProxyUrl}/health`);

      if (primaryHealthCheck.ok) {
        const response = await fetch(`${primaryProxyUrl}/api/${endpoint}`, {
          method,
          headers,
          body,
        });

        if (response.ok || primaryFetchTries === MAX_RETRIES - 1) {
          return response;
        }

        if (response.status === 404) {
          return response;
        }
      } else {
        if (primaryFetchTries === MAX_RETRIES - 1) {
          console.warn(
            "Primary proxy is down. Attempting to use backup proxy."
          );
        }
      }
    } catch (error) {
      if (primaryFetchTries === MAX_RETRIES - 1) {
        console.error(`Error in primary proxy fetch: ${error}`);
      }
    }
  }

  for (
    let backupFetchTries = 0;
    backupFetchTries < MAX_RETRIES;
    backupFetchTries++
  ) {
    console.info(`Backup proxy fetch attempt # ${backupFetchTries + 1}`);
    try {
      console.info(`Backup Proxy URL: ${backupProxyUrl}`);
      const backupHealthCheck = await fetch(`${backupProxyUrl}/health`);

      if (backupHealthCheck.ok) {
        const response = await fetch(`${backupProxyUrl}/api/${endpoint}`, {
          method,
          headers,
          body,
        });

        if (response.ok || backupFetchTries === MAX_RETRIES - 1) {
          return response;
        }

        if (response.status === 404) {
          return response;
        }
      } else {
        if (backupFetchTries === MAX_RETRIES - 1) {
          throw new Error("Both proxies are down.");
        }
      }
    } catch (error) {
      if (backupFetchTries === MAX_RETRIES - 1) {
        console.error(`Error in backup proxy fetch: ${error}`);
      }
    }
  }
  throw new Error("Both primary and backup proxies are down.");
}
