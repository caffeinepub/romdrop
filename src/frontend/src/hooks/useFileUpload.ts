import { HttpAgent } from "@icp-sdk/core/agent";
import { useCallback } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";

/**
 * useFileUpload -- thin hook that instantiates StorageClient from runtime
 * config and exposes a single `uploadFile` function.
 *
 * Returns the gateway direct-URL string for the uploaded blob.
 */
export function useFileUpload() {
  const uploadFile = useCallback(
    async (
      bytes: Uint8Array,
      onProgress?: (percentage: number) => void,
    ): Promise<string> => {
      const config = await loadConfig();
      const isLocal = config.backend_host?.includes("localhost");

      const agent = HttpAgent.createSync({
        host: config.backend_host,
        shouldFetchRootKey: isLocal,
        verifyQuerySignatures: false,
      });

      if (isLocal) {
        await agent.fetchRootKey().catch(() => {});
      }

      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );

      const { hash } = await storageClient.putFile(bytes, onProgress);

      return storageClient.getDirectURL(hash);
    },
    [],
  );

  return { uploadFile };
}
