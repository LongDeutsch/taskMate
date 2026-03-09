"""
LangGraph AI Agent - 2 cấp.
Cấp 1: Phân loại input user → 3 trường hợp.
Cấp 2: Mỗi trường hợp trỏ tới node 'Hello trường hợp' tương ứng.
Sau trường hợp 3: LLM trích xuất project name, task status, người làm task,
sau đó match với dữ liệu trong MongoDB (được load qua module config) bằng rapidfuzz.
"""

import json
import os
import re
from typing import Literal, TypedDict

from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from rapidfuzz import fuzz, process

import config


# --- State ---
class AgentState(TypedDict, total=False):
    """State chung của graph."""
    input: str
    classification: str  # "greeting" | "out_of_scope" | "task"
    response: str
    # Sau trường hợp 3 (LLM extract)
    project_name: str
    task_status: str   # "to do" | "pending" | "done" hoặc ""
    task_assignee: str
    # Kết quả match từ rapidfuzz
    matched_projects: list[dict]
    matched_tasks: list[dict]
    matched_users: list[dict]
    # Danh sách task đã lọc theo project/assignee (nếu có)
    filtered_tasks: list[dict]


# --- Phân loại bằng rule (fallback khi API lỗi / hết quota) ---
def _classify_by_rules(user_input: str) -> str:
    """Phân loại theo từ khóa, không gọi API."""
    t = user_input.strip().lower()
    # Chào hỏi
    greetings = ("xin chào", "chào", "hello", "hi", "hey", "chào bạn", "chào anh", "chào chị")
    if any(g in t for g in greetings) and len(t) < 50:
        return "greeting"
    # Task/nhiệm vụ
    task_keywords = ("task", "nhiệm vụ", "công việc", "todo", "dự án", "danh sách task", "công tác", "việc cần làm")
    if any(k in t for k in task_keywords):
        return "task"
    return "out_of_scope"


# --- Cấp 1: Node phân loại ---
def _classify_input(state: AgentState) -> AgentState:
    """Nhận input user, gọi LLM phân loại; nếu API lỗi/hết quota thì dùng rule-based."""
    user_input = (state.get("input") or "").strip()
    if not user_input:
        return {**state, "classification": "out_of_scope", "response": ""}

    classification = None
    model = os.environ.get("GEMINI_MODEL", config.GEMINI_DEFAULT_MODEL)
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            llm = ChatGoogleGenerativeAI(
                model=model,
                google_api_key=api_key,
                temperature=0,
            )
            msg = llm.invoke(
                [SystemMessage(content=CLASSIFIER_SYSTEM_PROMPT), HumanMessage(content=user_input)]
            )
            raw = (msg.text or "").strip().lower()
            if "greeting" in raw:
                classification = "greeting"
            elif "out_of_scope" in raw or "out of scope" in raw:
                classification = "out_of_scope"
            elif "task" in raw:
                classification = "task"
        except Exception:
            pass  # Fallback xuống rule-based
    if classification is None:
        classification = _classify_by_rules(user_input)
    return {**state, "classification": classification, "response": ""}


def _route_after_classify(state: AgentState) -> Literal["hello_truong_hop_1", "hello_truong_hop_2", "hello_truong_hop_3"]:
    """Routing: từ classification trỏ tới đúng node Hello trường hợp."""
    c = (state.get("classification") or "out_of_scope").strip().lower()
    if c == "greeting":
        return "hello_truong_hop_1"
    if c == "task":
        return "hello_truong_hop_3"
    return "hello_truong_hop_2"


# --- Cấp 2: Các node "Hello trường hợp" ---
def hello_truong_hop_1(state: AgentState) -> AgentState:
    """Trường hợp 1: Những câu chào hỏi."""
    return {**state, "response": "Hello trường hợp 1 – Bạn đã gửi câu chào hỏi. Tôi có thể giúp gì thêm về task/nhiệm vụ?"}


def hello_truong_hop_2(state: AgentState) -> AgentState:
    """Trường hợp 2: Ngoài phạm vi hỏi về task/nhiệm vụ."""
    return {**state, "response": "Hello trường hợp 2 – Câu hỏi nằm ngoài phạm vi task/nhiệm vụ. Hãy hỏi về công việc, nhiệm vụ hoặc dự án."}


def hello_truong_hop_3(state: AgentState) -> AgentState:
    """Trường hợp 3: Đang hỏi về task/nhiệm vụ."""
    return {**state, "response": "Hello trường hợp 3 – Bạn đang hỏi về task/nhiệm vụ. Tôi sẽ xử lý yêu cầu liên quan đến công việc."}


