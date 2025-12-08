const path = require('path');
const fs = require('fs');

/**
 * 请求 curl 转换器配置
 *
 * 支持三种配置方式：
 * 1. 函数参数配置 - app.js 中的 recorderOptions
 * 2. 环境变量配置 - NODE_REQUEST_CURL_* 系列环境变量
 * 3. 配置文件配置 - 本文件中的 requestCurl 对象
 *
 * 配置优先级（从高到低）：函数参数 > 环境变量 > 配置文件 > 默认值
 */
module.exports = (appInfo) => {
  // 确定日志目录
  let logBase = path.join(appInfo.baseDir, '../../log');
  if (fs.existsSync('/export/Logs')) {
    logBase = '/export/Logs';
  }
  if (process.env.LOG) {
    logBase = process.env.LOG;
  }
  
  if(process.env.local) {
    logBase = path.join(appInfo.baseDir, '../log');
  }

  return {
    // 自定义日志配置
    customLogger: {
      requestCurl: {
        file: `${logBase}/requestCurl.log`,
        // 日志文件大小限制
        maxFileSize: 1024 * 1024 * 100, // 100MB
      },
    },

    // RequestCurl 插件配置
    requestCurl: {
      /**
       * 响应体大小限制（字节）
       * 超过此限制时，响应体会被替换为占位符文本
       * 默认: 3072 (3KB)
       * 环境变量: NODE_REQUEST_CURL_RESPONSE_LIMIT
       *
       * 性能建议：
       * - 开发环境: 3072-5120
       * - 生产环境: 1024-2048
       */
      lengthLimit: parseInt(process.env.NODE_REQUEST_CURL_RESPONSE_LIMIT || '3072'),

      /**
       * 请求体大小限制（字节）
       * 超过此限制时，请求体不会包含在 curl 命令中
       * 默认: 2048 (2KB)
       * 环境变量: NODE_REQUEST_CURL_REQUEST_LIMIT
       *
       * 性能建议：
       * - 开发环境: 2048-4096
       * - 生产环境: 512-1024
       */
      requestBodyLimit: parseInt(process.env.NODE_REQUEST_CURL_REQUEST_LIMIT || '2048'),

      /**
       * 响应体过大时的占位符文本
       * 默认: 'the response is too large'
       * 环境变量: NODE_REQUEST_CURL_SIZE_MESSAGE
       */
      responseSizeExceededMessage: process.env.NODE_REQUEST_CURL_SIZE_MESSAGE || 'the response is too large',

      /**
       * 默认字符编码
       * 默认: 'utf8'
       * 环境变量: NODE_REQUEST_CURL_ENCODING
       */
      defaultEncoding: process.env.NODE_REQUEST_CURL_ENCODING || 'utf8',
    },
  };
};
