import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Check,
  Copy,
  FileCheck,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import FileTypeBadge from "../components/FileTypeBadge";
import { useActor } from "../hooks/useActor";
import { useFileUpload } from "../hooks/useFileUpload";

const ACCEPTED_TYPES = [".nds", ".ciso", ".wbfs"];

function isValidExt(name: string) {
  return ACCEPTED_TYPES.some((ext) => name.toLowerCase().endsWith(ext));
}

function getExt(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function UploadPage() {
  const { actor, isFetching } = useActor();
  const { uploadFile } = useFileUpload();

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [shareId, setShareId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : "";

  const handleFilePick = useCallback((file: File) => {
    if (!isValidExt(file.name)) {
      toast.error("Invalid file type. Only .nds, .ciso, .wbfs are accepted.");
      return;
    }
    setSelectedFile(file);
    setUploadState("idle");
    setShareId("");
    setErrorMsg("");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFilePick(file);
    },
    [handleFilePick],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFilePick(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !actor) return;

    setUploadState("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const ext = getExt(selectedFile.name);

      // Upload to blob storage and get a permanent direct URL
      const blobId = await uploadFile(bytes, (pct) => setProgress(pct));

      const finalTitle = title.trim() || null;
      const id = await actor.createFileRecord(
        finalTitle,
        selectedFile.name,
        ext,
        BigInt(selectedFile.size),
        blobId,
      );

      setShareId(id);
      setUploadState("success");
      toast.success("File uploaded successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(msg);
      setUploadState("error");
      toast.error("Upload failed. Please try again.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setTitle("");
    setProgress(0);
    setUploadState("idle");
    setShareId("");
    setErrorMsg("");
    setCopied(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isUploading = uploadState === "uploading";
  const isSuccess = uploadState === "success";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page heading */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
              PROTOCOL v1.0
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">
            Drop Your ROM
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-mono">
            .NDS · .CISO · .WBFS — no accounts, no expiry, no limits
          </p>
        </div>

        {/* Drop zone */}
        <AnimatePresence mode="wait">
          {!isSuccess && (
            <motion.div
              key="upload-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <label
                data-ocid="upload.dropzone"
                htmlFor="file-upload"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={[
                  "relative border-2 rounded-xs transition-all duration-300",
                  "flex flex-col items-center justify-center",
                  selectedFile
                    ? "p-6 min-h-[140px]"
                    : "p-12 min-h-[220px] cursor-pointer",
                  dragOver
                    ? "border-neon bg-[oklch(0.78_0.22_165/0.06)] animate-pulse-border"
                    : selectedFile
                      ? "border-[oklch(0.22_0.04_220)] bg-card"
                      : "border-dashed border-[oklch(0.22_0.04_220)] bg-card hover:border-neon hover:bg-[oklch(0.78_0.22_165/0.03)]",
                ].join(" ")}
              >
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".nds,.ciso,.wbfs"
                  className="sr-only"
                  onChange={onInputChange}
                  disabled={isUploading}
                />

                {/* Corner decorations */}
                <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[oklch(0.22_0.04_220)]" />
                <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[oklch(0.22_0.04_220)]" />
                <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[oklch(0.22_0.04_220)]" />
                <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[oklch(0.22_0.04_220)]" />

                {selectedFile ? (
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-10 h-10 border border-neon rounded-xs flex items-center justify-center neon-glow-sm flex-shrink-0">
                      <FileCheck className="w-5 h-5 text-neon" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileTypeBadge type={getExt(selectedFile.name)} />
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatBytes(selectedFile.size)}
                        </span>
                      </div>
                      <p className="font-mono text-sm text-foreground truncate">
                        {selectedFile.name}
                      </p>
                    </div>
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                        className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label="Remove file"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <motion.div
                      animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
                      className="w-14 h-14 border border-[oklch(0.22_0.04_220)] rounded-xs flex items-center justify-center"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </motion.div>
                    <div>
                      <p className="font-display text-base font-medium text-foreground">
                        Drop file here or click to browse
                      </p>
                      <p className="font-mono text-xs text-muted-foreground mt-1">
                        .nds · .ciso · .wbfs · any size
                      </p>
                    </div>
                  </div>
                )}
              </label>

              {/* Title input + upload button */}
              <AnimatePresence>
                {selectedFile && !isUploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-3">
                      <Input
                        data-ocid="upload.title_input"
                        type="text"
                        placeholder="Title (optional — defaults to filename)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isUploading}
                        className="font-mono text-sm bg-card border-[oklch(0.22_0.04_220)] text-foreground placeholder:text-muted-foreground rounded-xs focus-visible:ring-neon focus-visible:border-neon focus-visible:ring-1"
                      />

                      <Button
                        data-ocid="upload.submit_button"
                        onClick={handleUpload}
                        disabled={isUploading || isFetching || !actor}
                        className="w-full rounded-xs font-mono text-sm tracking-wider uppercase font-semibold h-11 bg-neon text-primary-foreground hover:bg-[oklch(0.85_0.22_165)] border-0 neon-glow transition-all duration-200"
                      >
                        {isFetching ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload &amp; Generate Link
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress bar */}
              <AnimatePresence>
                {isUploading && (
                  <motion.div
                    data-ocid="upload.loading_state"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                        Uploading to ICP nodes...
                      </span>
                      <span className="font-mono text-xs text-neon">
                        {progress}%
                      </span>
                    </div>
                    <div className="relative h-1 bg-muted rounded-xs overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-neon rounded-xs"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[oklch(0.78_0.22_165/0.4)] to-transparent animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Loader2 className="w-3 h-3 text-neon animate-spin" />
                      <span className="font-mono text-xs text-muted-foreground">
                        Encrypting and distributing across{" "}
                        {progress < 50 ? "nodes" : "canisters"}...
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error state */}
              <AnimatePresence>
                {uploadState === "error" && errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 p-3 border border-destructive/50 bg-destructive/10 rounded-xs flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="font-mono text-xs text-destructive">
                      {errorMsg}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Success state */}
          {isSuccess && (
            <motion.div
              key="success"
              data-ocid="upload.success_state"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {/* Success header */}
              <div className="border border-neon bg-[oklch(0.78_0.22_165/0.05)] rounded-xs p-5 neon-glow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 border border-neon rounded-xs flex items-center justify-center neon-glow-sm">
                    <Check className="w-4 h-4 text-neon" />
                  </div>
                  <div>
                    <p className="font-display text-base font-semibold text-foreground">
                      Upload complete
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      File pinned to ICP — no expiry
                    </p>
                  </div>
                  {selectedFile && (
                    <div className="ml-auto">
                      <FileTypeBadge type={getExt(selectedFile.name)} />
                    </div>
                  )}
                </div>

                {/* Share link box */}
                <div className="space-y-2">
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                    Share Link
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-xs">
                    <span className="font-mono text-xs text-neon truncate flex-1 min-w-0">
                      {shareUrl}
                    </span>
                    <button
                      type="button"
                      data-ocid="upload.copy_button"
                      onClick={handleCopy}
                      className="flex-shrink-0 p-1.5 border border-[oklch(0.22_0.04_220)] rounded-xs hover:border-neon hover:text-neon transition-all duration-200 text-muted-foreground"
                      aria-label="Copy share link"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-neon" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* File info */}
                {selectedFile && (
                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-3">
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">
                        Filename
                      </p>
                      <p className="font-mono text-xs text-foreground truncate">
                        {selectedFile.name}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">
                        Size
                      </p>
                      <p className="font-mono text-xs text-foreground">
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">
                        ID
                      </p>
                      <p className="font-mono text-xs text-foreground truncate">
                        {shareId.slice(0, 12)}…
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                data-ocid="upload.reset_button"
                onClick={handleReset}
                variant="outline"
                className="w-full rounded-xs font-mono text-xs uppercase tracking-wider border-[oklch(0.22_0.04_220)] text-muted-foreground hover:border-neon hover:text-neon bg-transparent h-9 transition-all duration-200"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                Upload another file
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 grid grid-cols-3 gap-px bg-border"
        >
          {[
            { label: "File types", value: "NDS / CISO / WBFS" },
            { label: "Expiry", value: "Never" },
            { label: "Size limit", value: "Unlimited" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card px-4 py-3">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                {label}
              </p>
              <p className="font-mono text-sm text-foreground mt-0.5">
                {value}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
