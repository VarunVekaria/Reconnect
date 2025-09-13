from flask import Flask, request, jsonify
from PIL import Image
import io
import numpy as np
import insightface

app = Flask(__name__)
model = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
model.prepare(ctx_id=0)

@app.route('/embed', methods=['POST'])
def embed():
    img_file = request.files['file']
    img = Image.open(img_file.stream).convert("RGB")
    img_np = np.array(img)
    faces = model.get(img_np)
    if not faces:
        return jsonify({'error': 'No face detected'}), 400
    emb = faces[0].embedding.tolist()
    return jsonify({'embedding': emb})

if __name__ == '__main__':
    app.run(host="127.0.0.1", port=5006)
