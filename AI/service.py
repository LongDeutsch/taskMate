"""
FastAPI service cho TaskMate AI Agent.

- Đọc dữ liệu projects/tasks/users từ MongoDB (giống BE) thông qua config.load_data_from_mongo().
- Expose endpoint /chat để FE/BE gọi.
"""

import os
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from agent import build_agent_graph, _initial_state

app = FastAPI(title="TaskMate AI Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graph = build_agent_graph()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    meta: Dict[str, Any] | None = None


@app.on_event("startup")
async def startup_event() -> None:
    # Load dữ liệu ban đầu từ Mongo
    config.load_data_from_mongo()


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    # Refresh data trước mỗi lần gọi để đồng bộ với BE
    config.load_data_from_mongo()
    state = _initial_state(req.message)
    result = graph.invoke(state)
    reply = (result.get("response") or "").strip() or "Xin lỗi, tôi chưa có câu trả lời phù hợp."
    return ChatResponse(reply=reply, meta={"classification": result.get("classification")})


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("AGENT_PORT", "8000"))
    uvicorn.run("service:app", host="0.0.0.0", port=port, reload=True)

