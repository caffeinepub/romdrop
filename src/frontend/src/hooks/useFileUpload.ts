import { HttpAgent } from "@icp-sdk/core/agent";
import { IDL } from "@icp-sdk/core/candid";
import { useCallback } from "react";
import { loadConfig } from "../config";

// ---------------------------------------------------------------------------
// Minimal re-implementation of the upload flow that does NOT rely on
// StorageClient.getCertificate's internal v3 check.  We call the canister
// directly, poll for the certificate ourselves, and then drive the rest of
// the upload manually via fetch.
// ---------------------------------------------------------------------------

const SHA256_PREFIX = "sha256:";
const DOMAIN_SEPARATOR_FOR_CHUNKS = new TextEncoder().encode("icfs-chunk/");
const DOMAIN_SEPARATOR_FOR_METADATA = new TextEncoder().encode(
  "icfs-metadata/",
);
const DOMAIN_SEPARATOR_FOR_NODES = new TextEncoder().encode("ynode/");
const HASH_ALGORITHM = "SHA-256";
const GATEWAY_VERSION = "v1";
const MAXIMUM_CONCURRENT_UPLOADS = 10;
const CHUNK_SIZE = 1024 * 1024; // 1 MB

// ---------------------------------------------------------------------------
// YHash helpers
// ---------------------------------------------------------------------------

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest(HASH_ALGORITHM, data as BufferSource),
  );
}

async function hashWithSep(
  sep: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const combined = new Uint8Array(sep.length + data.length);
  combined.set(sep);
  combined.set(data, sep.length);
  return sha256(combined);
}

async function hashChunk(data: Uint8Array): Promise<Uint8Array> {
  return hashWithSep(DOMAIN_SEPARATOR_FOR_CHUNKS, data);
}

async function hashHeaders(
  headers: Record<string, string>,
): Promise<Uint8Array> {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(headers)) {
    lines.push(`${k.trim()}: ${v.trim()}\n`);
  }
  lines.sort();
  return hashWithSep(
    DOMAIN_SEPARATOR_FOR_METADATA,
    new TextEncoder().encode(lines.join("")),
  );
}

