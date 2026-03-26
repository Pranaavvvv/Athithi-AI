import io
import os
import numpy as np
import boto3
import torch
import uvicorn
import asyncpg
import traceback
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from pgvector.asyncpg import register_vector

# 1. Load environment variables
load_dotenv()

# 2. Initialize S3 client using env vars
s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_DEFAULT_REGION", os.getenv("AWS_REGION"))
)

DATABASE_URL = os.getenv("DATABASE_URL", "")
MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "0.7"))

# Lazy-load ML models
_model = None
_mtcnn = None

def get_model():
    global _model
    if _model is None:
        from facenet_pytorch import InceptionResnetV1
        _model = InceptionResnetV1(pretrained="vggface2").eval()
        print("[FACE SERVICE] InceptionResnetV1 model loaded")
    return _model

def get_mtcnn():
    global _mtcnn
    if _mtcnn is None:
        from facenet_pytorch import MTCNN
        _mtcnn = MTCNN(image_size=160, margin=20, keep_all=False)
        print("[FACE SERVICE] MTCNN face detector loaded")
    return _mtcnn


# ── Database ──────────────────────────────────────────────

db_pool = None

async def init_db():
    """Create connection pool and ensure face_matches table exists."""
    global db_pool

    # Convert asyncpg-compatible URL
    dsn = DATABASE_URL
    if dsn.startswith("postgresql+asyncpg://"):
        dsn = dsn.replace("postgresql+asyncpg://", "postgresql://", 1)

    db_pool = await asyncpg.create_pool(dsn, min_size=2, max_size=5, ssl="require")

    async with db_pool.acquire() as conn:
        await register_vector(conn)

        # Ensure pgvector extension
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        await conn.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

        # Create face_matches table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS face_matches (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                event_id UUID REFERENCES events(id) ON DELETE CASCADE,
                guest_id UUID REFERENCES gm_guests(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                similarity DOUBLE PRECISION NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_face_matches_event ON face_matches(event_id);
            CREATE INDEX IF NOT EXISTS idx_face_matches_guest ON face_matches(guest_id);
        """)
        print("[FACE SERVICE] ✅ Database connected & face_matches table ready")


async def close_db():
    global db_pool
    if db_pool:
        await db_pool.close()
        print("[FACE SERVICE] Database pool closed")


# ── FastAPI lifespan ──────────────────────────────────────

@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield
    await close_db()


app = FastAPI(title="Face Embedding Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print("!!! GLOBAL EXCEPTION CAUGHT !!!")
    print(traceback.format_exc())
    return JSONResponse(status_code=500, content={"message": str(exc)})


# ── Helper: generate embedding from S3 image ─────────────

async def generate_embedding_from_s3(bucket: str, key: str) -> list:
    """Pull image from S3, detect face, return 512-dim embedding list."""
    print(f"--- Pulling {key} from {bucket} ---")
    obj = s3.get_object(Bucket=bucket, Key=key)
    image_bytes = obj['Body'].read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    mtcnn = get_mtcnn()
    model = get_model()

    face_tensor = mtcnn(image)
    if face_tensor is None:
        return None

    with torch.no_grad():
        embedding = model(face_tensor.unsqueeze(0))

    return embedding.squeeze().tolist()


# ── Background Worker ─────────────────────────────────────

async def process_image_background(bucket: str, key: str):
    """The heavy lifter: downloads from S3, runs ML models, and saves to DB."""
    print(f"▶️ Starting background processing for: {key}")
    try:
        # Generate the embedding
        embedding_list = await generate_embedding_from_s3(bucket, key)

        if embedding_list is None:
            print(f"❌ [FACE SERVICE] No face detected in {key}")
            return

        print(f"✅ Embedding generated for {key} ({len(embedding_list)} dims)")

        # Route based on key prefix
        if key.startswith("guest_uploaded/"):
            await _handle_guest_upload(key, embedding_list)
        else:
            await _handle_event_photo(key, embedding_list)
            
        print(f"⏹️ Finished processing for: {key}")

    except Exception as e:
        print(f"❌ Background processing error for {key}: {str(e)}")
        print(traceback.format_exc())


# ── Routes ────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "running", "match_threshold": MATCH_THRESHOLD}


@app.post("/embed")
async def embed(data: dict, background_tasks: BackgroundTasks):
    """
    Receives S3 notification, queues the background task, and returns instantly.
    """
    bucket = data.get("bucket")
    key = data.get("key")

    if not bucket or not key:
        raise HTTPException(status_code=400, detail="Missing bucket or key in payload")

    # Add the heavy lifting to FastAPI's background queue
    background_tasks.add_task(process_image_background, bucket, key)

    # Return immediately so Lambda terminates successfully in under 1 second
    return {
        "status": "processing_started",
        "file": key,
        "message": "Image queued for background embedding generation."
    }


async def _handle_guest_upload(key: str, embedding: list) -> dict:
    """
    Key format: guest_uploaded/{guest_id}/filename.jpg
    Stores the embedding in gm_guests.embedding for the given guest_id.
    """
    parts = key.split("/")
    if len(parts) < 2:
        print(f"❌ Invalid guest_uploaded key format: {key}")
        return

    guest_id = parts[1]
    image_url = key

    async with db_pool.acquire() as conn:
        await register_vector(conn)

        # Update the guest's embedding and photo_url
        updated = await conn.execute(
            """UPDATE gm_guests 
               SET embedding = $1::vector, photo_url = $2, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $3::uuid""",
            embedding, image_url, guest_id
        )

        print(f"✅ Stored embedding for guest {guest_id}")

    return {"action": "stored", "guest_id": guest_id}


async def _handle_event_photo(key: str, embedding: list) -> dict:
    """
    Key format: {event_id}/filename.jpg
    Compares embedding against all gm_guests with embeddings for that event.
    Logs matches above MATCH_THRESHOLD into face_matches.
    """
    parts = key.split("/")
    if len(parts) < 2:
        print(f"❌ Invalid event photo key format: {key}")
        return

    event_id = parts[0]
    image_url = key

    async with db_pool.acquire() as conn:
        await register_vector(conn)

        # Find all guests for this event with embeddings, compute cosine similarity
        rows = await conn.fetch(
            """SELECT id, name, photo_url,
                      1 - (embedding <=> $1::vector) AS similarity
               FROM gm_guests
               WHERE event_id = $2::uuid AND embedding IS NOT NULL
               ORDER BY embedding <=> $1::vector
            """,
            embedding, event_id
        )

        matches = []
        for row in rows:
            sim = float(row["similarity"])
            if sim >= MATCH_THRESHOLD:
                # Log the match
                await conn.execute(
                    """INSERT INTO face_matches (event_id, guest_id, image_url, similarity)
                       VALUES ($1::uuid, $2::uuid, $3, $4)""",
                    event_id, str(row["id"]), image_url, sim
                )
                matches.append({
                    "guest_id": str(row["id"]),
                    "guest_name": row["name"],
                    "guest_photo": row["photo_url"],
                    "similarity": round(sim, 4),
                })

        print(f"✅ Event photo compared: {len(matches)} match(es) above {MATCH_THRESHOLD}")

    return {
        "action": "compared",
        "event_id": event_id,
        "threshold": MATCH_THRESHOLD,
        "matches": matches,
        "total_compared": len(rows),
    }


@app.get("/matches/{event_id}")
async def get_matches(event_id: str):
    """List all face matches for an event, grouped by image."""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT fm.id, fm.guest_id, fm.image_url, fm.similarity, fm.created_at,
                      g.name AS guest_name, g.photo_url AS guest_photo
               FROM face_matches fm
               JOIN gm_guests g ON fm.guest_id = g.id
               WHERE fm.event_id = $1::uuid
               ORDER BY fm.created_at DESC""",
            event_id
        )

        matches = [
            {
                "id": str(r["id"]),
                "guest_id": str(r["guest_id"]),
                "guest_name": r["guest_name"],
                "guest_photo": r["guest_photo"],
                "image_url": r["image_url"],
                "similarity": round(float(r["similarity"]), 4),
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ]

    return {"event_id": event_id, "matches": matches, "count": len(matches)}


@app.post("/compare")
async def compare(data: dict):
    """Compare two raw embedding arrays (legacy endpoint)."""
    try:
        e1 = np.array(data["embedding1"])
        e2 = np.array(data["embedding2"])
        similarity = float(np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2)))
        return {
            "similarity": similarity,
            "is_match": similarity > MATCH_THRESHOLD,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5557)