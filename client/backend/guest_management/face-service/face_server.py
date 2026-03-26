"""
Face Embedding Microservice
Uses facenet-pytorch (InceptionResnetV1) to generate 512-dim face embeddings.
Runs as a standalone FastAPI server on port 5557.

Usage:
    pip install -r requirements.txt
    python face_server.py
"""

import io
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import uvicorn

# Lazy-load PyTorch and facenet to speed up import
_model = None
_mtcnn = None


def get_model():
    """Lazy-load the FaceNet model (InceptionResnetV1 pretrained on VGGFace2)."""
    global _model
    if _model is None:
        from facenet_pytorch import InceptionResnetV1
        _model = InceptionResnetV1(pretrained="vggface2").eval()
        print("[FACE SERVICE] InceptionResnetV1 model loaded (VGGFace2)")
    return _model


def get_mtcnn():
    """Lazy-load the MTCNN face detector."""
    global _mtcnn
    if _mtcnn is None:
        from facenet_pytorch import MTCNN
        _mtcnn = MTCNN(image_size=160, margin=20, keep_all=False)
        print("[FACE SERVICE] MTCNN face detector loaded")
    return _mtcnn


app = FastAPI(
    title="Face Embedding Service",
    description="Generates 512-dim face embeddings using facenet-pytorch",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"service": "Face Embedding Service", "status": "running", "model": "InceptionResnetV1 (VGGFace2)"}


@app.post("/embed")
async def embed(file: UploadFile = File(...)):
    """
    Accept an image file and return a 512-dim face embedding.
    Returns: { "embedding": [float, ...], "dimensions": 512 }
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    mtcnn = get_mtcnn()
    model = get_model()

    # Detect and align face
    face_tensor = mtcnn(image)

    if face_tensor is None:
        raise HTTPException(
            status_code=422,
            detail="No face detected in the image. Please upload a clear photo of a face.",
        )

    # Generate embedding
    import torch
    with torch.no_grad():
        embedding = model(face_tensor.unsqueeze(0))

    embedding_list = embedding.squeeze().tolist()

    return {
        "embedding": embedding_list,
        "dimensions": len(embedding_list),
    }


@app.post("/compare")
async def compare(data: dict):
    """
    Compare two embeddings using cosine similarity.
    Body: { "embedding1": [float, ...], "embedding2": [float, ...] }
    Returns: { "similarity": float, "is_match": bool }
    """
    try:
        e1 = np.array(data["embedding1"])
        e2 = np.array(data["embedding2"])
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid embeddings: {str(e)}")

    if len(e1) != 512 or len(e2) != 512:
        raise HTTPException(status_code=400, detail="Embeddings must be 512-dimensional")

    # Cosine similarity
    similarity = float(np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2)))

    return {
        "similarity": similarity,
        "is_match": similarity > 0.7,  # Threshold for face match
    }


if __name__ == "__main__":
    print("\n🧠 Starting Face Embedding Service...")
    print("   Model: InceptionResnetV1 (VGGFace2)")
    print("   Output: 512-dimensional face embeddings\n")
    uvicorn.run(app, host="0.0.0.0", port=5557)