async function hashNodes(
  left: Uint8Array | null,
  right: Uint8Array | null,
): Promise<Uint8Array> {
  const leftBytes = left ?? new TextEncoder().encode("UNBALANCED");
  const rightBytes = right ?? new TextEncoder().encode("UNBALANCED");
  const combined = new Uint8Array(
    DOMAIN_SEPARATOR_FOR_NODES.length + leftBytes.length + rightBytes.length,
  );
  combined.set(DOMAIN_SEPARATOR_FOR_NODES);
  combined.set(leftBytes, DOMAIN_SEPARATOR_FOR_NODES.length);
  combined.set(
    rightBytes,
    DOMAIN_SEPARATOR_FOR_NODES.length + leftBytes.length,
  );
  return sha256(combined);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toShaString(bytes: Uint8Array): string {
  return `${SHA256_PREFIX}${toHex(bytes)}`;
}

// ---------------------------------------------------------------------------
// Build Merkle tree over chunk hashes
// ---------------------------------------------------------------------------

interface TreeNode {
  hash: Uint8Array;
  left: TreeNode | null;
  right: TreeNode | null;
}

interface BlobHashTreeJSON {
  tree_type: "DSBMTWH";
  chunk_hashes: string[];
  tree: TreeNodeJSON;
  headers: string[];
}

interface TreeNodeJSON {
  hash: string;
  left: TreeNodeJSON | null;
  right: TreeNodeJSON | null;
}

function nodeToJSON(node: TreeNode): TreeNodeJSON {
  return {
    hash: toShaString(node.hash),
    left: node.left ? nodeToJSON(node.left) : null,
    right: node.right ? nodeToJSON(node.right) : null,
  };
}

async function buildBlobHashTree(
  chunkHashes: Uint8Array[],
  fileHeaders: Record<string, string>,
): Promise<{ rootHashStr: string; treeJSON: BlobHashTreeJSON }> {
  if (chunkHashes.length === 0) {
    const hex =
      "8b8e620f084e48da0be2287fd12c5aaa4dbe14b468fd2e360f48d741fe7628a0";
    chunkHashes.push(new TextEncoder().encode(hex));
  }

  // Build leaf nodes
  let level: TreeNode[] = chunkHashes.map((hash) => ({
    hash,
    left: null,
    right: null,
  }));

  // Build tree bottom-up
  while (level.length > 1) {
    const next: TreeNode[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? null;
      const parentHash = await hashNodes(left.hash, right ? right.hash : null);
      next.push({ hash: parentHash, left, right });
    }
    level = next;
  }

  let chunksRoot = level[0];

  // If we have headers, combine chunks root with metadata root
  if (Object.keys(fileHeaders).length > 0) {
    const metadataHash = await hashHeaders(fileHeaders);
    const metadataRoot: TreeNode = {
      hash: metadataHash,
      left: null,
      right: null,
    };
    const combinedHash = await hashNodes(chunksRoot.hash, metadataRoot.hash);
    chunksRoot = { hash: combinedHash, left: chunksRoot, right: metadataRoot };
  }

  const headerLines = Object.entries(fileHeaders)
    .map(([k, v]) => `${k.trim()}: ${v.trim()}`)
    .sort();

  const treeJSON: BlobHashTreeJSON = {
    tree_type: "DSBMTWH",
    chunk_hashes: chunkHashes.map(toShaString),
    tree: nodeToJSON(chunksRoot),
    headers: headerLines,
  };

  return { rootHashStr: toShaString(chunksRoot.hash), treeJSON };
}

// ---------------------------------------------------------------------------
// IC canister call + readState polling for certificate
// ---------------------------------------------------------------------------

async function getCertificateFromCanister(
  agent: HttpAgent,
  canisterId: string,
  blobHashStr: string,
): Promise<Uint8Array> {
  // Encode the argument: (Text) -> encoded Candid
  const arg = IDL.encode([IDL.Text], [blobHashStr]);

  // Make the update call
  const callResult = await (agent as any).call(canisterId, {
    methodName: "_caffeineStorageCreateCertificate",
    arg,
  });

  const body = callResult?.response?.body;
  console.log("[upload] canister call response body:", body);

  // Case 1: v3 inline certificate — body has { certificate: Uint8Array }
  if (
    body !== null &&
    body !== undefined &&
    "certificate" in body &&
    body.certificate
  ) {
    console.log(
      "[upload] got inline certificate, byteLength:",
      body.certificate.byteLength,
    );
    return body.certificate instanceof Uint8Array
      ? body.certificate
      : new Uint8Array(body.certificate);
  }

  // Case 2: 202 accepted or no inline cert — poll readState
  const requestId = callResult?.requestId as Uint8Array | undefined;
  if (!requestId || requestId.byteLength === 0) {
    throw new Error(
      "[upload] No requestId returned from canister call; cannot poll for certificate",
    );
  }

  console.log(
    "[upload] polling readState for certificate, requestId byteLength:",
    requestId.byteLength,
  );
  return pollReadStateForCertificate(agent, canisterId, requestId);
}

async function pollReadStateForCertificate(
  agent: HttpAgent,
  canisterId: string,
  requestId: Uint8Array,
  maxAttempts = 40,
  delayMs = 1500,
): Promise<Uint8Array> {
  const requestStatusLabel = new TextEncoder().encode("request_status");
  const path = [requestStatusLabel, requestId];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      console.log(`[upload] readState poll ${attempt + 1}/${maxAttempts}`);
      const stateResponse = await (agent as any).readState(canisterId, {
        paths: [path],
      });
      const cert = stateResponse?.certificate;
      if (cert && (cert.byteLength ?? cert.length) > 0) {
        console.log(`[upload] certificate received on attempt ${attempt + 1}`);
        return cert instanceof Uint8Array ? cert : new Uint8Array(cert);
      }
    } catch (err) {
      console.warn(`[upload] readState attempt ${attempt + 1} failed:`, err);
    }
  }

  throw new Error(
    `[upload] Timed out waiting for IC certificate after ${maxAttempts} polls`,
  );
}

// ---------------------------------------------------------------------------
// Gateway upload helpers
// ---------------------------------------------------------------------------

