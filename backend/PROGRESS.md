# 后端工作进度

> 本文档是各阶段 Code Agent 的交接文档。每完成一个阶段后更新，供下一阶段 Agent 作为上下文参考。

---

## 当前状态总览

| 阶段 | 状态 | 说明 |
|---|---|---|
| **M0: Mock API + 地基** | ✅ 完成 | 全部 12 Mock 端点 + DB 种子数据 |
| **M1: 课程浏览（真实查询）** | ✅ 完成 | GET /api/courses 和 GET /api/courses/{id} 已替换为真实 DB 查询；I4 原子层（Person B）全部完成 |
| **M2: 认证 + 选课（含冲突检测）** | ✅ 完成 | Person A（认证）+ Person B（选课）均已完成；9 步交叉验证全部通过 |
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
│   │   │   ├── course-service/     ← 已实现 course_service.py
│   │   │   ├── review-service/     ← 只有 __init__.py
│   │   │   └── schedule-service/   ← 只有 __init__.py
│   │   └── I4_atoms/
│   │       ├── db/                 ← 已实现 connection.py, models.py
│   │       ├── helpers/            ← 已实现 password.py, jwt_helper.py
│   │       ├── types/              ← 已实现 schemas.py（部分）
│   │       └── validators/         ← 已实现 schedule_validator.py, review_validator.py
│   └── tests/                      ← 空
├── database/
│   ├── schema.sql                  ← 5 张表 DDL
│   ├── seed.py                     ← 从 JSON 种子数据（280 行）
│   ├── reset.sh                    ← 一键重置脚本
│   └── app.db                      ← SQLite 数据库文件（已种子）
├── requirements.txt
└── Backend_plan_CH.md              ← 完整开发计划
```

- **I2/I3/I4 子目录当前部分已实现**，其余等待后续阶段填充。
- 路由拆分、Service 层、原子层全部计划在 M1-M4 逐步填充。

### 3. Mock API（app.py）

全部 12 个端点已实现，返回硬编码 JSON。Mock 数据基于真实 LiU 6MICS 课程。

| 方法 | 路径 | 状态 | 认证 |
|---|---|---|---|
| `GET` | `/` | ✅ Mock | 否 |
| `GET` | `/api/courses` | ✅ **真实 DB** | 否 |
| `GET` | `/api/courses/{id}` | ✅ **真实 DB** | 否 |
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
- `enrollments` — id, user_id(FK), course_id(FK), finished_status(BOOL), score(INT 0-100, nullable, only for completed courses), enrolled_at, UNIQUE(user_id, course_id)

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

## 已完成工作（M1 — 课程浏览：真实数据库查询）

> 对应 `Backend_plan_CH.md` 阶段 2 — Person A 部分（数据库连接 + ORM + 课程查询）

### 1. I4 原子层：数据库连接 + ORM 模型 + Pydantic Schemas

- **`I4_atoms/db/connection.py`**（41 行）✅
  - SQLAlchemy `create_engine` + `SessionLocal` + `get_db` FastAPI 依赖
  - SQLite 路径：通过相对路径定位 `backend/database/app.db`
  - `check_same_thread=False` 配置（SQLite + FastAPI 必需）
  - `Base`（DeclarativeBase）供 ORM 模型继承
  - 含 `if __name__ == "__main__"` 自测代码

- **`I4_atoms/db/models.py`**（97 行）✅
  - ORM 映射全部 5 张表：`User`, `Course`, `TimeSlot`, `Review`, `Enrollment`
  - 使用 SQLAlchemy 2.0 风格（`Mapped` + `mapped_column`）
  - 关系配置完整：
    - Course ↔ TimeSlot (1:N, cascade delete-orphan)
    - Course ↔ Enrollment (1:N)
    - Course ↔ Review (1:N)
    - User ↔ Enrollment (1:N)
    - User ↔ Review (1:N)
  - 约束：UniqueConstraint + CheckConstraint 与 schema.sql 保持一致
  - 含 `if __name__ == "__main__"` 自测代码

- **`I4_atoms/types/schemas.py`**（57 行）✅ — 目前仅课程相关部分
  - `TimeSlotResponse` — period + slot，`from_attributes=True`
  - `CourseResponse` — 含 time_slots, enrolled_count, avg_rating，带 `json_schema_extra` Swagger 示例
  - `CourseListResponse` — courses 数组 + total
  - ⚠️ **待后续阶段补充**：`UserRegister`/`UserLogin`/`UserResponse`/`ScheduleResponse`/`EnrollmentResponse`/`ReviewResponse` 等

### 2. I3 分子层：课程业务逻辑

- **`I3_molecules/course-service/course_service.py`**（87 行）✅
  - `_build_course_response(course, db)` — 内部辅助函数，构建含计算字段的 CourseResponse：
    - `enrolled_count`：`SELECT COUNT(*) FROM enrollments WHERE course_id = ?`（实时计算，无冗余字段）
    - `avg_rating`：`SELECT AVG(rating) FROM reviews WHERE course_id = ?`（四舍五入 2 位小数）
    - `time_slots`：从 ORM relationship 直接读取
  - `list_courses(db, keyword?, department?, credits?)` — 带筛选的课程列表查询
    - keyword 模糊匹配 name、description、code（ilike）
    - department 精确匹配
    - credits 精确匹配
    - 按 code 排序
  - `get_course(db, course_id)` — 课程详情，不存在时 raise `LookupError`
  - 含 `if __name__ == "__main__"` 自测代码

- **`I3_molecules/course-service/__init__.py`** ✅
  - 使用 `importlib` 动态加载（因目录含连字符 `course-service` 不能直接 import）
  - 重导出 `list_courses` 和 `get_course`

### 3. I1 入口层：app.py 更新

- **`I1_entry/app.py`** 已更新（版本 0.2.0）：
  - `GET /api/courses` — ✅ **真实 DB 查询**（替换 Mock）
  - `GET /api/courses/{id}` — ✅ **真实 DB 查询**（替换 Mock）
  - 使用 `Depends(get_db)` 注入数据库会话
  - 使用 `importlib` 动态导入 course-service（绕过连字符目录名限制）
  - `LookupError` → `HTTPException(404)`
  - 其余 10 个端点保持 Mock 不变
  - MOCK 数据仍保留在文件中（供 Mock 端点使用）

### 4. 当前端点状态

| 方法 | 路径 | 状态 | 认证 |
|---|---|---|---|
| `GET` | `/` | ✅ Mock | 否 |
| `GET` | `/api/courses` | ✅ **真实 DB** | 否 |
| `GET` | `/api/courses/{id}` | ✅ **真实 DB** | 否 |
| `POST` | `/api/auth/register` | ✅ Mock | 否 |
| `POST` | `/api/auth/login` | ✅ Mock | 否 |
| `GET` | `/api/auth/me` | ✅ Mock | 是 |
| `POST` | `/api/schedule/enroll/{course_id}` | ✅ Mock（course_id="TDDE" 触发 409 冲突） | 是 |
| `DELETE` | `/api/schedule/drop/{course_id}` | ✅ Mock | 是 |
| `GET` | `/api/schedule` | ✅ Mock（返回 2 门已选课） | 是 |
| `GET` | `/api/courses/{id}/reviews` | ✅ Mock | 否 |
| `POST` | `/api/courses/{id}/reviews` | ✅ Mock | 是 |
| `DELETE` | `/api/reviews/{id}` | ✅ Mock | 是 |
| `GET` | `/api/courses/{id}/recommend` | ✅ Mock | 否 |

### 5. I4 原子层（Person B 部分）— ✅ 已完成

> 对应 `Backend_plan_CH.md` 阶段 2 — Person B 职责（认证基础设施 + 验证器）

全部 4 个原子文件已实现并通过独立自测验证：

- **`I4_atoms/helpers/password.py`**（26 行）✅
  - `hash_password(plain: str) -> str` — bcrypt 哈希，返回 UTF-8 字符串
  - `verify_password(plain: str, hashed: str) -> bool` — bcrypt 校验
  - ⚠️ 使用 `import bcrypt` 直接调用（**不用 passlib**，Python 3.14 不兼容）
  - 含 `if __name__ == "__main__"` 自测代码
  - ✅ 验证结果：哈希生成正确，正确密码通过，错误密码拒绝

- **`I4_atoms/helpers/jwt_helper.py`**（42 行）✅
  - `create_token(user_id: int, username: str) -> str` — 生成 JWT（HS256，24h 过期）
  - `decode_token(token: str) -> dict` — 解码并验证 JWT，无效/过期时 raise `JWTError`
  - payload 结构：`{"sub": "用户ID字符串", "username": "用户名", "exp": 过期时间戳}`
  - Secret key 从环境变量 `JWT_SECRET` 读取，默认值供开发使用
  - 含 `if __name__ == "__main__"` 自测代码
  - ✅ 验证结果：Token 生成成功，解码 payload 含 sub="1" + username="testuser1"

- **`I4_atoms/validators/schedule_validator.py`**（37 行）✅
  - `check_slot_conflict(existing_slots: list[tuple[int,int]], new_slots: list[tuple[int,int]]) -> list[tuple[int,int]]`
  - 纯函数：入参为 `(period, slot)` 元组列表，返回冲突的 `(period, slot)` 列表
  - 冲突规则：同 period + 同 slot = 冲突（set 交集实现，O(n)）
  - 返回空列表 = 无冲突
  - 含 `if __name__ == "__main__"` 自测代码
  - ✅ 验证结果：冲突检测正确 `[(1,2)]`，无冲突返回 `[]`

- **`I4_atoms/validators/review_validator.py`**（57 行）✅
  - `validate_rating(rating: int) -> int` — 校验评分 1-5，无效 raise `ValueError`
  - `validate_comment(comment: str | None, max_length: int = 2000) -> str | None` — 清洗评论：strip 空白、空→None、超长 raise `ValueError`
  - 含 `if __name__ == "__main__"` 自测代码
  - ✅ 验证结果：rating 范围校验、comment strip/null/长度校验均正确

### M1 验证结果
- ✅ `GET /api/courses` 返回 77 门课程（来自数据库）
- ✅ `GET /api/courses?keyword=machine` 返回匹配课程
- ✅ `GET /api/courses/1` 返回课程详情，含 time_slots 数组、avg_rating、enrolled_count
- ✅ 其余 Mock 端点不受影响

---

## 已完成工作（M2 — 认证 + 选课：含冲突检测）

> 对应 `Backend_plan_CH.md` 阶段 3（第 4-8 小时）— **生死线里程碑**
> Person A = 认证（auth），Person B = 选课（schedule）

### 1. I4 原子层：补充 Pydantic Schemas

- **`I4_atoms/types/schemas.py`**（228 行）✅ — 从仅课程相关扩展为完整 schema 集
  - **M1 已有**：`TimeSlotResponse`、`CourseResponse`、`CourseListResponse`
  - **M2 Person A 新增**：
    - `UserRegister` — username(3-50) + email(5-100) + password(6-128)，含 Field 验证
    - `UserLogin` — username + password
    - `UserResponse` — id, username, email, role, created_at，`from_attributes=True`
    - `TokenResponse` — access_token + token_type("bearer") + user(UserResponse)
  - **M2 Person B 新增**：
    - `EnrollmentCourseResponse` — 选课记录中嵌套的课程简要信息（不含 capacity/enrolled_count/avg_rating）
    - `ScheduleEntry` — enrollment_id + course(EnrollmentCourseResponse) + enrolled_at + finished_status + score
    - `ScheduleResponse` — schedule(list[ScheduleEntry]) + total_credits
    - `EnrollmentSuccess` — message + enrollment(dict)
    - `ConflictDetail` — period + slot + conflicting_course_id + conflicting_course_name
    - `EnrollmentConflict` — message + conflicts(list[ConflictDetail])
  - 全部 schema 均含 `json_schema_extra` Swagger 示例

### 2. I3 分子层：认证业务逻辑（Person A）

- **`I3_molecules/auth-service/auth_service.py`**（90 行）✅
  - `register(db, username, email, password)` → 检查用户名/邮箱唯一 → bcrypt 哈希密码 → INSERT → 返回 `UserResponse`
    - 用户名重复 raise `ValueError("Username 'xxx' is already taken")`
    - 邮箱重复 raise `ValueError("Email 'xxx' is already registered")`
  - `login(db, username, password)` → 查用户 → `verify_password` → `create_token` → 返回 `TokenResponse`
    - 凭证无效 raise `ValueError("Invalid username or password")`
  - `get_user_by_id(db, user_id)` → 查用户 → 返回 `UserResponse`（用于 JWT 中间件解析后查用户）
    - 不存在 raise `LookupError("User {id} not found")`
  - 含 `if __name__ == "__main__"` 自测代码

- **`I3_molecules/auth-service/__init__.py`** ✅
  - `importlib` 动态加载，重导出 `register`、`login`、`get_user_by_id`

### 3. I3 分子层：选课业务逻辑（Person B）

- **`I3_molecules/schedule-service/schedule_service.py`**（214 行）✅
  - `enroll(db, user_id, course_id)` → **4 层检查链**：
    1. 课程存在检查 → 不存在 raise `LookupError`
    2. 重复选课检查 → 已选 raise `ValueError("Already enrolled in this course")`
    3. 容量检查（`COUNT(enrollments)` vs `course.capacity`）→ 满员 raise `ValueError("Course is full")`
    4. **Slot 冲突检测**：
       - 查目标课程的 `(period, slot)` 列表
       - 查用户已选所有课程的 `(period, slot)` + 课程名信息（JOIN TimeSlot + Course + Enrollment）
       - 调用 `check_slot_conflict()` 纯函数检测交集
       - 有冲突 raise `ValueError({"message": "Time slot conflict", "conflicts": [...]})` — conflicts 含 period, slot, conflicting_course_id, conflicting_course_name
    5. 全部通过 → INSERT enrollment → 返回 `{message, enrollment: {enrollment_id, course_id, course_name, enrolled_at}}`
  - `drop(db, user_id, course_id)` → 查 enrollment → 不存在 raise `LookupError` → DELETE → 返回确认
  - `get_schedule(db, user_id)` → 查用户全部 enrollment → 逐条构建 `ScheduleEntry`（含 `EnrollmentCourseResponse` + `TimeSlotResponse`）→ 返回 `ScheduleResponse(schedule, total_credits)`
  - 含 `if __name__ == "__main__"` 自测代码

- **`I3_molecules/schedule-service/__init__.py`**（10 行）✅
  - `importlib` 动态加载，重导出 `enroll`、`drop`、`get_schedule`

### 4. I1 入口层：app.py 更新

- **`I1_entry/app.py`**（419 行）已更新（版本 **0.4.0**）：
  - 新增 `schedule-service` 的 importlib 动态导入（`schedule_enroll`, `schedule_drop`, `schedule_get`）
  - **Auth 中间件**：`get_current_user` FastAPI Depends 依赖
    - Bearer token → `decode_token` 解 JWT → `int(payload["sub"])` 取 user_id → `auth_get_user_by_id` 查用户
    - 无效/过期 token → `HTTPException(401, "Invalid or expired token")`
    - 用户不存在 → `HTTPException(401, "User not found")`
  - **认证端点**（替换 Mock → 真实 DB）：
    - `POST /api/auth/register` → `auth_register` → 409 on duplicate
    - `POST /api/auth/login` → `auth_login` → 401 on invalid credentials
    - `GET /api/auth/me` → `get_current_user` → 返回当前用户信息
  - **选课端点**（替换 Mock → 真实 DB）：
    - `POST /api/schedule/enroll/{course_id}` → `schedule_enroll` → 404(课程不存在) / 409(重复/满员/冲突)
    - `DELETE /api/schedule/drop/{course_id}` → `schedule_drop` → 404(未选该课)
    - `GET /api/schedule` → `schedule_get` → 返回 ScheduleResponse
  - 冲突错误处理：`ValueError` 的 `args[0]` 为 dict 时返回 409 + conflict detail，为字符串时返回 409 + 文本
  - 其余 4 个端点（reviews × 3 + recommend × 1）保持 Mock

### 5. 当前端点状态

| 方法 | 路径 | 状态 | 认证 |
|---|---|---|---|
| `GET` | `/` | ✅ Mock | 否 |
| `GET` | `/api/courses` | ✅ **真实 DB** | 否 |
| `GET` | `/api/courses/{id}` | ✅ **真实 DB** | 否 |
| `POST` | `/api/auth/register` | ✅ **真实 DB** | 否 |
| `POST` | `/api/auth/login` | ✅ **真实 DB** | 否 |
| `GET` | `/api/auth/me` | ✅ **真实 DB** | 是（Bearer JWT） |
| `POST` | `/api/schedule/enroll/{course_id}` | ✅ **真实 DB**（含 4 层检查 + slot 冲突检测） | 是（Bearer JWT） |
| `DELETE` | `/api/schedule/drop/{course_id}` | ✅ **真实 DB** | 是（Bearer JWT） |
| `GET` | `/api/schedule` | ✅ **真实 DB** | 是（Bearer JWT） |
| `GET` | `/api/courses/{id}/reviews` | ✅ Mock | 否 |
| `POST` | `/api/courses/{id}/reviews` | ✅ Mock | 是（Bearer JWT） |
| `DELETE` | `/api/reviews/{id}` | ✅ Mock | 是（Bearer JWT） |
| `GET` | `/api/courses/{id}/recommend` | ✅ Mock | 否 |

**真实 DB 端点：9/13（69%）| Mock 端点：4/13（31%）**

### 6. 测试文件

- **`test_auth_smoke.py`**（57 行）✅ — 认证模块单元级冒烟测试
  - 验证 seed 用户存在 → 调用 `login()` → `get_user_by_id()` → 错误密码拒绝 → `register()` + 清理 → 重复用户名拒绝
  - ✅ 全部通过

- **`test_auth_e2e.py`**（102 行）✅ — 认证端点 HTTP 级 E2E 测试
  - 11 步：health check → register → duplicate → login → wrong password → GET /me → no token → invalid token → seed user login → schedule with auth → courses
  - ✅ 全部通过

- **`test_schedule_e2e.py`**（123 行）✅ — **M2 生死线 9 步交叉验证**
  - 自动从 DB 中查找两门存在 slot 冲突的课程（动态，不硬编码）
  - 9 步主流程 + 3 个 bonus 边界用例：
    1. 注册新用户 → 201 ✅
    2. 登录 → 获取 JWT ✅
    3. 身份验证（GET /me）✅
    4. 选课程 A（占用冲突 slot）→ 成功 ✅
    5. 选课程 B（同 period/slot）→ **409 + conflict detail**（含 period, slot, conflicting_course_id, conflicting_course_name）✅
    6. 查看课表 → 1 门课，学分正确 ✅
    7. 退课程 A → 成功 ✅
    8. 查看课表 → 空，0 学分 ✅
    9. 再选课程 B（冲突已释放）→ 成功 ✅
    - [bonus] 重复选课 → 409 ✅
    - [bonus] 退未选的课 → 404 ✅
    - [bonus] 选不存在的课 → 404 ✅
  - 测试结束自动清理用户 + enrollment
  - ✅ 全部 12 条断言通过

### M2 验证结果
- ✅ 认证流程完整：注册 → 登录 → JWT → /me 身份验证
- ✅ 选课 4 层检查链：课程存在 → 重复选课 → 容量 → slot 冲突
- ✅ 冲突检测返回具体冲突信息（period, slot, conflicting_course_id, conflicting_course_name）
- ✅ 退课后冲突释放，原冲突课程可选
- ✅ 全部 3 个测试文件通过（smoke + auth e2e + schedule e2e）
- ✅ 核心闭环打通：**注册 → 登录 → 浏览 → 选课 → 冲突检测 → 查看课表 → 退课 → 再选**

---

## 下一步工作（M3: 评价 + 推荐）

> 对应 `Backend_plan_CH.md` 阶段 4 — 最后 4 个 Mock 端点替换为真实逻辑

### 目标
完成全部端点的真实 DB 替换，实现评价系统 + "选了这门课的人还选了什么"推荐功能。

### 具体任务

#### 1. I4 原子层：补充 schemas

- **`I4_atoms/types/schemas.py`** 追加：
  - `ReviewCreate` — rating(1-5) + comment
  - `ReviewResponse` — id, user_id, username, course_id, rating, comment, created_at
  - `ReviewListResponse` — reviews 数组 + avg_rating + total
  - `RecommendationResponse` — 推荐课程列表

#### 2. I3 分子层：评价 + 推荐业务逻辑

- **`I3_molecules/review-service/review_service.py`**
  - `get_reviews(db, course_id)` → 查评价列表 + 平均评分 + 总数
  - `create_review(db, user_id, course_id, rating, comment)` → 调用 `validate_rating` / `validate_comment` → 插入（UNIQUE 约束防重复）
  - `delete_review(db, user_id, review_id)` → 检查是否本人评价 → 删除

- **推荐逻辑**（可在 course_service.py 或单独文件中）
  - `get_recommendations(db, course_id)` → 一条 SQL："选了这门课的人还选了什么"（GROUP BY + COUNT + ORDER BY）

#### 3. 替换 app.py 中最后 4 个 Mock 端点

- `GET /api/courses/{id}/reviews` → 真实 DB
- `POST /api/courses/{id}/reviews` → 真实 DB
- `DELETE /api/reviews/{id}` → 真实 DB
- `GET /api/courses/{id}/recommend` → 真实 DB

#### 4. 全局错误处理统一
- `ValueError` → 400/409
- `LookupError` → 404
- `IntegrityError` → 409

### 验证标准
- 全部 13 个端点均为真实 DB 查询
- 评价流程：提交评价 → 查看评价列表 → 删除自己的评价
- 推荐功能：选了课程 A 的人还选了哪些课
- 可清除 app.py 中全部 MOCK 数据常量

---

## 后续阶段提纲

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
6. **Python 包路径**：目录含连字符（如 `course-service`）不能直接 import，已通过 `importlib` 动态加载解决（参见 `course-service/__init__.py` 和 `app.py` 中的导入方式）
7. **当前 app.py 是单文件** — 9 个端点已接真实 DB，其余 4 个端点仍为 Mock，M3 替换后 M4 再拆分文件
8. **种子数据中有 238 组时间冲突对** — 已被 `test_schedule_e2e.py` 动态利用（自动查找冲突对）
9. **测试用户密码** — testuser1/testuser2 密码均为 `password123`（bcrypt hash 存储）
10. **已实现的 I4 文件**：`connection.py`、`models.py`、`schemas.py`（完整 — 课程 + 认证 + 选课 schema）、`password.py`、`jwt_helper.py`、`schedule_validator.py`、`review_validator.py` — **I4 原子层全部完成**
11. **已实现的 I3 文件**：`course_service.py`、`auth_service.py`、`schedule_service.py` — 仅剩 `review_service.py` 待实现
12. **app.py 版本号** 已更新为 `0.4.0`，MOCK 数据仍保留在文件中供剩余 4 个 Mock 端点使用（M3 完成后可清除）
13. **JWT payload 格式**：`{"sub": "用户ID", "username": "用户名", "exp": 过期时间戳}`，`sub` 是字符串类型（`str(user_id)`），使用时需 `int(payload["sub"])` 转回整数
14. **schedule_validator 使用方式**：`check_slot_conflict(existing, new)` 入参均为 `list[tuple[int,int]]`（period, slot），返回冲突列表
15. **冲突错误传递模式**：`schedule_service.enroll()` 检测到冲突时 raise `ValueError(dict)`，`app.py` 通过 `isinstance(e.args[0], dict)` 区分冲突（409 + detail dict）和普通业务错误（409 + 文本）
16. **认证依赖注入**：受保护端点使用 `current_user: UserResponse = Depends(get_current_user)` 获取当前用户，`get_current_user` 内部解析 Bearer token → decode JWT → 查用户
17. **已有 3 个测试文件**：`test_auth_smoke.py`（57 行）、`test_auth_e2e.py`（102 行）、`test_schedule_e2e.py`（123 行），全部通过
18. **review_validator.py 已就绪**：`validate_rating(rating)` 和 `validate_comment(comment)` 可直接 import 使用，M3 的 `review_service.py` 应调用这两个验证函数
