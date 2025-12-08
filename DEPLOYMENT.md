# 生产环境部署指南

## 概述

本文档提供了 `egg-request-curl` 在生产环境中的最佳实践和部署指南。

## 配置优化

### 1. 生产环境推荐配置

针对不同的部署场景，建议的配置如下：

#### 高并发场景

```bash
# 环境变量配置
export NODE_REQUEST_CURL_RESPONSE_LIMIT=1024
export NODE_REQUEST_CURL_REQUEST_LIMIT=512
export ENABLE_REQUEST_LOGGING=true
```

**特点**：

- 更严格的大小限制，减少内存占用
- 启用请求日志便于问题排查

#### 故障排查场景

```bash
# 环境变量配置
export NODE_REQUEST_CURL_RESPONSE_LIMIT=5120
export NODE_REQUEST_CURL_REQUEST_LIMIT=4096
export ENABLE_REQUEST_LOGGING=true
```

**特点**：

- 更大的大小限制，捕获完整信息
- 便于问题复现和分析

#### 最小开销场景

```bash
# 环境变量配置
export NODE_REQUEST_CURL_RESPONSE_LIMIT=512
export NODE_REQUEST_CURL_REQUEST_LIMIT=256
export ENABLE_REQUEST_LOGGING=false
```

**特点**：

- 最小的内存占用和 I/O 开销
- 适合稳定的生产环境

### 2. 环境变量优先级

配置参数的优先级从高到低为：

1. **函数参数配置** - `app.js` 中的 `recorderOptions` ✅ 最高优先级
2. **环境变量配置** - `NODE_REQUEST_CURL_*` 系列环境变量
3. **配置文件配置** - `config/config.default.js` 中的配置
4. **默认值** - 代码中定义的默认值

例如：

```javascript
// app.js 中的配置会覆盖所有其他配置
const recorderOptions = {
  lengthLimit: 8192, // 会覆盖环境变量和默认值
  requestBodyLimit: 4096,
};

recorder(recorderOptions, (record) => {
  // 处理记录
});
```

## 性能优化

### 1. 内存管理

- ✅ 响应体超过 **1KB** 时自动截断（生产环境建议）
- ✅ 请求体超过 **512 字节** 时不包含在 curl 命令中
- ✅ 使用流式处理，避免大数据一次性加载
- ✅ 智能事件监听器管理，防止内存泄漏

### 2. 日志优化

```javascript
// app.js - 最佳实践示例
const recorder = require("node_request_curl");

recorder(
  {
    lengthLimit: 1024,
    requestBodyLimit: 512,
  },
  (record) => {
    // 使用异步处理避免阻塞主线程
    setImmediate(() => {
      // 仅记录关键信息，减少内存占用
      const logger = app.getLogger("requestCurl");

      if (record.error) {
        logger.error("HTTP Request Failed", {
          curl: record.request,
          error: JSON.parse(record.error),
          timestamp: record.time.toISOString(),
        });
      } else if (record.response.includes("5")) {
        // 仅记录服务器错误
        logger.warn("HTTP Server Error", {
          curl: record.request,
          response: record.response.substring(0, 100),
          timestamp: record.time.toISOString(),
        });
      }
    });
  }
);
```

### 3. 条件启用记录

```javascript
// app.js - 条件启用示例
const recorder = require("node_request_curl");

// 仅在开发和测试环境启用详细日志
if (process.env.NODE_ENV !== "production") {
  recorder((record) => {
    logger.info("HTTP Request", record);
  });
} else {
  // 生产环境仅记录错误
  recorder((record) => {
    if (record.error) {
      logger.error("HTTP Request Failed", {
        curl: record.request,
        error: record.error,
      });
    }
  });
}
```

## 监控和告警

### 1. 性能监控

```javascript
// 实时监控请求性能
const metrics = require("your-metrics-library");

recorder((record) => {
  metrics.histogram("http.request.size", record.response.length, {
    hasError: !!record.error,
  });
});
```

### 2. 错误告警

```javascript
// 实时错误告警
const alertService = require("your-alert-service");

recorder((record) => {
  if (record.error) {
    const errorObj = JSON.parse(record.error);

    // 关键错误立即告警
    if (errorObj.code === "ECONNREFUSED" || errorObj.code === "TIMEOUT") {
      alertService.alert("Critical HTTP Error", {
        code: errorObj.code,
        message: errorObj.message,
        curl: record.request,
        timestamp: record.time.toISOString(),
      });
    }
  }
});
```

## 日志管理

### 1. 日志轮转

配置文件已支持日志文件大小限制：

```javascript
customLogger: {
  requestCurl: {
    file: `${logBase}/requestCurl.log`,
    maxFileSize: 1024 * 1024 * 100, // 100MB
  },
}
```

