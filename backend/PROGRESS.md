# 后端工作进度

> 本文档是各阶段 Code Agent 的交接文档。每完成一个阶段后更新，供下一阶段 Agent 作为上下文参考。

---

## 当前状态总览

| 阶段 | 状态 | 说明 |
|---|---|---|
| **M0: Mock API + 地基** | ✅ 完成 | 全部 12 Mock 端点 + DB 种子数据 |
| M1: 课程浏览（真实查询） | ⬜ 未开始 | |
| M2: 认证 + 选课（含冲突检测） | ⬜ 未开始 | |
| M3: 评价 + 推荐 | ⬜ 未开始 | |
| M4: 4 层架构重构 | ⬜ 未开始 | |
| M5: 测试 + 部署 | ⬜ 未开始 | |

---

## 已完成工作（M0）

### 1. 项目脚手架

- Python 3.14 虚拟环境: `backend/venv/`
- 依赖已安装并冻结: `backend/requirements.txt`
- 核心依赖: FastAPI, uvicorn, SQLAlchemy, pydantic, python-jose, bcrypt, python-multipart, httpx
- ⚠️ **不使用 passlib**（与 Python 3.14 不兼容），直接使用 `bcrypt` 库

### 2. 目录结构

```
backend/
├── server/
│   ├── src/
│   │   ├── I1_entry/
│   │   │   ├── __init__.py
│   │   │   ├── app.py              ← 当前全部 Mock 逻辑在此（383 行）
│   │   │   └── __main__.py         ← uvicorn 启动入口
│   │   ├── I2_coordinators/
│   │   │   ├── commander/          ← 只有 __init__.py（待实现路由拆分）
│   │   │   ├── data-officer/       ← 只有 __init__.py（待实现中间件）
│   │   │   ├── diplomat/           ← 只有 __init__.py（待实现 CORS）
│   │   │   └── api-docs/           ← 只有 __init__.py（待实现文档配置）
│   │   ├── I3_molecules/
│   │   │   ├── auth-service/       ← 只有 __init__.py
│   │   │   ├── course-service/     ← 只有 __init__.py
│   │   │   ├── review-service/     ← 只有 __init__.py
│   │   │   └── schedule-service/   ← 只有 __init__.py
│   │   └── I4_atoms/
│   │       ├── db/                 ← 只有 __init__.py
│   │       ├── helpers/            ← 只有 __init__.py
│   │       ├── types/              ← 只有 __init__.py
│   │       └── validators/         ← 只有 __init__.py
│   └── tests/                      ← 空
├── database/
│   ├── schema.sql                  ← 5 张表 DDL
│   ├── seed.py                     ← 从 JSON 种子数据（280 行）
│   ├── reset.sh                    ← 一键重置脚本
│   └── app.db                      ← SQLite 数据库文件（已种子）
├── requirements.txt
└── Backend_plan_CH.md              ← 完整开发计划
```

- **I2/I3/I4 子目录当前全部为空**（仅含 `__init__.py`），等待后续阶段实现。
- 路由拆分、Service 层、原子层全部计划在 M1-M4 逐步填充。

### 3. Mock API（app.py）

全部 12 个端点已实现，返回硬编码 JSON。Mock 数据基于真实 LiU 6MICS 课程。

| 方法 | 路径 | 状态 | 认证 |
|---|---|---|---|
| `GET` | `/` | ✅ Mock | 否 |
| `GET` | `/api/courses` | ✅ Mock（支持 keyword/department/credits 筛选） | 否 |
| `GET` | `/api/courses/{id}` | ✅ Mock | 否 |
| `POST` | `/api/auth/register` | ✅ Mock（返回固定用户） | 否 |
| `POST` | `/api/auth/login` | ✅ Mock（返回固定 token） | 否 |
| `GET` | `/api/auth/me` | ✅ Mock（检查 Header 存在） | 是 |
| `POST` | `/api/schedule/enroll/{course_id}` | ✅ Mock（course_id="TDDE" 触发 409 冲突） | 是 |
| `DELETE` | `/api/schedule/drop/{course_id}` | ✅ Mock | 是 |
| `GET` | `/api/schedule` | ✅ Mock（返回 2 门已选课） | 是 |
| `GET` | `/api/courses/{id}/reviews` | ✅ Mock | 否 |
| `POST` | `/api/courses/{id}/reviews` | ✅ Mock | 是 |
| `DELETE` | `/api/reviews/{id}` | ✅ Mock | 是 |
| `GET` | `/api/courses/{id}/recommend` | ✅ Mock | 否 |

