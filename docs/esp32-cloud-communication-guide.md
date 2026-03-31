# ESP32S3 与云服务器通信对接文档

本文档面向 `Seeed XIAO ESP32S3 Sense` 硬件开发，说明设备如何与 Hush 云服务器通信。

对应后端实现：
- [backend/src/server.js](/Users/jimjimu/Documents/GitHub/hush-app/backend/src/server.js)
- [backend/src/database.js](/Users/jimjimu/Documents/GitHub/hush-app/backend/src/database.js)

对应协议摘要：
- [docs/cloud-hardware-api.md](/Users/jimjimu/Documents/GitHub/hush-app/docs/cloud-hardware-api.md)

## 1. 云服务器信息

当前云服务器公网 IP：

```text
111.229.204.242
```

当前后端对外基础地址：

```text
http://111.229.204.242/hush-api
```

说明：
- 目前通信方式是 `HTTP + JSON`
- 当前未启用鉴权
- 当前未启用 HTTPS
- ESP32 不需要和手机直接通信
- 手机和 ESP32 都只与云服务器通信

## 2. 总体通信架构

链路如下：

```text
手机 App  -> 云后端 -> 命令队列 -> ESP32
ESP32     -> 云后端 -> 心跳 / telemetry / ACK
ESP32     -> 云后端 -> assistant-responses -> 手机 App TTS
```

职责划分：
- 手机 App 负责开始 session、停止 session、调整节奏
- 云后端负责保存 session、生成命令、维护设备在线状态、保存 telemetry
- ESP32 负责定时发 heartbeat、轮询命令、执行振动、上传传感器数据

## 3. 设备侧必须实现的 6 个能力

ESP32 固件最少要实现：

1. Wi-Fi 联网
2. 周期性 heartbeat
3. 周期性轮询命令
4. 命令 ACK
5. 9 轴数据批量上传
6. LLM 文字回复上传

其中真正控制振动马达的关键链路是：

1. 手机点击 `Start Session`
2. App 调用 `POST /sessions`
3. 云后端创建 session，并写入一条 `session_start` 命令
4. ESP32 轮询 `GET /devices/:deviceId/commands/next`
5. ESP32 收到 `session_start`
6. ESP32 按 `inhale / hold / exhale / cycles` 执行振动
7. ESP32 调用 ACK 接口确认命令已执行

## 4. 设备固定身份

当前默认设备标识：

```text
deviceId   = seeed-xiao-esp32s3-sense-001
deviceName = Seeed XIAO ESP32S3 Sense
```

要求：
- 固件里必须固定使用同一个 `deviceId`
- App 和后端会按这个 `deviceId` 识别设备
- 如果固件改了 `deviceId`，前端也要同步改 [/.env.local](/Users/jimjimu/Documents/GitHub/hush-app/.env.local)

## 5. 推荐通信频率

建议采用如下节奏：

- `heartbeat`：每 `5 秒` 一次
- `commands/next`：每 `1 秒` 一次
- `telemetry`：每 `10~20 条样本` 或每 `1 秒` 批量上传一次
- `ack`：收到命令后立即发 `received`，动作落地后发 `completed`

在线规则：
- 后端以最近一次 heartbeat 时间计算设备是否在线
- 超过 `45 秒` 没 heartbeat，则设备视为 `offline`

## 6. 接口总览

### 设备侧会调用的接口

| 用途 | 方法 | 路径 |
|---|---|---|
| 上报设备在线 | `POST` | `/devices/heartbeat` |
| 拉取待执行命令 | `GET` | `/devices/:deviceId/commands/next` |
| 确认命令执行状态 | `POST` | `/devices/:deviceId/commands/:commandId/ack` |
| 上传 9 轴数据 | `POST` | `/devices/:deviceId/telemetry` |
| 上传 LLM 文字回复 | `POST` | `/devices/:deviceId/assistant-responses` |

### 手机端会调用的接口

| 用途 | 方法 | 路径 |
|---|---|---|
| 查询设备状态 | `GET` | `/devices/:deviceId` |
| 开始 session | `POST` | `/sessions` |
| 更新 session 状态 | `POST` | `/sessions/:sessionId/status` |
| 预览呼吸节奏 | `POST` | `/devices/:deviceId/rhythm-preview` |
| 拉取下一条待播报文字 | `GET` | `/devices/:deviceId/assistant-responses/next` |
| 回 ACK 标记手机已播放 | `POST` | `/devices/:deviceId/assistant-responses/:responseId/ack` |

## 7. 接口详细说明

### 7.1 心跳接口

```http
POST /devices/heartbeat
Content-Type: application/json
```

完整地址：

```text
http://111.229.204.242/hush-api/devices/heartbeat
```

请求体：

