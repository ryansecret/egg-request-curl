# 配置参考指南

完整的环境变量、配置参数和最佳实践参考。

## 环境变量参考表

| 环境变量                           | 对应参数                      | 默认值                        | 说明                   | 建议值                              |
| ---------------------------------- | ----------------------------- | ----------------------------- | ---------------------- | ----------------------------------- |
| `NODE_REQUEST_CURL_RESPONSE_LIMIT` | `lengthLimit`                 | `3072`                        | 响应体大小限制（字节） | 开发: 3072-5120<br/>生产: 1024-2048 |
| `NODE_REQUEST_CURL_REQUEST_LIMIT`  | `requestBodyLimit`            | `2048`                        | 请求体大小限制（字节） | 开发: 2048-4096<br/>生产: 512-1024  |
| `NODE_REQUEST_CURL_SIZE_MESSAGE`   | `responseSizeExceededMessage` | `"the response is too large"` | 响应过大时的占位符     | 可自定义文本                        |
| `NODE_REQUEST_CURL_ENCODING`       | `defaultEncoding`             | `"utf8"`                      | 默认字符编码           | `utf8`、`gbk`、`utf16le`            |
| `ENABLE_REQUEST_LOGGING`           | 启用/禁用                     | `true`                        | 是否启用请求日志       | `true` 或 `false`                   |
| `LOG`                              | 日志路径                      | 自动检测                      | 日志目录路径           | `/export/Logs` 或自定义             |
| `NODE_TLS_REJECT_UNAUTHORIZED`     | SSL 验证                      | `1`                           | 是否验证 SSL 证书      | 开发: `0`<br/>生产: `1`(默认)       |

## 配置优先级

```
函数参数配置 (最高)
    ↑
环境变量配置
    ↑
配置文件配置
    ↑
代码默认值 (最低)
```

### 示例

```javascript
// app.js - 函数参数配置（优先级最高）
const options = {
  lengthLimit: 5120, // 会覆盖以下所有配置
};

recorder(options, (record) => {
  // 处理记录
});
```

```bash
# 环境变量配置（优先级次高）
NODE_REQUEST_CURL_RESPONSE_LIMIT=4096
```

```javascript
// config/config.default.js - 配置文件（优先级次低）
module.exports = (appInfo) => {
  return {
    requestCurl: {
      lengthLimit: 3072,
    },
  };
};
```

## 大小限制说明

### 响应体大小限制 (lengthLimit)

**作用**：当响应体超过此限制时，使用占位符替代

**示例**：

```javascript
// 设置为 1024 字节
recorder({ lengthLimit: 1024 }, (record) => {
  console.log(record.response);
  // 输出: "HTTP/1.1 200 OK
Content-Type: application/json

the response is too large"
});
```

**性能影响**：

- 更小的限制 → 更少内存占用，更快处理
- 更大的限制 → 更详细的日志信息，更多内存占用

**推荐值**：

```
┌─────────────────┬────────────────────┐
│   场景          │   推荐值           │
├─────────────────┼────────────────────┤
│   开发调试      │   3072 - 5120      │
│   测试环境      │   2048 - 3072      │
│   生产环境      │   1024 - 2048      │
│   高并发生产    │   512 - 1024       │
└─────────────────┴────────────────────┘
```

### 请求体大小限制 (requestBodyLimit)

**作用**：当请求体超过此限制时，不包含在 curl 命令中

**示例**：

```javascript
// 设置为 512 字节
recorder({ requestBodyLimit: 512 }, (record) => {
  console.log(record.request);
  // 输出: "curl 'http://api.example.com/users' -X POST -H 'Content-Type: application/json'"
  // 注意：POST 的请求体（超过 512 字节）不会显示
});
```

**推荐值**：

```
┌─────────────────┬────────────────────┐
│   场景          │   推荐值           │
├─────────────────┼────────────────────┤
│   开发调试      │   2048 - 4096      │
│   测试环境      │   1024 - 2048      │
│   生产环境      │   512 - 1024       │
│   高并发生产    │   256 - 512        │
└─────────────────┴────────────────────┘
```

## 性能优化指南

### 内存优化

```javascript
// ❌ 不推荐 - 会占用大量内存
recorder({ lengthLimit: 10240, requestBodyLimit: 8192 }, (record) => {
  logger.info("HTTP Request", record); // 频繁记录大量数据
});

// ✅ 推荐 - 内存占用低
recorder({ lengthLimit: 1024, requestBodyLimit: 512 }, (record) => {
  if (record.error) {
    // 仅记录错误
    logger.error("HTTP Error", record);
  }
});
```

### CPU 优化