**Mock 数据包含 7 门课**：TAMS11, TDDE80, TDDD38, TDDC17, TDDE01, TDTS06, TDDD37

**启动方式**：
```bash
cd backend
source venv/bin/activate
python -m server.src.I1_entry
# 或: uvicorn server.src.I1_entry.app:app --host 0.0.0.0 --port 8000 --reload
# Swagger UI: http://localhost:8000/docs
```

### 4. 数据库

**Schema**（5 张表）：
- `users` — id, username, email, password_hash, role, created_at
- `courses` — id, code, name, description, credits, instructor, department, capacity
- `time_slots` — id, course_id(FK), period(INT 1-8), slot(INT 1-4, CHECK), UNIQUE(course_id, period, slot)
- `reviews` — id, user_id(FK), course_id(FK), rating(1-5, CHECK), comment, created_at, UNIQUE(user_id, course_id)
- `enrollments` — id, user_id(FK), course_id(FK), finished_status(BOOL), enrolled_at, UNIQUE(user_id, course_id)

**种子数据统计**：
| 表 | 行数 | 说明 |
|---|---|---|
| users | 4 | testuser1, testuser2 (密码 password123) + student3, student4 |
| courses | 77 | 全部来自 `data/liu_6mics_courses.json`（LiU 6MICS 硕士项目真实课程） |
| time_slots | 106 | 从 JSON offerings 的 semester+period+time_module 映射而来 |
| enrollments | 22 | 随机生成 |
| reviews | 12 | 随机生成（rating 1-5, 中文评论） |

**时间段映射规则**：
- `period_id = (semester_number - 1) * 2 + period_num` → 值域 1-8
  - Semester 1 Period 1 → 1, Semester 1 Period 2 → 2
  - Semester 2 Period 1 → 3, ...
  - Semester 4 Period 2 → 8
- `slot = time_module` → 值域 1-4（非数字的 time_module 如 "-" 已跳过）

**冲突对数**：238 组自然冲突（同 period + 同 slot 的不同课程对），可用于测试冲突检测。

**重置命令**：
```bash
cd backend && bash database/reset.sh
# 或: cd backend && python database/seed.py
```

### 5. 数据来源

- 文件：`data/liu_6mics_courses.json`（项目根目录）
- 内容：LiU 6MICS 硕士项目课程，77 门课，183 个 offerings
- JSON 路径（seed.py 中）：`BASE_DIR.parent.parent / "data" / "liu_6mics_courses.json"`
- 字段映射：
  - `course_code` → courses.code
  - `course_name` → courses.name
  - `detail.examiner` → courses.instructor
  - `detail.department` → courses.department
  - `credits`（字符串，取第一个数字）→ courses.credits
  - `capacity` → 随机 30-150（JSON 中无此字段）
  - `description` → 随机中文描述（JSON 中无此字段）

---

## 下一步工作（M1: 课程浏览 — 真实数据库查询）

> 对应 `Backend_plan_CH.md` 阶段 2（第 1-4 小时）

### 目标
把 `GET /api/courses` 和 `GET /api/courses/{id}` 从 Mock 替换成真实 SQLite 查询，其余端点暂保持 Mock。

### 具体任务

#### 1. I4 原子层：数据库连接 + ORM 模型

- **`I4_atoms/db/connection.py`**（~40 行）
  - SQLAlchemy `create_engine` + `SessionLocal` + `get_db` 依赖
  - SQLite 路径：`backend/database/app.db`
  