def _parse_extract(raw: str) -> tuple[str, str, str]:
    """Parse output LLM thành (project_name, task_status, task_assignee)."""
    project_name = ""
    task_status = ""
    task_assignee = ""
    raw = (raw or "").strip()
    # Gỡ markdown code block nếu có
    if "```" in raw:
        raw = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
    try:
        data = json.loads(raw)
        project_name = (data.get("project_name") or "").strip()
        task_assignee = (data.get("task_assignee") or "").strip()
        s = (data.get("task_status") or "").strip().lower()
        if s in config.TASK_STATUSES:
            task_status = s
    except (json.JSONDecodeError, TypeError):
        pass
    return project_name, task_status, task_assignee


def _match_with_rapidfuzz(
    project_name: str,
    task_status: str,
    task_assignee: str,
) -> tuple[list[dict], list[dict], list[dict]]:
    """Dùng rapidfuzz để match với data từ Mongo (thông qua config) và trả về list[values] tương ứng."""
    matched_projects: list[dict] = []
    matched_tasks: list[dict] = []
    matched_users: list[dict] = []

    # Đảm bảo đã có dữ liệu mới nhất
    if not config.PROJECTS or not config.TASKS or not config.USERS:
        config.load_data_from_mongo()

    # Match project_name với projects (field name)
    if project_name:
        choices = [p["name"] for p in config.PROJECTS]
        best = process.extractOne(project_name, choices, scorer=fuzz.WRatio)
        if best:
            best_name = best[0]
            matched_projects = [p for p in config.PROJECTS if p["name"] == best_name]

    # Match task_status với status trong tasks.json
    if task_status:
        # Map từ LLM status -> status trong JSON
        canonical_map = {
            "to do": "Todo",
            "pending": "InProgress",
            "done": "Done",
        }
        query = canonical_map.get(task_status.strip().lower(), task_status)
        status_choices = list({t["status"] for t in config.TASKS})
        best = process.extractOne(query, status_choices, scorer=fuzz.WRatio)
        if best:
            best_status = best[0]
            matched_tasks = [t for t in config.TASKS if t["status"] == best_status]

    # Match task_assignee với fullName trong users.json
    if task_assignee:
        choices = [u["fullName"] for u in config.USERS]
        best = process.extractOne(task_assignee, choices, scorer=fuzz.WRatio)
        if best:
            best_name = best[0]
            matched_users = [u for u in config.USERS if u["fullName"] == best_name]

    return matched_projects, matched_tasks, matched_users


def extract_task_intent(state: AgentState) -> AgentState:
    """User input đi qua LLM để trả lời: tên project?, tình trạng tasks?, người làm task? (không có thì để trống)."""
    user_input = (state.get("input") or "").strip()
    project_name = ""
    task_status = ""
    task_assignee = ""

    model = os.environ.get("GEMINI_MODEL", GEMINI_DEFAULT_MODEL)
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            llm = ChatGoogleGenerativeAI(
                model=model,
                google_api_key=api_key,
                temperature=0,
            )
            msg = llm.invoke(
                [
                    SystemMessage(content=EXTRACT_SYSTEM_PROMPT),
                    HumanMessage(content=user_input),
                ]
            )
            project_name, task_status, task_assignee = _parse_extract(msg.text or "")
        except Exception:
            pass

    # Nếu đã trích được thông tin (không trống) thì match với data bằng rapidfuzz
    matched_projects: list[dict] = []
    matched_tasks: list[dict] = []
    matched_users: list[dict] = []
    filtered_tasks: list[dict] = []
    if project_name or task_status or task_assignee:
        matched_projects, matched_tasks, matched_users = _match_with_rapidfuzz(
            project_name, task_status, task_assignee
        )

        # Lọc tasks giống logic debug ở __main__
        if matched_projects:
            proj_ids = {p["id"] for p in matched_projects}
        else:
            proj_ids = set()
        if matched_users:
            assignee_ids = {u["id"] for u in matched_users}
        else:
            assignee_ids = set()

        tasks = matched_tasks
        if assignee_ids and proj_ids:
            filtered_tasks = [
                t
                for t in tasks
                if t.get("projectId") in proj_ids and t.get("assigneeId") in assignee_ids
            ]
        elif assignee_ids and not proj_ids:
            filtered_tasks = [
                t for t in tasks if t.get("assigneeId") in assignee_ids
            ]
        elif proj_ids and not assignee_ids:
            filtered_tasks = [
                t for t in tasks if t.get("projectId") in proj_ids
            ]

    # Cập nhật response để gộp thông tin đã trích
    base = state.get("response") or ""
    extra = (
        f" | Đã trích: project={project_name or '(trống)'}, "
        f"status={task_status or '(trống)'}, người làm={task_assignee or '(trống)'}"
    )
    if matched_projects or matched_tasks or matched_users:
        proj_label = (
            matched_projects[0]["name"] if matched_projects else "(không match project)"
        )
        status_label = (
            matched_tasks[0]["status"] if matched_tasks else "(không match status)"
        )
        user_label = (
            matched_users[0]["fullName"] if matched_users else "(không match user)"
        )
        extra += (
            f" | Match: project={proj_label}, status={status_label}, người làm={user_label}"
        )

    return {
        **state,
        "project_name": project_name,
        "task_status": task_status,
        "task_assignee": task_assignee,
        "matched_projects": matched_projects,
        "matched_tasks": matched_tasks,
        "matched_users": matched_users,
        "filtered_tasks": filtered_tasks,
        "response": base + extra,
    }

