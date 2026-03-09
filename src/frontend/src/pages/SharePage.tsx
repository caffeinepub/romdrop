import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Download,
  FileText,
  HardDrive,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import FileTypeBadge from "../components/FileTypeBadge";
import { useActor } from "../hooks/useActor";

function formatBytes(bytes: bigint) {
  const n = Number(bytes);
  if (n === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / k ** i).toFixed(2)} ${sizes[i]}`;
}

function formatDate(timestamp: bigint) {
  // Motoko timestamps are in nanoseconds
  const ms = Number(timestamp / 1_000_000n);
  return new Date(ms).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function SharePage() {
  const { id } = useParams({ from: "/share/$id" });
  const { actor, isFetching } = useActor();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const {
    data: record,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["fileRecord", id],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getFileRecord(id);
    },
    enabled: !!actor && !isFetching && !!id,
    retry: 1,
  });

  const handleDownload = async () => {
    if (!record) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const exBlob = ExternalBlob.fromURL(record.blobId).withUploadProgress(
        (pct: number) => {
          setDownloadProgress(Math.round(pct));
        },
      );

      const bytes = await exBlob.getBytes();
      const blob = new Blob([bytes]);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = record.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(`Downloading ${record.filename}`);
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const loading = isLoading || isFetching;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back nav */}
        <Link
          to="/"
          data-ocid="nav.link"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-neon transition-colors mb-8 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to upload
        </Link>

        <AnimatePresence mode="wait">
          {/* Loading state */}
          {loading && (
            <motion.div
              key="loading"
              data-ocid="share.loading_state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-6">
                <Loader2 className="w-4 h-4 text-neon animate-spin" />
                <span className="font-mono text-xs text-muted-foreground">
                  Fetching from ICP nodes...
                </span>
              </div>
              <div className="border border-border bg-card rounded-xs p-6 space-y-4">
                <Skeleton className="h-5 w-3/4 bg-muted" />
                <Skeleton className="h-4 w-1/2 bg-muted" />
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <Skeleton className="h-10 bg-muted rounded-xs" />
                  <Skeleton className="h-10 bg-muted rounded-xs" />
                  <Skeleton className="h-10 bg-muted rounded-xs" />
                </div>
                <Skeleton className="h-12 w-full bg-muted rounded-xs" />
              </div>
            </motion.div>
          )}

          {/* Error / not found */}
          {!loading && (isError || record === null || record === undefined) && (
            <motion.div
              key="error"
              data-ocid="share.error_state"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="border border-destructive/50 bg-destructive/5 rounded-xs p-8 text-center"
            >
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-4" />
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                File Not Found
              </h2>
              <p className="font-mono text-sm text-muted-foreground mb-6">
                This share link is invalid or the file no longer exists.
              </p>
              <Link to="/">
                <Button
                  variant="outline"
                  className="rounded-xs font-mono text-xs uppercase tracking-wider border-[oklch(0.22_0.04_220)] text-muted-foreground hover:border-neon hover:text-neon bg-transparent"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                  Go to upload
                </Button>
              </Link>
            </motion.div>
          )}

          {/* File card */}
          {!loading && record && (
            <motion.div
              key="file-card"
              data-ocid="share.card"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="border border-[oklch(0.22_0.04_220)] bg-card rounded-xs overflow-hidden"
            >
              {/* Card header accent */}
              <div className="h-0.5 bg-gradient-to-r from-neon via-[oklch(0.65_0.22_200)] to-transparent" />

              <div className="p-6">
                {/* Title + badge */}
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-12 h-12 border border-[oklch(0.22_0.04_220)] rounded-xs flex items-center justify-center flex-shrink-0 bg-muted">
                    <HardDrive className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <FileTypeBadge type={record.fileType} />
                    </div>
                    <h1 className="font-display text-xl font-semibold text-foreground leading-snug break-all">
                      {record.title || record.filename}
                    </h1>
                    {record.title && record.title !== record.filename && (
                      <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                        {record.filename}
                      </p>
                    )}
                  </div>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border mb-6">
                  <div className="bg-card px-4 py-3 flex items-start gap-2.5">
                    <HardDrive className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                        Size
                      </p>
                      <p className="font-mono text-sm text-foreground mt-0.5">
                        {formatBytes(record.size)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-card px-4 py-3 flex items-start gap-2.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                        Format
                      </p>
                      <p className="font-mono text-sm text-foreground mt-0.5 uppercase">
                        .{record.fileType}
                      </p>
                    </div>
                  </div>
                  <div className="bg-card px-4 py-3 flex items-start gap-2.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                        Uploaded
                      </p>
                      <p className="font-mono text-xs text-foreground mt-0.5">
                        {formatDate(record.uploadedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ID row */}
                <div className="px-3 py-2 bg-background border border-border rounded-xs mb-4 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest flex-shrink-0">
                    ID
                  </span>
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {record.id}
                  </span>
                </div>

                {/* Download button */}
                <Button
                  data-ocid="share.download_button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full rounded-xs font-mono text-sm tracking-wider uppercase font-semibold h-12 bg-neon text-primary-foreground hover:bg-[oklch(0.85_0.22_165)] border-0 neon-glow transition-all duration-200 disabled:opacity-70"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                      {downloadProgress > 0 ? ` ${downloadProgress}%` : ""}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download {record.filename}
                    </>
                  )}
                </Button>

                {/* Download progress */}
                <AnimatePresence>
                  {isDownloading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-1.5">
                        <div className="h-0.5 bg-muted rounded-xs overflow-hidden">
                          <motion.div
                            className="h-full bg-neon rounded-xs"
                            animate={
                              downloadProgress > 0
                                ? { width: `${downloadProgress}%` }
                                : { width: ["10%", "60%", "10%"] }
                            }
                            transition={
                              downloadProgress > 0
                                ? { duration: 0.2 }
                                : {
                                    duration: 1.8,
                                    repeat: Number.POSITIVE_INFINITY,
                                    ease: "easeInOut",
                                  }
                            }
                          />
                        </div>
                        <p className="font-mono text-[10px] text-muted-foreground text-center">
                          Fetching from ICP blob nodes...
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer notice */}
                <p className="mt-4 font-mono text-[10px] text-muted-foreground text-center">
                  Stored on the Internet Computer · No expiry · No download
                  limit
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
