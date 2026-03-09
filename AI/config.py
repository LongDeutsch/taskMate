"""
Cấu hình và hằng số dùng chung cho agent LangGraph.

YÊU CẦU QUAN TRỌNG:
- Thay vì đọc JSON local, agent sẽ đọc dữ liệu từ MongoDB (cùng database với TaskMate BE).
- BIẾN MÔI TRƯỜNG:
  - MONGODB_URI: URI kết nối MongoDB (mặc định: mongodb://127.0.0.1:27017)
  - DB_NAME: tên database (mặc định: taskmate)
"""

import os
from typing import Any, List, Dict

from pymongo import MongoClient

# Model mặc định cho Gemini (có thể override bằng biến môi trường GEMINI_MODEL)
GEMINI_DEFAULT_MODEL = "gemini-2.5-flash"

# Tình trạng task hợp lệ mà LLM có thể trả về
TASK_STATUSES = ("to do", "pending", "done")


# --- Dữ liệu được load từ MongoDB ---
PROJECTS: List[Dict[str, Any]] = []
TASKS: List[Dict[str, Any]] = []
USERS: List[Dict[str, Any]] = []


def _get_mongo_client() -> MongoClient:
    uri = os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017")
    return MongoClient(uri)


def load_data_from_mongo() -> None:
    """
    Đọc dữ liệu projects, tasks, users từ MongoDB và ghi vào
    các biến toàn cục PROJECTS, TASKS, USERS.

    Hàm này nên được gọi TRƯỚC MỖI LẦN chạy graph (để đồng bộ với BE).
    """
    global PROJECTS, TASKS, USERS

    db_name = os.environ.get("DB_NAME", "taskmate")
    client = _get_mongo_client()
    try:
        db = client[db_name]

        # projects
        PROJECTS = [
            {
                "id": str(p["_id"]),
                "name": p.get("name", ""),
                "description": p.get("description", ""),
            }
            for p in db["projects"].find({})
        ]

        # tasks
        TASKS = [
            {
                "id": str(t["_id"]),
                "projectId": t.get("projectId"),
                "title": t.get("title", ""),
                "description": t.get("description", ""),
                "status": t.get("status", ""),
                "priority": t.get("priority", ""),
                "deadline": t.get("deadline", ""),
                "assigneeId": t.get("assigneeId"),
            }
            for t in db["tasks"].find({})
        ]

        # users (chỉ thông tin public)
        USERS = [
            {
                "id": str(u["_id"]),
                "fullName": u.get("fullName", ""),
                "role": u.get("role"),
                "disabled": u.get("disabled", False),
            }
            for u in db["users"].find({}, {"password": 0})
        ]
    finally:
        client.close()


# --- Prompt templates ---

CLASSIFIER_SYSTEM_PROMPT = """Bạn là classifier. Chỉ trả lời ĐÚNG MỘT trong ba trường hợp sau (không thêm gì) dựa vào câu hỏi của user:
- greeting: khi user chào hỏi (xin chào, hello, chào bạn, hi, ...)
- out_of_scope: khi user hỏi NGOÀI phạm vi task/nhiệm vụ (thời tiết, tin tức, giải trí, ...)
- task: khi user ĐANG hỏi về task/nhiệm vụ (công việc, todo, nhiệm vụ, task, dự án, ...)"""


EXTRACT_SYSTEM_PROMPT = """Từ câu của user, trích xuất đúng 3 thông tin sau. Trả lời BẰNG JSON thuần, không markdown, không giải thích.
- "project_name": tên dự án/project (nếu user đề cập), không có thì ""
- "task_status": CHỈ một trong ba: "to do", "pending", "done" (nếu user hỏi theo tình trạng), không có thì ""
- "task_assignee": tên người làm task (nếu user đề cập), không có thì ""

# Ví dụ: {"project_name": "Website", "task_status": "pending", "task_assignee": "Minh"}
# Ví dụ không đủ: {"project_name": "", "task_status": "", "task_assignee": ""}

"""


WELCOME_SYSTEM_PROMPT = (
    "Bạn là trợ lý trong hỗ trợ các vấn đề liên quan đến tasks/project của công ty. "
    "Hãy trả lời ngắn gọn"
)

FINAL_ANSWER_SYSTEM_PROMPT = """Bạn là trợ lý task/project.
Hãy trả lời trọng tâm câu hỏi của user bằng tiếng Việt, dựa trên:
- Danh sách gợi ý task (task_name, task_status, task_description, task_deadline, task_priority).

Yêu cầu:
- Không lặp lại toàn bộ dữ liệu thô nếu không cần thiết.
- Giải thích ngắn gọn tình trạng tasks theo yêu cầu của user.
- Nếu không tìm thấy task phù hợp, hãy nói rõ là không tìm được theo tiêu chí đã cho.
"""