def welcome_user(state: AgentState) -> AgentState:
    """Chào mừng user."""
    user_input = (state.get("input") or "").strip()
    model = os.environ.get("GEMINI_MODEL", config.GEMINI_DEFAULT_MODEL)
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            llm = ChatGoogleGenerativeAI(
                model=model,
                google_api_key=api_key,
                temperature=0,
            )
            msg = llm.invoke(
                [
                    SystemMessage(content=WELCOME_SYSTEM_PROMPT),
                    HumanMessage(content=user_input),
                ]
            )
            return {**state, "response": msg.text}
        except Exception:
            return {**state, "response": "Xin chào! Tôi có thể giúp gì cho bạn hôm nay?"}


def generate_final_answer(state: AgentState) -> AgentState:
    """Node cuối: dùng LLM sinh câu trả lời cuối cùng cho trường hợp task."""
    user_input = (state.get("input") or "").strip()
    filtered_tasks = state.get("filtered_tasks") or []

    # Nếu không có task nào sau khi match/lọc, chỉ cần trả lời fallback
    tasks_hint_lines: list[str] = []
    for t in filtered_tasks:
        tasks_hint_lines.append(f"task_name: {t.get('title')}")
        tasks_hint_lines.append(f"task_status: {t.get('status')}")
        tasks_hint_lines.append(f"task_description: {t.get('description')}")
        tasks_hint_lines.append(f"task_deadline: {t.get('deadline')}")
        tasks_hint_lines.append(f"task_priority: {t.get('priority')}")
        tasks_hint_lines.append("---")
    tasks_hint = "\n".join(tasks_hint_lines)

    # Nếu không có dữ liệu gợi ý thì giữ nguyên response cũ
    if not tasks_hint:
        return state

    model = os.environ.get("GEMINI_MODEL", GEMINI_DEFAULT_MODEL)
    api_key = os.environ.get("GEMINI_API_KEY")
    final_response = None

    if api_key:
        try:
            llm = ChatGoogleGenerativeAI(
                model=model,
                google_api_key=api_key,
                temperature=0,
            )
            human_content = (
                f"Câu hỏi của user: {user_input}\n\n"
                f"Dữ liệu task gợi ý (mỗi block là một task):\n{tasks_hint}"
            )
            msg = llm.invoke(
                [
                    SystemMessage(content=FINAL_ANSWER_SYSTEM_PROMPT),
                    HumanMessage(content=human_content),
                ]
            )
            final_response = (msg.text or "").strip()
        except Exception:
            final_response = None

    base = state.get("response") or ""
    if final_response:
        # Ghi đè bằng câu trả lời cuối cùng để FE dùng trực tiếp
        new_response = final_response
    else:
        # Fallback: giữ base + list ngắn gọn các task
        summary_lines = []
        summary_lines.append(base)
        summary_lines.append("Các task liên quan mà tôi tìm được:")
        for t in filtered_tasks:
            summary_lines.append(
                f"- {t.get('title')} ({t.get('status')}), deadline {t.get('deadline')}"
            )
        new_response = "\n".join(l for l in summary_lines if l)

    return {
        **state,
        "response": new_response,
    }