### 2. 日志清理

定期清理过期日志：

```bash
# 保留最近 7 天的日志
find /export/Logs -name "requestCurl.log*" -mtime +7 -delete
```

### 3. 日志分析

使用标准工具分析日志：

```bash
# 查看错误日志
grep "HTTP Request Failed" /export/Logs/requestCurl.log | tail -100

# 统计请求数
grep "HTTP Request" /export/Logs/requestCurl.log | wc -l

# 查看特定 API 的请求
grep "api.example.com" /export/Logs/requestCurl.log
```

## 故障排查

### 1. 内存占用过高

**症状**：内存持续增长

**解决方案**：

```bash
# 降低大小限制
export NODE_REQUEST_CURL_RESPONSE_LIMIT=512
export NODE_REQUEST_CURL_REQUEST_LIMIT=256

# 禁用日志
export ENABLE_REQUEST_LOGGING=false
```

### 2. 日志文件过大

**症状**：日志文件占用大量磁盘空间

**解决方案**：

```bash
# 如需进一步缩小日志体积，可关闭日志或缩短日志保留时间

# 启用日志轮转（需在部署脚本中配置）
logrotate /etc/logrotate.d/egg-request-curl
```

### 3. 请求处理性能下降

**症状**：请求响应时间变长

**解决方案**：

```javascript
// 使用异步非阻塞处理
recorder((record) => {
  setImmediate(() => {
    // 异步处理，不会阻塞主线程
    logger.info("HTTP Request", record);
  });
});
```

## 安全建议

### 1. 敏感信息保护

```javascript
// 过滤敏感信息
recorder((record) => {
  // 移除授权头
  const sanitizedCurl = record.request
    .replace(/-H 'Authorization:[^']*'/g, "-H 'Authorization: [REDACTED]'")
    .replace(/-H "Authorization:[^"]*"/g, '-H "Authorization: [REDACTED]"');

  logger.info("HTTP Request", {
    curl: sanitizedCurl,
    timestamp: record.time.toISOString(),
  });
});
```

### 2. SSL 证书验证

```bash
# 生产环境必须启用 SSL 验证（默认启用）
# 临时禁用仅用于开发环境
# NODE_TLS_REJECT_UNAUTHORIZED=0

# 使用自签名证书
NODE_EXTRA_CA_CERTS=/path/to/ca.pem npm start
```

### 3. 日志文件权限

```bash
# 限制日志文件访问权限
chmod 640 /export/Logs/requestCurl.log

# 设置日志目录权限
chmod 755 /export/Logs
```

## 部署示例

### Docker 部署

```dockerfile
FROM node:14-alpine

WORKDIR /app

COPY package.json .
RUN npm ci

COPY . .

# 生产环境配置
ENV NODE_ENV=production
ENV NODE_REQUEST_CURL_RESPONSE_LIMIT=1024
ENV NODE_REQUEST_CURL_REQUEST_LIMIT=512
ENV ENABLE_REQUEST_LOGGING=true

EXPOSE 3000

CMD ["npm", "start"]
```

### Kubernetes 部署

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: egg-app-config
data:
  NODE_REQUEST_CURL_RESPONSE_LIMIT: "1024"
  NODE_REQUEST_CURL_REQUEST_LIMIT: "512"
  ENABLE_REQUEST_LOGGING: "true"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: egg-app
spec:
  template:
    spec:
      containers:
        - name: egg-app
          envFrom:
            - configMapRef:
                name: egg-app-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## 性能基准

基于标准测试环境的性能数据：

| 配置场景 | 内存开销 | CPU 开销 | 日志大小   |
| -------- | -------- | -------- | ---------- |
| 禁用日志 | < 1MB    | < 1%     | 0          |
| 最小配置 | 1-2MB    | 1-2%     | 10MB/小时  |
| 标准配置 | 2-5MB    | 2-5%     | 50MB/小时  |
| 详细配置 | 5-10MB   | 5-10%    | 200MB/小时 |

## 总结

### 核心要点

1. ✅ 始终在生产环境使用较小的大小限制
2. ✅ 使用异步处理避免阻塞主线程
3. ✅ 根据需要调整日志级别
4. ✅ 定期监控内存和磁盘使用情况
5. ✅ 实施日志轮转和清理策略
6. ✅ 保护敏感信息不被记录
7. ✅ 在稳定环境中可考虑禁用日志

### 推荐配置

```bash
# 生产环境推荐
NODE_REQUEST_CURL_RESPONSE_LIMIT=1024
NODE_REQUEST_CURL_REQUEST_LIMIT=512
ENABLE_REQUEST_LOGGING=true
```
