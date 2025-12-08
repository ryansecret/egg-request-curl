# 快速参考卡

## 环境变量速查表

`bash

# 基础配置（通常使用这 3 个）

ENABLE_REQUEST_LOGGING=true # 启用日志
NODE_REQUEST_CURL_RESPONSE_LIMIT=3072 # 响应体限制

# 可选配置

NODE_REQUEST_CURL_REQUEST_LIMIT=2048 # 请求体限制
NODE_REQUEST_CURL_SIZE_MESSAGE=\"数据过大\"
NODE_REQUEST_CURL_ENCODING=utf8
LOG=/export/Logs # 日志目录
`

## 常用配置方案（一键复制）

### 方案 A: 开发调试

`bash
export ENABLE_REQUEST_LOGGING=true
export NODE_REQUEST_CURL_RESPONSE_LIMIT=5120
export NODE_REQUEST_CURL_REQUEST_LIMIT=4096
`

### 方案 B: 生产环境（推荐）

`bash
export ENABLE_REQUEST_LOGGING=true
export NODE_REQUEST_CURL_RESPONSE_LIMIT=1024
export NODE_REQUEST_CURL_REQUEST_LIMIT=512
`

### 方案 C: 高并发环境

`bash
export ENABLE_REQUEST_LOGGING=true
export NODE_REQUEST_CURL_RESPONSE_LIMIT=512
export NODE_REQUEST_CURL_REQUEST_LIMIT=256
`

### 方案 D: 故障排查

`bash
export ENABLE_REQUEST_LOGGING=true
export NODE_REQUEST_CURL_RESPONSE_LIMIT=8192
export NODE_REQUEST_CURL_REQUEST_LIMIT=4096
`

## 常用命令

`bash

# 检查当前配置

env | grep NODE_REQUEST_CURL

# 临时修改配置（当前 session 有效）

export NODE_REQUEST_CURL_RESPONSE_LIMIT=8192
npm start

# 从文件加载配置

source .env
npm start

# 只运行一个环境变量

NODE_REQUEST_CURL_RESPONSE_LIMIT=5120 npm start

# 查看日志

tail -f ../../log/requestCurl.log
grep \"HTTP Request Error\" ../../log/requestCurl.log

# 清理日志

rm ../../log/requestCurl.log\*
`

## 代码片段

### 最简单的使用

`javascript
const recorder = require('node_request_curl');

module.exports = app => {
recorder((record) => {
app.getLogger('requestCurl').info(record.request);
});
};
`

### 标准的生产配置

`javascript
const recorder = require('node_request_curl');

module.exports = app => {
const logger = app.getLogger('requestCurl');
const config = app.config.requestCurl || {};

recorder(config, (record) => {
setImmediate(() => {
if (record.error) {
logger.error('HTTP Error', {
curl: record.request,
error: JSON.parse(record.error),
});
}
});
});
};
`

### 带过滤的日志

`javascript
recorder((record) => {
  if (record.error || record.response.includes('5')) {
    logger.warn('Failed Request', {
      curl: record.request,
      error: record.error,
    });
  }
});
`

## 性能参数选择

`┌─────────────────────┬──────────────┬──────────────┐
│   场景              │  Response    │  Request     │
├─────────────────────┼──────────────┼──────────────┤
│ 高并发（内存优先）  │  512-1024    │  256-512     │
│ 生产（平衡）        │  1024-2048   │  512-1024    │
│ 开发（详细）        │  3072-5120   │  2048-4096   │
│ 调试（完整）        │  8192+       │  4096+       │
└─────────────────────┴──────────────┴──────────────┘`

## 故障速查

### 内存占用高

`bash

# 降低限制

export NODE_REQUEST_CURL_RESPONSE_LIMIT=512
export NODE_REQUEST_CURL_REQUEST_LIMIT=256
`

### 日志文件大

`bash

# 可关闭日志或清理

export ENABLE_REQUEST_LOGGING=false
rm ../../log/requestCurl.log\*
`

### 性能下降

`bash

# 禁用日志

export ENABLE_REQUEST_LOGGING=false
`

### 信息不足

`bash

# 确保日志开启并放宽限制

export ENABLE_REQUEST_LOGGING=true
export NODE_REQUEST_CURL_RESPONSE_LIMIT=8192
`

## 文件位置

`egg-request-curl/
├── app.js                    # 主入口（已优化）
├── config/
│   └── config.default.js     # 配置文件（已优化）
├── .env.example              # 环境变量模板
├── CONFIGURATION.md          # 配置详解
├── EXAMPLES.md               # 使用示例
├── DEPLOYMENT.md             # 部署指南
└── OPTIMIZATION_SUMMARY.md   # 本次优化总结`

## 关键概念速览

### 配置优先级

函数参数 > 环境变量 > 配置文件 > 默认值

### 三种启用方式

1. **默认** - 启用，记录所有请求
2. **条件启用** - 通过环境变量控制
3. **代码禁用** - 在 app.js 中设置

### 三层大小限制

1. **响应体** (lengthLimit) - 超过则用占位符替代
2. **请求体** (requestBodyLimit) - 超过则不包含
3. **日志大小** (maxFileSize) - 自动轮转

## 快速诊断

`bash

# 1. 检查是否启用

echo $ENABLE_REQUEST_LOGGING

# 2. 检查大小限制

echo $NODE_REQUEST_CURL_RESPONSE_LIMIT

# 3. 检查日志文件

ls -lh ../../log/requestCurl.log\*

# 4. 检查日志内容

head -20 ../../log/requestCurl.log

# 5. 检查错误日志

grep -i error ../../log/requestCurl.log | head -10
`

## 需要帮助？

- 📖 基础问题 → 查看 `EXAMPLES.md`
- ⚙️ 配置问题 → 查看 `CONFIGURATION.md`
- 🚀 部署问题 → 查看 `DEPLOYMENT.md`
- 💡 其他问题 → 查看 `README.md`

---

**记住**：大多数情况下，你只需要设置这 2 个环境变量：

`bash
ENABLE_REQUEST_LOGGING=true
NODE_REQUEST_CURL_RESPONSE_LIMIT=1024
`

其余使用默认值即可！✨
