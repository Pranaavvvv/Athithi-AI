import asyncio
import json
import torch
from dotenv import load_dotenv

# mock the generation and serialization
def test():
    # Simulate embedding
    embedding = torch.randn(1, 512)
    embedding_list = embedding.squeeze().tolist()
    
    result = {"action": "stored", "guest_id": "7acfdc22-de9f-4b6b-a31d-c52d08d114e9"}
    
    response = {
        "file": "guest_uploaded/7acfdc22-de9f-4b6b-a31d-c52d08d114e9/photo.jpeg",
        "embedding": embedding_list,
        "dimensions": len(embedding_list),
        **result,
    }
    
    try:
        j = json.dumps(response)
        print("Serialization OK, length:", len(j))
    except Exception as e:
        print("Serialization failed:", e)

test()
