/**
 * Embedding Service
 * Calls the Python facenet-pytorch microservice to generate 512-dim face embeddings
 * from uploaded guest photos. Stores embeddings in pgvector column.
 */

const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const pool = require("../config/db");

const FACE_SERVICE_URL = process.env.FACE_SERVER_PATH || "http://localhost:5557";

/**
 * Generate a face embedding from an image file by calling the Python face service.
 * @param {string} imagePath - Absolute path to the image file
 * @returns {number[]} 512-dimensional embedding array
 */
async function generateEmbedding(imagePath) {
  const absolutePath = path.isAbsolute(imagePath)
    ? imagePath
    : path.resolve(__dirname, "..", imagePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Image file not found: ${absolutePath}`);
  }

  const formData = new FormData();
  formData.append("file", fs.createReadStream(absolutePath));

  const response = await fetch(`${FACE_SERVICE_URL}/embed`, {
    method: "POST",
    body: formData,
    headers: formData.getHeaders(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Face service error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.embedding; // number[512]
}

/**
 * Store an embedding vector in the guest record.
 * @param {string} guestId
 * @param {number[]} embedding - 512-dim array
 */
async function storeEmbedding(guestId, embedding) {
  const vectorStr = `[${embedding.join(",")}]`;

  await pool.query(
    "UPDATE gm_guests SET embedding = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [vectorStr, guestId]
  );

  return { guestId, embeddingDim: embedding.length };
}

/**
 * Full pipeline: generate embedding from photo and store it.
 * @param {string} guestId
 * @param {string} imagePath
 */
async function processGuestPhoto(guestId, imagePath) {
  const embedding = await generateEmbedding(imagePath);
  await storeEmbedding(guestId, embedding);
  return { guestId, embeddingDim: embedding.length };
}

/**
 * Compare a probe face against all guest embeddings for an event.
 * Returns top matches sorted by cosine similarity.
 * @param {number[]} probeEmbedding - 512-dim array
 * @param {string} eventId
 * @param {number} limit
 */
async function searchSimilarGuests(probeEmbedding, eventId, limit = 5) {
  const vectorStr = `[${probeEmbedding.join(",")}]`;

  const result = await pool.query(
    `SELECT id, name, email, phone, status, photo_url,
            1 - (embedding <=> $1::vector) AS similarity
     FROM gm_guests
     WHERE event_id = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorStr, eventId, limit]
  );

  return result.rows;
}

module.exports = {
  generateEmbedding,
  storeEmbedding,
  processGuestPhoto,
  searchSimilarGuests,
};
