print("Hello, World!")
import os
import asyncio
from google import genai

os.environ["GEMINI_API_KEY"] = "AIzaSyCyy9_rnQyU1tXr2nGIatNnMWlKPqBBQLk"


# client = genai.Client()

# async def main():
#     async for chunk in await client.aio.models.generate_content_stream(
#         model="gemini-3-flash-preview",
#         contents="Trả lời tiếng Việt: AI hoạt động như thế nào? ngắn gọn"
#     ):
#         if chunk.text:
#             print(chunk.text, end="", flush=True)
#     print()

# asyncio.run(main())


from google import genai

client = genai.Client()  # lấy GEMINI_API_KEY từ env

for m in client.models.list():
    print(m.name)  # thường dạng: models/gemini-2.0-flash, ...