```javascript
// ❌ 不推荐 - 同步处理，可能阻塞主线程
recorder((record) => {
  logger.info("HTTP Request", record);
  heavyProcessing(record); // 耗时操作
});

// ✅ 推荐 - 异步处理，不阻塞主线程
recorder((record) => {
  setImmediate(() => {
    logger.info("HTTP Request", record);
    heavyProcessing(record);
  });
});
```

### 磁盘 I/O 优化

```javascript
// ❌ 不推荐 - 每个请求都写一次磁盘
recorder((record) => {
  fs.appendFileSync("requests.log", JSON.stringify(record) + "
");
});

// ✅ 推荐 - 批量写入磁盘
const buffer = [];
const BATCH_SIZE = 10;

recorder((record) => {
  buffer.push(record);
  if (buffer.length >= BATCH_SIZE) {
    setImmediate(() => {
      fs.appendFileSync(
        "requests.log",
        buffer.map((r) => JSON.stringify(r)).join("
") + "
"
      );
      buffer.length = 0;
    });
  }
});
```

## 场景配置模板

### 模板 1：开发调试

```bash
# .env
NODE_REQUEST_CURL_RESPONSE_LIMIT=5120
NODE_REQUEST_CURL_REQUEST_LIMIT=4096
ENABLE_REQUEST_LOGGING=true
```

**特点**：

- 较大的大小限制，捕获完整信息
- 便于本地调试

### 模板 2：生产环境

```bash
# .env
NODE_REQUEST_CURL_RESPONSE_LIMIT=1024
NODE_REQUEST_CURL_REQUEST_LIMIT=512
ENABLE_REQUEST_LOGGING=true
```

**特点**：

- 较小的大小限制，减少开销
- 性能优先

### 模板 3：高并发环境

```bash
# .env
NODE_REQUEST_CURL_RESPONSE_LIMIT=512
NODE_REQUEST_CURL_REQUEST_LIMIT=256
ENABLE_REQUEST_LOGGING=true
```

**特点**：

- 最小的大小限制
- 最低开销

### 模板 4：故障排查

```bash
# .env
NODE_REQUEST_CURL_RESPONSE_LIMIT=8192
NODE_REQUEST_CURL_REQUEST_LIMIT=4096
ENABLE_REQUEST_LOGGING=true
```

**特点**：

- 更大的大小限制
- 便于问题复现

### 模板 5：监控模式

```bash
# .env
NODE_REQUEST_CURL_RESPONSE_LIMIT=2048
NODE_REQUEST_CURL_REQUEST_LIMIT=1024
ENABLE_REQUEST_LOGGING=true
```

**特点**：

- 平衡的大小限制
- 适合监控和告警

## 配置检查清单

在部署前检查以下项目：

- [ ] 环境变量已正确设置
- [ ] 日志目录存在且可写
- [ ] 日志文件权限正确（建议 640）
- [ ] 磁盘空间充足
- [ ] 内存资源充足
- [ ] 敏感信息已过滤
- [ ] SSL 证书验证已启用（生产）
- [ ] 日志轮转已配置
- [ ] 监控告警已设置

## 故障排查

### 问题 1：内存持续增长

**原因**：大小限制设置过大

**解决方案**：

```bash
export NODE_REQUEST_CURL_RESPONSE_LIMIT=1024
export NODE_REQUEST_CURL_REQUEST_LIMIT=512
```

### 问题 2：日志文件过大

**原因**：日志量过大或日志轮转未配置

**解决方案**：

```bash
# 关闭日志或缩短保留时间
export ENABLE_REQUEST_LOGGING=false
# 配置日志轮转（需在系统级别）
```

### 问题 3：请求处理变慢

**原因**：同步日志处理

**解决方案**：

```javascript
// 使用异步处理
recorder((record) => {
  setImmediate(() => {
    logger.info('HTTP Request', record);
  });
});

// 如需进一步降低开销，可关闭日志
export ENABLE_REQUEST_LOGGING=false
```

### 问题 4：丢失关键信息

**原因**：大小限制设置过小

**解决方案**：

```bash
export NODE_REQUEST_CURL_RESPONSE_LIMIT=5120
export NODE_REQUEST_CURL_REQUEST_LIMIT=4096
```

## 总结

**核心原则**：

1. 开发环境：详细和完整
2. 测试环境：平衡和可追踪
3. 生产环境：精简和高效

**优化建议**：

1. 根据实际场景选择合适的大小限制
2. 使用异步处理避免阻塞
3. 定期监控内存和磁盘使用
4. 根据需要决定是否启用日志
5. 实施日志轮转和清理策略
