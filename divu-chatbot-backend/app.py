from flask import Flask, request, jsonify
import openai
import os
from dotenv import load_dotenv
from flask_cors import CORS


load_dotenv()

app = Flask(__name__)
CORS(app)


openai.api_type = "azure"
openai.api_base = os.getenv("AZURE_OPENAI_ENDPOINT")
openai.api_key = os.getenv("AZURE_OPENAI_KEY")
openai.api_version = "2024-05-01-preview"

@app.route("/api/chat", methods=["POST"])
def chat():
    user_input = request.json.get("message", "")
    try:
        response = openai.ChatCompletion.create(
            engine=os.getenv("DEPLOYMENT_NAME"),
            messages=[{"role": "user", "content": user_input}],
            temperature=0.3,
            max_tokens=400
        )
        return jsonify({"reply": response["choices"][0]["message"]["content"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")
def home():
    return "DIVU Chatbot Backend is running!"

if __name__ == "__main__":
    app.run(debug=True, port=5000)
