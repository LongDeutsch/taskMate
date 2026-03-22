"""
Script thử nhanh OpenAI (tùy chọn).
Đặt OPENAI_API_KEY trong môi trường rồi chạy: python test.py
"""
import os

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage


def main() -> None:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        print("Thiếu OPENAI_API_KEY trong environment.")
        return
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    llm = ChatOpenAI(model=model, temperature=0, api_key=key)
    msg = llm.invoke([HumanMessage(content="Trả lời một câu: 1+1=?")])
    print(getattr(msg, "content", msg))


if __name__ == "__main__":
    main()
