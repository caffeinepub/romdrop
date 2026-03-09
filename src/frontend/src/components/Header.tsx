import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
        <Link to="/" data-ocid="nav.link">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Logo mark */}
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 border border-neon rounded-xs neon-glow-sm opacity-70" />
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="w-4 h-4 relative z-10"
                aria-label="ROMDrop logo"
                role="img"
              >
                <title>ROMDrop logo</title>
                <path
                  d="M10 2L4 6v8l6 4 6-4V6L10 2z"
                  stroke="oklch(0.78 0.22 165)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 8l-3 2v4l3 2 3-2v-4L10 8z"
                  fill="oklch(0.78 0.22 165 / 0.3)"
                  stroke="oklch(0.78 0.22 165)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-mono text-sm font-semibold tracking-widest text-neon uppercase neon-text">
              ROMDrop
            </span>
          </motion.div>
        </Link>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse shadow-[0_0_6px_oklch(0.78_0.22_165/0.8)]" />
            <span className="font-mono text-xs text-muted-foreground">
              NODE ONLINE
            </span>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
