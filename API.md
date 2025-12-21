# Image Gen Web API Documentation

This document provides a guide for LLMs and developers on how to interact with the Image Gen Web API.

## Base URL
`/api`

---

## 🎨 Styles

Manage art styles and visual definitions.

### GET `/api/styles`
Returns a list of the latest versions of all styles.

**Response Body:**
```json
{
  "styles": [
    {
      "id": "uuid",
      "name": "Cyberpunk Neon",
      "version": 1,
      "palette": ["#FF00FF", "#00FFFF"],
      "renderingCues": ["High contrast", "Film grain"],
      "description": "A vibrant cyberpunk style",
      "createdAt": "iso-date",
      "updatedAt": "iso-date"
    }
  ]
}
```

### POST `/api/styles`
Create a new style or a new version of an existing style.

**Request Body:**
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | **Required**. Name of the style. |
| `palette` | array | **Required**. Array of color strings/hex codes. |
| `renderingCues` | array | **Required**. Array of strings describing visual techniques. |
| `description` | string | Optional. General description. |
| `parentStyleId` | uuid | Optional. If provided, creates a new version incremented from the parent. |

---

## 📦 Batches

Orchestrate groups of image generation tasks.

### GET `/api/batches`
List all generation batches.

### POST `/api/batches`
Create a new generation batch with multiple prompts.

**Request Body:**
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | **Required**. Name for the batch. |
| `description`| string | Optional. |
| `provider` | string | Default: `gemini`. Options: `gemini`, `comfyui`. |
| `defaults` | object | Optional. Default generation parameters. |
| `prompts` | array | **Required**. Array of prompt objects. |

**Prompt Object Structure:**
```json
{
  "promptId": "uuid", // Optional: link to existing prompt template
  "promptText": "Full prompt string",
  "overrides": {} // Optional parameter overrides
}
```

### POST `/api/batches/[id]/execute`
Triggers the execution of a batch via Inngest.

---

## 🤖 AI Agents

Specialized endpoints for AI-assisted workflows.

### POST `/api/agents/compose-prompt`
Compose a high-quality prompt by combining a style, a subject, and guidance.

**Request Body:**
```json
{
  "styleId": "uuid",
  "subjectId": "uuid",
  "guidanceIds": ["uuid1", "uuid2"] // Optional
}
```

**Response:**
```json
{
  "promptText": "The composed full prompt string..."
}
```

### POST `/api/agents/create-prompt`
Generates a new prompt template based on a description.

### POST `/api/agents/create-style`
Generates style attributes (palette, cues) from a natural language description.

---

## 📝 Other Resources

- **`/api/prompts`**: Manage reusable prompt templates.
- **`/api/subjects`**: Manage common subjects (characters, objects).
- **`/api/guidance`**: Manage instructional modifiers (lighting, composition).
- **`/api/images`**: Access metadata for generated images.

## 🛠️ Error Handling

The API returns standard HTTP status codes:
- `200/201`: Success
- `400`: Bad Request (missing required fields)
- `404`: Not Found
- `500`: Internal Server Error
