# ROMDrop

## Current State
New project. No existing backend or frontend code.

## Requested Changes (Diff)

### Add
- File upload page: drag-and-drop or click-to-upload for .nds, .ciso, and .wbfs files
- Optional title field on upload (defaults to filename if left blank)
- Large file support via blob-storage component
- After upload, generate a unique shareable link (e.g. /share/<id>)
- Share page: displays file title, file type badge, file size, and a prominent download button
- No authentication, no expiry, no download limits
- Copy-to-clipboard button for the generated share link

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Select blob-storage component for large file handling
2. Generate Motoko backend:
   - Store file metadata: id, title, filename, fileType, size, blobId, uploadedAt
   - uploadFile(title: ?Text, filename: Text, fileType: Text, size: Nat) -> returns share id + blob upload URL
   - getFile(id: Text) -> returns file metadata
   - No auth, no expiry logic
3. Frontend:
   - Upload page (/): dropzone accepting .nds/.ciso/.wbfs, optional title input, upload progress, success state with shareable link + copy button
   - Share page (/share/:id): fetch file metadata, show title, type badge, size, download button that fetches blob URL
   - DeFi aesthetic: near-black background, neon green/cyan accents, monospace font for IDs and metadata, sharp card borders with glow, grid/scanline subtle texture