async function uploadChunk(
  gatewayUrl: string,
  projectId: string,
  owner: string,
  bucketName: string,
  blobHashStr: string,
  chunkHash: Uint8Array,
  chunkIndex: number,
  chunkData: Uint8Array,
): Promise<void> {
  const params = new URLSearchParams({
    owner_id: owner,
    blob_hash: blobHashStr,
    chunk_hash: toShaString(chunkHash),
    chunk_index: chunkIndex.toString(),
    bucket_name: bucketName,
    project_id: projectId,
  });
  const url = `${gatewayUrl}/${GATEWAY_VERSION}/chunk/?${params.toString()}`;

  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Caffeine-Project-ID": projectId,
    },
    body: chunkData as BodyInit,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(
      `Chunk ${chunkIndex} upload failed: ${resp.status} ${resp.statusText} - ${txt}`,
    );
  }
}

async function uploadBlobTree(
  gatewayUrl: string,
  projectId: string,
  owner: string,
  bucketName: string,
  numBytes: number,
  treeJSON: BlobHashTreeJSON,
  certificateBytes: Uint8Array,
): Promise<void> {
  const url = `${gatewayUrl}/${GATEWAY_VERSION}/blob-tree/`;
  const body = {
    blob_tree: treeJSON,
    bucket_name: bucketName,
    num_blob_bytes: numBytes,
    owner,
    project_id: projectId,
    headers: treeJSON.headers,
    auth: { OwnerEgressSignature: Array.from(certificateBytes) },
  };

  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Caffeine-Project-ID": projectId,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(
      `Blob tree upload failed: ${resp.status} ${resp.statusText} - ${txt}`,
    );
  }
}

function getDirectURL(
  gatewayUrl: string,
  projectId: string,
  owner: string,
  hash: string,
): string {
  return `${gatewayUrl}/${GATEWAY_VERSION}/blob/?blob_hash=${encodeURIComponent(hash)}&owner_id=${encodeURIComponent(owner)}&project_id=${encodeURIComponent(projectId)}`;
}

// ---------------------------------------------------------------------------
// Main upload function
// ---------------------------------------------------------------------------

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

      // Split into 1MB chunks
      const chunks: Uint8Array[] = [];
      for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
        chunks.push(bytes.slice(offset, offset + CHUNK_SIZE));
      }

      // Compute chunk hashes
      const chunkHashes: Uint8Array[] = [];
      for (const chunk of chunks) {
        chunkHashes.push(await hashChunk(chunk));
      }

      // File metadata headers (same as StorageClient)
      const fileHeaders: Record<string, string> = {
        "Content-Type": "application/octet-stream",
        "Content-Length": bytes.length.toString(),
      };

      // Build Merkle tree + root hash
      const { rootHashStr, treeJSON } = await buildBlobHashTree(
        chunkHashes,
        fileHeaders,
      );
      console.log("[upload] root hash:", rootHashStr);

      // Get certificate from canister (handles both v3 inline and 202 polling)
      const certificateBytes = await getCertificateFromCanister(
        agent,
        config.backend_canister_id,
        rootHashStr,
      );

      // Upload blob tree to gateway (auth)
      await uploadBlobTree(
        config.storage_gateway_url,
        config.project_id,
        config.backend_canister_id,
        config.bucket_name,
        bytes.length,
        treeJSON,
        certificateBytes,
      );

      // Upload chunks in parallel
      const httpHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      let completedChunks = 0;

      await Promise.all(
        Array.from(
          { length: MAXIMUM_CONCURRENT_UPLOADS },
          async (_, workerId) => {
            for (
              let i = workerId;
              i < chunks.length;
              i += MAXIMUM_CONCURRENT_UPLOADS
            ) {
              await uploadChunk(
                config.storage_gateway_url,
                config.project_id,
                config.backend_canister_id,
                config.bucket_name,
                rootHashStr,
                chunkHashes[i],
                i,
                chunks[i],
              );
              completedChunks++;
              if (onProgress && chunks.length > 0) {
                onProgress(Math.round((completedChunks / chunks.length) * 100));
              }
            }
          },
        ),
      );

      void httpHeaders; // suppress unused warning

      return getDirectURL(
        config.storage_gateway_url,
        config.project_id,
        config.backend_canister_id,
        rootHashStr,
      );
    },
    [],
  );

  return { uploadFile };
}