# --- Build graph ---
def build_agent_graph():
    workflow = StateGraph(AgentState)

    # Cấp 1: node phân loại
    workflow.add_node("classify", _classify_input)

    # Cấp 2: 3 node xử lý theo trường hợp
    workflow.add_node("hello_truong_hop_1", hello_truong_hop_1)
    workflow.add_node("hello_truong_hop_2", hello_truong_hop_2)
    workflow.add_node("hello_truong_hop_3", hello_truong_hop_3)
    # Node sau trường hợp 3: LLM trích xuất project / status / assignee
    workflow.add_node("extract_task_intent", extract_task_intent)
    workflow.add_node("welcome_user", welcome_user)
    # Node cuối cho trường hợp task: sinh câu trả lời cuối cùng
    workflow.add_node("generate_final_answer", generate_final_answer)

    # Entry: bắt đầu từ classify
    workflow.set_entry_point("classify")

    # Conditional edges: classify -> một trong 3 node "Hello trường hợp"
    workflow.add_conditional_edges(
        "classify",
        _route_after_classify,
        {
            "hello_truong_hop_1": "hello_truong_hop_1",
            "hello_truong_hop_2": "hello_truong_hop_2",
            "hello_truong_hop_3": "hello_truong_hop_3",
        },
    )

    # Sau hello 1, 2 -> END. Sau hello 3 -> extract_task_intent -> generate_final_answer -> END
    workflow.add_edge("hello_truong_hop_1", "welcome_user")
    workflow.add_edge("hello_truong_hop_2", END)
    workflow.add_edge("hello_truong_hop_3", "extract_task_intent")
    workflow.add_edge("extract_task_intent", "generate_final_answer")
    workflow.add_edge("generate_final_answer", END)
    workflow.add_edge("welcome_user", END)

    return workflow.compile()


# --- Chạy thử ---
def _initial_state(user_input: str) -> dict:
    return {
        "input": user_input,
        "classification": "",
        "response": "",
        "project_name": "",
        "task_status": "",
        "task_assignee": "",
    }


if __name__ == "__main__":
    os.environ.setdefault("GEMINI_API_KEY", "AIzaSyCyy9_rnQyU1tXr2nGIatNnMWlKPqBBQLk")

    graph = build_agent_graph()

    for user_input in [
        # "Xin chào!",
        # "Thời tiết hôm nay thế nào?",
        # "Cho tôi xem danh sách task của dự án A",
        # "Task in progress của project TaskMate của Nguyễn Văn A",
        "Những task nào đang in progress cần giải quyết nhanh chóng của dự án Website"
    ]:
        print(f"\nInput: {user_input!r}")
        result = graph.invoke(_initial_state(user_input))
        print(f"Classification: {result.get('classification')}")
        print(f"Response: {result.get('response')}")
        # if result.get("classification") == "task":
        #     print(f"  → project_name: {result.get('project_name') or '(trống)'}")
        #     print(f"  → task_status: {result.get('task_status') or '(trống)'}")
        #     print(f"  → task_assignee: {result.get('task_assignee') or '(trống)'}")
        #     # print(f"  → matched_projects: {result.get('matched_projects') or '(trống)'}")
        #     # print(f"  → matched_tasks: {result.get('matched_tasks') or '(trống)'}")
        #     # print(f"  → matched_users: {result.get('matched_users') or '(trống)'}")
        #     # projects infor:
        #     matched_proj = result.get('matched_projects')
        #     if matched_proj:
        #         proj_ids = {p["id"] for p in matched_proj}
        #     else:
        #         proj_ids = {}
        #     matched_users = result.get('matched_users')
        #     if matched_users:
        #         assignee_ids = {u["id"] for u in matched_users}
        #     else:
        #         assignee_ids = {}

        #     tasks = result.get('matched_tasks')

        #     if (len(assignee_ids) > 0) & (len(proj_ids) > 0):
        #         filtered_tasks = [
        #             t for t in tasks
        #             if t.get("projectId") in proj_ids and t.get("assigneeId") in assignee_ids
        #         ]
        #         print("Before:", len(tasks))
        #         print("After:", len(filtered_tasks))
        #     elif (len(assignee_ids) > 0) & (len(proj_ids) == 0):
        #         filtered_tasks = [
        #             t for t in tasks
        #             if t.get("assigneeId") in assignee_ids
        #         ]
        #         print("Before:", len(tasks))
        #         print("After:", len(filtered_tasks))
        #     elif (len(assignee_ids) == 0) & (len(proj_ids) > 0):
        #         filtered_tasks = [
        #             t for t in tasks
        #             if t.get("projectId") in proj_ids
        #         ]
        #         print("Before:", len(tasks))
        #         print("After:", len(filtered_tasks))
        #     else:
        #         print("No matched tasks")
        #         filtered_tasks = []

        #     if len(filtered_tasks) > 0:
        #         for t in filtered_tasks:
        #             print(f"  → task_name: {t['title']}")
        #             print(f"  → task_status: {t['status']}")
        #             print(f"  → task_description: {t['description']}")
        #             print(f"  → task_deadline: {t['deadline']}")
        #             print(f"  → task_priority: {t['priority']}")
        #             print(f"--------------------------------")