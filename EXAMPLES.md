# 使用示例

本文档提供了 `egg-request-curl` 的详细使用示例。

## 目录

1. [基础用法](#基础用法)
2. [配置示例](#配置示例)
3. [日志处理](#日志处理)
4. [错误处理](#错误处理)
5. [性能优化](#性能优化)
6. [高级用法](#高级用法)

## 基础用法

### 最简单的使用方式

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  // 使用默认配置
  recorder((record) => {
    logger.info(`[${record.time}] ${record.request}`);
    logger.info(record.error || record.response);
  });
};
```

### 使用自定义配置

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  // 自定义配置
  const options = {
    lengthLimit: 5120, // 响应体限制 5KB
    requestBodyLimit: 4096, // 请求体限制 4KB
    responseSizeExceededMessage: "响应数据过大",
    defaultEncoding: "utf8",
  };

  recorder(options, (record) => {
    logger.info(`[${record.time}] ${record.request}`);
    logger.info(record.error || record.response);
  });
};
```

## 配置示例

### 1. 条件启用日志

根据环境启用不同级别的日志：

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  // 仅在开发环境启用详细日志
  if (process.env.NODE_ENV === "development") {
    recorder((record) => {
      console.log("Request:", record.request);
      console.log("Response:", record.response);
      if (record.error) {
        console.error("Error:", record.error);
      }
    });
  } else if (process.env.NODE_ENV === "production") {
    // 生产环境仅记录错误
    recorder((record) => {
      if (record.error) {
        logger.error("HTTP Request Failed", {
          curl: record.request,
          error: record.error,
          timestamp: record.time.toISOString(),
        });
      }
    });
  }
};
```

### 2. 环境变量配置

通过环境变量灵活配置：

```bash
# .env 文件
NODE_REQUEST_CURL_RESPONSE_LIMIT=5120
NODE_REQUEST_CURL_REQUEST_LIMIT=4096
NODE_REQUEST_CURL_SIZE_MESSAGE="响应数据过大"
ENABLE_REQUEST_LOGGING=true
```

```javascript
// app.js 自动读取环境变量
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  // 配置会自动从环境变量读取
  recorder((record) => {
    logger.info("HTTP Request", record);
  });
};
```

### 3. 配置文件方式

在 `config/config.default.js` 中配置：

```javascript
// config/config.default.js
module.exports = (appInfo) => {
  return {
    requestCurl: {
      lengthLimit: process.env.NODE_REQUEST_CURL_RESPONSE_LIMIT || 3072,
      requestBodyLimit: process.env.NODE_REQUEST_CURL_REQUEST_LIMIT || 2048,
      responseSizeExceededMessage: "响应数据过大",
      defaultEncoding: "utf8",
    },
  };
};
```

```javascript
// app.js 读取配置文件
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");
  const config = app.config.requestCurl || {};

  recorder(config, (record) => {
    logger.info("HTTP Request", record);
  });
};
```

## 日志处理

### 1. 结构化日志

使用结构化日志便于查询和分析：

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  recorder((record) => {
    const logRecord = {
      timestamp: record.time.toISOString(),
      url: extractUrl(record.request),
      method: extractMethod(record.request),
      statusCode: extractStatusCode(record.response),
      hasError: !!record.error,
      curl: record.request,
    };

    logger.info("HTTP_REQUEST", logRecord);
  });
};

// 辅助函数
function extractUrl(curl) {
  const match = curl.match(/curl '([^']+)'/);
  return match ? match[1] : "unknown";
}

function extractMethod(curl) {
  const match = curl.match(/curl '([^']+)'(.*)(?!-[A-Z])/);
  return curl.includes("-X") ? curl.split("-X")[1].trim().split(" ")[0] : "GET";
}

function extractStatusCode(response) {
  const match = response.match(/^[^ ]+ (\d+)/);
  return match ? match[1] : "unknown";
}
```

### 2. 异步日志处理

避免阻塞主线程：

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  recorder((record) => {
    // 使用 setImmediate 实现非阻塞处理
    setImmediate(() => {
      // 异步处理日志
      logger.info("HTTP Request", {
        timestamp: record.time.toISOString(),
        curl: record.request,
        response: record.response.substring(0, 200),
      });
    });
  });
};
```

### 3. 文件日志

写入自定义日志文件：

```javascript
// app.js
"use strict";
const fs = require("fs");
const path = require("path");
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logFile = path.join(app.baseDir, "../../log/http-requests.log");

  recorder((record) => {
    setImmediate(() => {
      const logEntry = {
        timestamp: record.time.toISOString(),
        method: extractMethod(record.request),
        url: extractUrl(record.request),
        statusCode: extractStatusCode(record.response),
        error: record.error ? JSON.parse(record.error) : null,
      };

      fs.appendFileSync(logFile, JSON.stringify(logEntry) + "
");
    });
  });
};
```

## 错误处理

### 1. 错误检测和记录

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  recorder((record) => {
    setImmediate(() => {
      if (record.error) {
        try {
          const errorObj = JSON.parse(record.error);
          logger.error("HTTP Request Error", {
            code: errorObj.code,
            message: errorObj.message,
            curl: record.request,
            timestamp: record.time.toISOString(),
          });
        } catch (e) {
          // 如果错误不是 JSON 格式
          logger.error("HTTP Request Error", {
            error: record.error,
            curl: record.request,
          });
        }
      } else if (record.response.includes("5")) {
        // 记录服务器错误
        logger.warn("HTTP Server Error", {
          statusCode: record.response.split(" ")[1],
          curl: record.request,
        });
      }
    });
  });
};
```

### 2. 错误分类处理

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  recorder((record) => {
    setImmediate(() => {
      if (record.error) {
        const errorObj = JSON.parse(record.error);

        // 连接错误
        if (errorObj.code === "ECONNREFUSED") {
          logger.error("Connection Refused", {
            curl: record.request,
            error: errorObj,
          });
        }
        // 超时错误
        else if (errorObj.code === "ETIMEDOUT") {
          logger.error("Request Timeout", {
            curl: record.request,
            error: errorObj,
          });
        }
        // 其他错误
        else {
          logger.error("HTTP Request Error", {
            curl: record.request,
            error: errorObj,
          });
        }
      }
    });
  });
};
```

### 3. 错误告警

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");
  const alertService = require("./lib/alert-service");

  recorder((record) => {
    if (record.error) {
      const errorObj = JSON.parse(record.error);

      // 关键错误立即告警
      if (["ECONNREFUSED", "ETIMEDOUT"].includes(errorObj.code)) {
        alertService.alert("Critical HTTP Error", {
          code: errorObj.code,
          message: errorObj.message,
          curl: record.request,
          timestamp: record.time.toISOString(),
        });
      }

      logger.error("HTTP Request Error", {
        curl: record.request,
        error: errorObj,
      });
    }
  });
};
```

