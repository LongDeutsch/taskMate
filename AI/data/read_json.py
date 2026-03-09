import json
from pathlib import Path
from typing import Any, Union

def read_json(path: Union[str, Path]) -> Any:
    p = Path(path).expanduser()
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)

# dùng:
input_path = "AI/data/projects.json"   # hoặc "~/Desktop/data.json"
projects = read_json(input_path)
print('projects:')
print(len(projects))
print(projects[0].keys())

input_path = "AI/data/tasks.json"   # hoặc "~/Desktop/data.json"
tasks = read_json(input_path)
print('tasks:')
print(len(tasks))
print(tasks[0].keys())

input_path = "AI/data/users.json"   # hoặc "~/Desktop/data.json"
users = read_json(input_path)
print('users:')
print(len(users))
print(users[0].keys())

project='Website Công ty'
status='InProgress'
assignee='Nguyễn Văn A'

print('--------------------------------')
for i in range(len(projects)):
    if projects[i]['name'] == project:
        proj_name = projects[i]['name']
        proj_id = projects[i]['id'] 
        proj_description = projects[i]['description']
        print(f'project_name: {proj_name}')
        print(f'project_id: {proj_id}')
        print(f'project_description: {proj_description}')
        print('--------------------------------')

print('--------------------------------')
for i in range(len(tasks)):
    if tasks[i]['status'] == status:
        task_name = tasks[i]['title']
        task_id = tasks[i]['id']
        task_description = tasks[i]['description']
        proj_id = tasks[i]['projectId']
        assignee_id = tasks[i]['assigneeId']
        # print(f'task_name: {task_name}')
        # print(f'task_id: {task_id}')
        # print(f'task_description: {task_description}')  
        print(f'project_id: {proj_id}')
        print(f'assignee_id: {assignee_id}')
        print('--------------------------------')

print('--------------------------------')
for i in range(len(users)):
    if users[i]['fullName'] == assignee:
        user_name = users[i]['fullName']
        user_id = users[i]['id']
        user_role = users[i]['role']
        print(f'user_name: {user_name}')
        print(f'user_id: {user_id}')
        print(f'user_role: {user_role}')


# matched_proj: list[dict]  (mỗi dict có key 'id')
# matched_assignee: list[dict] (mỗi dict có key 'id')
# matched_tasks: list[dict] (mỗi dict có key 'projectId', 'assigneeId', ...)

proj_ids = {'proj-1'}
assignee_ids = {'u-1'}
if (len(assignee_ids) > 0) & (len(proj_ids) > 0):
    filtered_tasks = [
        t for t in tasks
        if t.get("projectId") in proj_ids and t.get("assigneeId") in assignee_ids
    ]
    print("Before:", len(tasks))
    print("After:", len(filtered_tasks))
elif (len(assignee_ids) > 0) & (len(proj_ids) == 0):
    filtered_tasks = [
        t for t in tasks
        if t.get("assigneeId") in assignee_ids
    ]
    print("Before:", len(tasks))
    print("After:", len(filtered_tasks))
elif (len(assignee_ids) == 0) & (len(proj_ids) > 0):
    filtered_tasks = [
        t for t in tasks
        if t.get("projectId") in proj_ids
    ]
    print("Before:", len(tasks))
    print("After:", len(filtered_tasks))
else:
    print("No matched tasks")
    filtered_tasks = []
