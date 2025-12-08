# egg-request-curl

将 Egg 应用内的 HTTP/HTTPS 调用转换为可复现的 curl 命令，便于调试、排障和审计。默认启用日志，可通过环境变量快速开关。

## 快速开始

```bash
pnpm add egg-request-curl
# 或 npm i egg-request-curl --save
```

```js
// {app_root}/config/plugin.js
exports.requestCurl = {
  enable: true,
  package: "egg-request-curl",
};

// {app_root}/app.js
const recorder = require("node_request_curl");

module.exports = (app) => {
  const logger = app.getLogger("requestCurl");
  const config = app.config.requestCurl || {};

  // 通过环境变量 ENABLE_REQUEST_LOGGING 控制启停（默认开启）
  const enableLogging = process.env.ENABLE_REQUEST_LOGGING !== "false";
  if (!enableLogging) return;

  const options = {
    lengthLimit:
      config.lengthLimit ||
      parseInt(process.env.NODE_REQUEST_CURL_RESPONSE_LIMIT || "3072"),
    requestBodyLimit:
      config.requestBodyLimit ||
      parseInt(process.env.NODE_REQUEST_CURL_REQUEST_LIMIT || "2048"),
    responseSizeExceededMessage:
      config.responseSizeExceededMessage ||
      process.env.NODE_REQUEST_CURL_SIZE_MESSAGE ||
      "the response is too large",
    defaultEncoding:
      config.defaultEncoding ||
      process.env.NODE_REQUEST_CURL_ENCODING ||
      "utf8",
  };

  app.use(async (ctx, next) => {
    recorder(options, (record) => {
      setImmediate(() => {
        if (record.error) {
          logger.error("[HTTP Request Failed]", {
            curl: record.request,
            error: record.error,
          });
        } else {
          logger.info({
            curl: record.request,
            response: record.response?.slice(0, 200),
          });
        }
      });
    });
    await next();
  });
};
```

## 环境变量

| 变量                               | 默认值                                  | 说明                                    |
| ---------------------------------- | --------------------------------------- | --------------------------------------- |
| `ENABLE_REQUEST_LOGGING`           | `true`                                  | 是否启用请求日志；设为 `false` 彻底关闭 |
| `NODE_REQUEST_CURL_RESPONSE_LIMIT` | `3072`                                  | 响应体截断阈值（字节）                  |
| `NODE_REQUEST_CURL_REQUEST_LIMIT`  | `2048`                                  | 请求体截断阈值（字节）                  |
| `NODE_REQUEST_CURL_SIZE_MESSAGE`   | `the response is too large`             | 超过阈值时的占位符文本                  |
| `NODE_REQUEST_CURL_ENCODING`       | `utf8`                                  | 默认字符编码                            |
| `LOG`                              | `../../log`（或 `/export/Logs` 如存在） | 日志目录；未设置则按默认规则推断        |

`LOG` 解析顺序：显式 `LOG` > 服务器存在 `/export/Logs` > `../../log`。建议使用绝对路径，并确保进程对该目录有写权限（容器内尤其注意挂载）。

### 常用方案

- 开发：`ENABLE_REQUEST_LOGGING=true`，`NODE_REQUEST_CURL_RESPONSE_LIMIT=3072-5120`
- 生产：`ENABLE_REQUEST_LOGGING=true`，`NODE_REQUEST_CURL_RESPONSE_LIMIT=1024-2048`
- 故障排查：适当提高响应体限制，排查后记得恢复或关闭日志

## 日志位置与轮转

- 日志文件：`requestCurl.log`
- 默认目录：`../../log`（存在 `/export/Logs` 时优先使用；或显式设置 `LOG`）
- 大文件场景：配合外部日志轮转工具或修改 `customLogger.requestCurl.maxFileSize`

## 注意事项

- 在受限容器环境中，若默认日志目录无写权限，请设置 `LOG=/path/to/logs`。
- 关闭日志可设置 `ENABLE_REQUEST_LOGGING=false`，避免在高并发/压测时产生额外 IO。