```json
{
  "deviceId": "seeed-xiao-esp32s3-sense-001",
  "deviceName": "Seeed XIAO ESP32S3 Sense",
  "hardwareModel": "Seeed XIAO ESP32S3 Sense",
  "firmwareVersion": "1.0.0",
  "batteryLevel": 88,
  "wifiRssi": -56,
  "ipAddress": "192.168.1.6",
  "sentAt": "2026-03-30T16:00:00.000Z"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `deviceId` | string | 是 | 设备唯一标识 |
| `deviceName` | string | 是 | 设备显示名称 |
| `hardwareModel` | string | 否 | 型号，建议固定写 `Seeed XIAO ESP32S3 Sense` |
| `firmwareVersion` | string | 否 | 当前固件版本 |
| `batteryLevel` | number | 否 | 电量百分比 |
| `wifiRssi` | number | 否 | Wi-Fi 信号强度 |
| `ipAddress` | string | 否 | 当前局域网 IP |
| `sentAt` | string | 是 | 发送时间，ISO8601 字符串 |

响应：

```http
204 No Content
```

失败处理：
- 若返回 `400`，通常是字段缺失
- 若超时或网络错误，等待下一个 heartbeat 周期重试

### 7.2 拉取命令接口

```http
GET /devices/:deviceId/commands/next
```

完整地址：

```text
http://111.229.204.242/hush-api/devices/seeed-xiao-esp32s3-sense-001/commands/next
```

成功响应示例：

```json
{
  "commandId": "cmd-1774881605000-uuid",
  "deviceId": "seeed-xiao-esp32s3-sense-001",
  "sessionId": "session-1774881600000-uuid",
  "type": "session_start",
  "queuedAt": "2026-03-30T16:00:05.000Z",
  "payload": {
    "type": "session_start",
    "sessionId": "session-1774881600000-uuid",
    "rhythm": {
      "inhaleMs": 4000,
      "holdMs": 7000,
      "exhaleMs": 8000,
      "cycles": 32
    },
    "vibration": "medium",
    "sentAt": "2026-03-30T16:00:05.000Z"
  }
}
```

无命令响应：

```http
204 No Content
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `commandId` | string | 命令唯一 ID，ACK 时必须带回 |
| `deviceId` | string | 目标设备 ID |
| `sessionId` | string/null | 关联的 session |
| `type` | string | 命令类型 |
| `queuedAt` | string | 命令入队时间 |
| `payload` | object | 具体命令内容 |

当前命令类型：
- `session_start`
- `session_stop`
- `rhythm_preview`
- `session_pause`
- `session_resume`

设备执行规则：
- 轮询频率建议 `1 秒`
- 如果同一条未 ACK 命令重复返回，设备必须按幂等处理
- 不允许因为重复收到同一命令而重复叠加马达状态

### 7.3 命令 ACK 接口

```http
POST /devices/:deviceId/commands/:commandId/ack
Content-Type: application/json
```

完整地址示例：

```text
http://111.229.204.242/hush-api/devices/seeed-xiao-esp32s3-sense-001/commands/cmd-1774881605000-uuid/ack
```

请求体：

