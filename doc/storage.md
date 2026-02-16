# Storage Layer

Handles file I/O for generated images and exports. All storage code lives in `lib/storage/`.

Three modules: **local storage**, **thumbnail generation**, and **ZIP export**.

- Output directory defaults to `../image-gen/outputs` (configurable via `OUTPUT_DIR` env var)
- Images stored under `{OUTPUT_DIR}/batches/{batchId}/`

## Local Storage (`lib/storage/local-storage.ts`, 106 lines)

Key exports:

| Function | Description |
|---|---|
| `ensureDirectoryExists(dir)` | Creates directory recursively if it doesn't exist |
| `saveImage(batchId, fileName, data)` | Saves image file to `{OUTPUT_DIR}/batches/{batchId}/` |
| `readImage(filePath)` | Reads image file from disk |
| `deleteImage(filePath)` | Deletes an image file |
| `getImageStats(filePath)` | Returns file stats (size, dates) |

Directory structure:

```
{OUTPUT_DIR}/
└── batches/
    ├── {batchId-1}/
    │   ├── image1.png
    │   ├── image2.png
    │   └── thumbnails/
    │       ├── 512_image1.png
    │       └── 512_image2.png
    └── {batchId-2}/
        └── ...
```

## Thumbnail Generation (`lib/storage/thumbnail.ts`, 62 lines)

Key export:

- `getThumbnail(sourcePath, width=512)` — Generates and caches thumbnails using Jimp

Behavior:

- Saves to `{sourceDir}/thumbnails/{width}_{filename}`
- Returns cached version if it already exists
- Falls back to original image on error
- Default thumbnail width: 512px

## ZIP Export (`lib/storage/zip-export.ts`, 133 lines)

Key exports:

- `createBatchZip(batch, options)` — Creates a ZIP archive of all images in a batch
- `sanitizeBatchName(name)` — Cleans batch name for safe filenames
- Type: `BatchWithDetails` — Input type for batch ZIP creation

Options:

| Option | Default | Description |
|---|---|---|
| `includeTransparent` | `true` | Include transparent versions |
| `includeFlipped` | `false` | Include flipped versions |
| `includeMetadata` | `true` | Include metadata.json |

ZIP structure:

```
{batchName}.zip
├── original/
│   ├── image1.png
│   └── image2.png
├── transparent/          (if includeTransparent)
│   ├── image1.png
│   └── image2.png
├── flipped/              (if includeFlipped)
│   ├── image1.png
│   └── image2.png
└── metadata.json         (if includeMetadata)
```

Uses JSZip with DEFLATE compression (level 6).

## Integration

- **Generation**: Images saved via queue functions calling `saveImage`
- **Thumbnails**: Generated on-demand via `GET /api/export/batches/[id]/images`
- **ZIP export**: Triggered via `GET /api/export/batches/[id]/download`
- **Transformations**: Transparent/flipped versions created via image transformation API routes

## File Structure

```
lib/storage/
├── local-storage.ts    # File I/O operations
├── thumbnail.ts        # Thumbnail generation (Jimp)
├── zip-export.ts       # ZIP archive creation (JSZip)
└── __tests__/          # Tests for storage modules
```