- **`I4_atoms/db/models.py`**（~80 行）
  - ORM 映射 5 张表：`User`, `Course`, `TimeSlot`, `Review`, `Enrollment`
  - 关系：Course ↔ TimeSlot (1:N), Course ↔ Review (1:N), User ↔ Enrollment (N:M)

- **`I4_atoms/types/schemas.py`**（~40 行，先写课程相关部分）
  - `CourseResponse` — 含 time_slots, enrolled_count, avg_rating
  - `TimeSlotResponse` — period + slot
  - `CourseListResponse` — courses 数组 + total

#### 2. I3 分子层：课程业务逻辑

- **`I3_molecules/course-service/course_service.py`**
  - `list_courses(db, keyword?, department?, credits?)` → 带筛选的查询
  - `get_course(db, course_id)` → 详情含 period-slot、平均评分（AVG）、选课人数（COUNT）

#### 3. I2 替换 Mock

- 在 `app.py` 中替换 `GET /api/courses` 和 `GET /api/courses/{id}` 为真实查询
- **不拆分路由文件**（拆分放到 M4）
- 其余端点保持 Mock 不变

### 验证标准
- `GET /api/courses` 返回 77 门课程（来自数据库）
- `GET /api/courses?keyword=machine` 返回匹配课程
- `GET /api/courses/1` 返回课程详情，含 time_slots 数组、avg_rating、enrolled_count
- 其余 Mock 端点不受影响

---

## 后续阶段提纲

### M2: 认证 + 选课（含冲突检测）
- `password.py` + `jwt_helper.py` + `schedule_validator.py`（I4 原子）
- `auth_service.py`（I3）— register/login/me
- `schedule_service.py`（I3）— enroll（含 period-slot 冲突检测）/drop/get_schedule
- 替换认证 + 选课 Mock 端点
- **冲突检测核心**：同 period 内 slot 相同即冲突，SQL 一句搞定

### M3: 评价 + 推荐
- `review_service.py`（I3）— create/get/delete review
- 推荐 API — "选了这门课的人还选了什么"（一条 SQL）
- 全局错误处理（ValueError→400, LookupError→404, IntegrityError→409）
- **全部 12 个端点替换为真实逻辑**

### M4: 4 层架构重构
- 从 app.py 拆分路由到 I2 commander（auth_router, course_router, review_router, schedule_router）
- 抽取中间件到 I2 data-officer
- 抽取 CORS 到 I2 diplomat
- app.py 简化为纯入口（include_router + 注册中间件）
- 架构验证：I4 不 import 上层，I3 只 import I4，无交叉依赖

### M5: 测试 + 部署
- smoke_test.py（Demo 路径自动化测试）
- 边界用例测试
- Dockerfile + 部署

---

## 关键注意事项（给下一阶段 Agent）

1. **不使用 passlib** — Python 3.14 下 passlib 与 bcrypt 不兼容（`AttributeError: module 'bcrypt' has no attribute '__about__'`），使用 `import bcrypt; bcrypt.hashpw()` 直接调用
2. **虚拟环境** — 先 `cd backend && source venv/bin/activate` 再执行任何 Python 命令
3. **启动服务器** — `cd backend && uvicorn server.src.I1_entry.app:app --reload`（工作目录必须是 `backend/`）
4. **数据库路径** — `backend/database/app.db`（SQLite）
5. **JSON 数据路径** — 从 backend/ 出发是 `../data/liu_6mics_courses.json`
6. **Python 包路径**：目录含连字符（如 `auth-service`）不能直接 import，可能需要 sys.path 处理或重命名
7. **当前 app.py 是单文件** — 所有逻辑堆在一起，后续阶段逐步替换 Mock 为真实逻辑，M4 再拆分文件
8. **种子数据中有 238 组时间冲突对** — 可直接用于测试冲突检测功能
9. **测试用户密码** — testuser1/testuser2 密码均为 `password123`（bcrypt hash 存储）