```json
{
  "status": "completed",
  "message": "session_start applied",
  "acknowledgedAt": "2026-03-30T16:00:06.000Z"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `status` | string | 是 | `received` / `completed` / `failed` |
| `message` | string | 否 | 调试信息 |
| `acknowledgedAt` | string | 否 | ACK 时间，建议 ISO8601 |

响应：

```http
204 No Content
```

推荐流程：
- 解析命令成功后，立即发一次 `received`
- 振动逻辑真正启动后，再发一次 `completed`
- 如果执行失败，发 `failed`

### 7.4 Telemetry 上传接口

```http
POST /devices/:deviceId/telemetry
Content-Type: application/json
```

完整地址示例：

```text
http://111.229.204.242/hush-api/devices/seeed-xiao-esp32s3-sense-001/telemetry
```

请求体：

```json
{
  "sessionId": "session-1774881600000-uuid",
  "samples": [
    {
      "seq": 1,
      "deviceTimestampMs": 1000,
      "accel": { "x": 1, "y": 2, "z": 3 },
      "gyro": { "x": 4, "y": 5, "z": 6 },
      "mag": { "x": 7, "y": 8, "z": 9 },
      "receivedAt": "2026-03-30T16:00:07.000Z",
      "deviceId": "seeed-xiao-esp32s3-sense-001",
      "sessionId": "session-1774881600000-uuid"
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `sessionId` | string/null | 否 | 当前 session |
| `samples` | array | 是 | 9 轴数据数组 |

单条 sample 结构：

| 字段 | 类型 | 说明 |
|---|---|---|
| `seq` | number | 递增序号 |
| `deviceTimestampMs` | number | 设备内部时间戳 |
| `accel` | object | 加速度 |
| `gyro` | object | 陀螺仪 |
| `mag` | object | 磁力计 |
| `receivedAt` | string | 设备打点时间 |
| `deviceId` | string | 设备 ID |
| `sessionId` | string | 对应 session |

响应：

```json
{
  "accepted": 20
}
```

上传建议：
- 批量上传，不要每个 sample 单独上传
- 建议每批 `10~20 条`
- 发送失败时，本地缓存，下一批重试

### 7.5 语音回答文字上传接口

当硬件端完成：

1. 采集语音
2. 语音转文字
3. 调用 LLM 获取文字回答

并得到一段文字回答 `A` 后，需要把 `A` 上传到云端，供手机 App 拉取并用 iPhone 扬声器播报。

```http
POST /devices/:deviceId/assistant-responses
Content-Type: application/json
```

完整地址示例：

```text
http://111.229.204.242/hush-api/devices/seeed-xiao-esp32s3-sense-001/assistant-responses
```

请求体：

```json
{
  "sessionId": "session-1774881600000-uuid",
  "text": "Take a slower breath and relax your shoulders.",
  "language": "en-US",
  "source": "llm",
  "createdAt": "2026-03-30T16:05:00.000Z"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `sessionId` | string/null | 否 | 若当前语音对话属于某次训练，可带上对应 session |
| `text` | string | 是 | 需要手机播报的文本 |
| `language` | string | 否 | 推荐填写，如 `zh-CN`、`en-US` |
| `source` | string | 否 | 建议固定为 `llm` |
| `createdAt` | string | 是 | 该回答生成时间，ISO8601 |

响应：

```json
{
  "responseId": "voice-1774881900000-uuid"
}
```

说明：
- ESP32 不需要直接推送给手机
- 手机会轮询云端获取这条文字
- 手机获取后会自动用 TTS 朗读

## 8. 手机端如何驱动振动

### 8.1 开始 session

手机会调用：

```http
POST /sessions
```

请求体：

```json
{
  "deviceId": "seeed-xiao-esp32s3-sense-001",
  "deviceName": "Seeed XIAO ESP32S3 Sense",
  "startedAt": "2026-03-30T16:00:00.000Z",
  "rhythm": {
    "inhaleMs": 4000,
    "holdMs": 7000,
    "exhaleMs": 8000,
    "cycles": 32
  }
}
```

后端会自动为设备生成一条 `session_start` 命令。

ESP32 收到后必须：
- 读取 `rhythm.inhaleMs`
- 读取 `rhythm.holdMs`
- 读取 `rhythm.exhaleMs`
- 读取 `rhythm.cycles`
- 用完全相同的节奏驱动振动马达

### 8.2 停止 session

手机会调用：

```http
POST /sessions/:sessionId/status
```

请求体：

```json
{
  "status": "stopped",
  "reason": "user_stop"
}
```

后端会自动生成一条 `session_stop` 命令。

ESP32 收到后必须：
- 立即关闭振动马达
- 清空本地相位状态
- 清空当前 session 计时器

### 8.3 预览节奏

手机在用户调整 rhythm 后会调用：

```http
POST /devices/:deviceId/rhythm-preview
```

后端会为设备排队一条 `rhythm_preview` 命令。

ESP32 收到后建议：
- 只播放一轮短预览
- 不进入正式 session
- 不覆盖正在运行的正式 session

## 9. 命令语义定义

### 9.1 `session_start`

示例 payload：

```json
{
  "type": "session_start",
  "sessionId": "session-1774881600000-uuid",
  "rhythm": {
    "inhaleMs": 4000,
    "holdMs": 7000,
    "exhaleMs": 8000,
    "cycles": 32
  },
  "vibration": "medium",
  "sentAt": "2026-03-30T16:00:05.000Z"
}
```

要求：
- 必须按 `inhale -> hold -> exhale` 执行
- 总循环次数为 `cycles`
- 必须和 App 动画节奏一致

推荐马达策略：
- `inhale`：振动从弱到强渐增
- `hold`：保持轻微稳定振动，或者静默
- `exhale`：振动从强到弱渐减

### 9.2 `session_stop`

示例 payload：

```json
{
  "type": "session_stop",
  "sessionId": "session-1774881600000-uuid",
  "reason": "user_stop",
  "sentAt": "2026-03-30T16:00:20.000Z"
}
```

要求：
- 马达立即停止
- 不等待当前相位结束

### 9.3 `rhythm_preview`

示例 payload：

```json
{
  "type": "rhythm_preview",
  "rhythm": {
    "inhaleMs": 4000,
    "holdMs": 7000,
    "exhaleMs": 8000,
    "cycles": 4
  },
  "vibration": "medium",
  "sentAt": "2026-03-30T16:00:30.000Z"
}
```

要求：
- 播放一次短预览即可
- 不应覆盖正式 session

## 10. 设备主循环建议

建议固件采用两个周期任务：

### 任务 A：heartbeat

每 5 秒：

1. 读取 Wi-Fi RSSI
2. 读取电量
3. 读取固件版本
4. `POST /devices/heartbeat`

### 任务 B：命令轮询

每 1 秒：

1. `GET /devices/:deviceId/commands/next`
2. 若返回 204，继续下一轮
3. 若返回命令：
   - 先发 ACK `received`
   - 执行命令
   - 再发 ACK `completed`
4. 若执行失败，发 ACK `failed`

### 任务 C：telemetry 上传

持续采样：

1. 从 9 轴传感器读取数据
2. 放入本地 buffer
3. 每满 10~20 条，`POST /devices/:deviceId/telemetry`

### 任务 D：语音回复上传

在本地语音交互流程里：

1. 采集用户语音
2. 转文字
3. 调用 LLM 获取回答文字
4. 调用 `POST /devices/:deviceId/assistant-responses`
5. 云端入队该文字
6. 手机 App 拉取该文字并通过 iPhone 扬声器播报

## 11. 推荐状态机

设备端建议维护以下状态：

```text
IDLE
RUNNING
PREVIEW
ERROR
```

状态变化：

- 开机后进入 `IDLE`
- 收到 `session_start` -> 进入 `RUNNING`
- 收到 `session_stop` -> 回到 `IDLE`
- 收到 `rhythm_preview` -> 进入 `PREVIEW`
- 预览完成 -> 回到 `IDLE`
- 网络异常或执行异常 -> 进入 `ERROR`

## 12. 错误处理建议

### 网络失败
- 不要重启设备
- 继续保持本地状态
- 下一轮 heartbeat / poll 再重试

### 命令重复
- 用 `commandId` 去重
- 如果已经处理过同一命令，不要重复启动马达逻辑

### telemetry 上传失败
- 本地缓存
- 后续重试
- 不要阻塞振动主循环

### session_stop 到达时
- 立即中断所有相位计时器
- 不等待 inhale/hold/exhale 自然结束

## 13. 联调顺序

建议按下面顺序联调：

1. 先做 heartbeat
2. 再做 `commands/next`
3. 再做 ACK
4. 再做 `session_start/session_stop`
5. 再做语音回复上传并确认手机播报
6. 最后做 telemetry 上传

## 14. 本地验证方式

可以直接用 curl 模拟设备：

### 发 heartbeat

```bash
curl -X POST http://111.229.204.242/hush-api/devices/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId":"seeed-xiao-esp32s3-sense-001",
    "deviceName":"Seeed XIAO ESP32S3 Sense",
    "hardwareModel":"Seeed XIAO ESP32S3 Sense",
    "firmwareVersion":"1.0.0",
    "batteryLevel":88,
    "wifiRssi":-55,
    "ipAddress":"192.168.1.6",
    "sentAt":"2026-03-30T16:00:00.000Z"
  }'
```

### 拉命令

```bash
curl http://111.229.204.242/hush-api/devices/seeed-xiao-esp32s3-sense-001/commands/next
```

### ACK 命令

```bash
curl -X POST http://111.229.204.242/hush-api/devices/seeed-xiao-esp32s3-sense-001/commands/cmd-xxx/ack \
  -H "Content-Type: application/json" \
  -d '{
    "status":"completed",
    "message":"session_start applied",
    "acknowledgedAt":"2026-03-30T16:00:06.000Z"
  }'
```

### 上传一条 LLM 文字回复

```bash
curl -X POST http://111.229.204.242/hush-api/devices/seeed-xiao-esp32s3-sense-001/assistant-responses \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": null,
    "text": "Please inhale slowly and stay relaxed.",
    "language": "en-US",
    "source": "llm",
    "createdAt": "2026-03-30T16:05:00.000Z"
  }'
```

## 15. 当前结论

硬件开发只要记住这几点：

- 云服务器 IP 是 `111.229.204.242`
- 后端基础地址是 `http://111.229.204.242/hush-api`
- ESP32 与后端用 `HTTP + JSON`
- 按 `heartbeat + poll + ack + telemetry + assistant-responses` 这五类接口接入
- `Start Session` 对应后端生成 `session_start`
- `Stop Session` 对应后端生成 `session_stop`
- 振动节奏必须严格使用后端返回的 `inhaleMs / holdMs / exhaleMs / cycles`
- 若硬件端得到 LLM 文字回答，需要上传到 `/devices/:deviceId/assistant-responses`，手机会自动播报

如果你要，我下一步可以继续补一份：

1. `Arduino` 版 ESP32S3 示例代码
2. `PlatformIO` 版工程模板
3. 振动马达相位控制伪代码
