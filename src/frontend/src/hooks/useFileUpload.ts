import { HttpAgent } from "@icp-sdk/core/agent";
import { useCallback } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";

/**
 * Returns a function that uploads a file to Caffeine blob storage and resolves
 * with a permanent direct URL that can be stored as `blobId` in the canister.
 *
 * Download: `ExternalBlob.fromURL(blobId).getBytes()` — works cross-session.
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

      // Construct the permanent direct URL for download
      const directUrl = await storageClient.getDirectURL(hash);
      return directUrl;
    },
    [],
  );

  return { uploadFile };
}