## 性能优化

### 1. 选择性记录

仅记录特定的请求：

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  recorder((record) => {
    // 仅记录外部 API 调用
    if (record.request.includes("api.external.com")) {
      logger.info("External API Call", {
        curl: record.request,
        timestamp: record.time.toISOString(),
      });
    }

    // 仅记录错误请求
    if (record.error || record.response.includes("5")) {
      logger.warn("Failed Request", {
        curl: record.request,
        error: record.error,
      });
    }
  });
};
```

### 2. 批量处理

对多个请求进行批量处理：

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");
  const requestBuffer = [];
  const bufferSize = 10; // 每 10 个请求批量写入

  recorder((record) => {
    requestBuffer.push({
      timestamp: record.time.toISOString(),
      curl: record.request,
      hasError: !!record.error,
    });

    // 达到缓冲区大小后批量写入
    if (requestBuffer.length >= bufferSize) {
      setImmediate(() => {
        logger.info("Batch HTTP Requests", {
          count: requestBuffer.length,
          records: requestBuffer,
        });
        requestBuffer.length = 0;
      });
    }
  });
};
```

### 3. 内存优化

使用较小的大小限制以减少内存占用：

```javascript
// app.js - 生产环境配置
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  // 生产环境使用较小的大小限制
  const options = {
    lengthLimit: 1024, // 1KB 限制
    requestBodyLimit: 512, // 512B 限制
  };

  recorder(options, (record) => {
    setImmediate(() => {
      // 仅记录关键信息
      const logRecord = {
        timestamp: record.time.toISOString(),
        url: extractUrl(record.request),
        statusCode: extractStatusCode(record.response),
        hasError: !!record.error,
      };

      if (record.error) {
        logger.error("HTTP Request Error", logRecord);
      } else {
        logger.info("HTTP Request", logRecord);
      }
    });
  });
};
```

## 高级用法

### 1. 微服务监控

追踪多个微服务之间的调用：

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");
  const metrics = require("./lib/metrics");

  recorder((record) => {
    setImmediate(() => {
      const serviceCall = {
        service: extractService(record.request),
        timestamp: record.time.toISOString(),
        curl: record.request,
        success: !record.error,
        responseSize: record.response.length,
      };

      // 记录指标
      metrics.increment("service.calls", 1, {
        service: serviceCall.service,
        success: serviceCall.success,
      });

      logger.info("Service Call", serviceCall);
    });
  });
};

function extractService(curl) {
  const match = curl.match(/curl '([^/]+:?[^/]*)/);
  return match ? match[1] : "unknown";
}
```

### 2. 性能分析

分析和追踪请求性能：

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");
  const startTimes = new Map();

  recorder((record) => {
    setImmediate(() => {
      const requestId = generateRequestId(record.request);

      // 记录响应时间和大小
      const performanceData = {
        requestId,
        url: extractUrl(record.request),
        responseSize: record.response.length,
        timestamp: record.time.toISOString(),
        hasError: !!record.error,
      };

      logger.info("Performance Metrics", performanceData);
    });
  });
};

function generateRequestId(curl) {
  return Math.random().toString(36).substring(7);
}

function extractUrl(curl) {
  const match = curl.match(/curl '([^']+)'/);
  return match ? match[1] : "unknown";
}
```

### 3. 安全敏感信息保护

过滤和保护敏感信息：

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");

  recorder((record) => {
    setImmediate(() => {
      // 过滤敏感头部
      let sanitizedCurl = record.request
        // 移除授权头
        .replace(/-H 'Authorization:[^']*'/g, "-H 'Authorization: [REDACTED]'")
        .replace(/-H "Authorization:[^"]*"/g, '-H "Authorization: [REDACTED]"')
        // 移除 API Key
        .replace(/api[_-]?key=[^&\s]*/gi, "api_key=[REDACTED]")
        // 移除敏感参数
        .replace(/password=[^&\s]*/gi, "password=[REDACTED]");

      logger.info("HTTP Request", {
        curl: sanitizedCurl,
        timestamp: record.time.toISOString(),
      });
    });
  });
};
```

### 4. 自定义日志上报

将日志上报到第三方服务：

```javascript
// app.js
"use strict";
const recorder = require("node_request_curl");
const { ElasticsearchService } = require("./lib/elasticsearch-service");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");
  const esService = new ElasticsearchService();

  recorder((record) => {
    setImmediate(async () => {
      const document = {
        timestamp: record.time.toISOString(),
        curl: record.request,
        response: record.response.substring(0, 500),
        hasError: !!record.error,
        error: record.error ? JSON.parse(record.error) : null,
      };

      try {
        // 异步上报到 Elasticsearch
        await esService.index("http-requests", document);
      } catch (err) {
        logger.error("Failed to index log", {
          error: err.message,
          document,
        });
      }

      // 本地日志
      logger.info("HTTP Request", document);
    });
  });
};
```

## 总结

根据不同的使用场景选择合适的配置和处理方式：

- **开发环境**：启用详细日志，便于调试
- **测试环境**：记录完整信息用于验证
- **生产环境**：仅记录错误和关键信息，优化性能
- **监控场景**：上报指标到监控系统
- **故障排查**：启用详细日志和完整响应内容
