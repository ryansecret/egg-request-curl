'use strict';

const recorder = require('node_request_curl');

/**
 * Egg.js 插件：HTTP 请求 curl 转换器
 * 将所有 HTTP/HTTPS 请求转换为 curl 命令格式，便于调试和问题复现
 *
 * 环境变量配置：
 * - NODE_REQUEST_CURL_RESPONSE_LIMIT: 响应体大小限制（字节，默认3072）
 * - NODE_REQUEST_CURL_REQUEST_LIMIT: 请求体大小限制（字节，默认2048）
 * - NODE_REQUEST_CURL_SIZE_MESSAGE: 响应过大时的占位符文本
 * - NODE_REQUEST_CURL_ENCODING: 默认字符编码（默认utf8）
 * - ENABLE_REQUEST_LOGGING: 是否启用请求日志（true/false，默认true）
 * - LOG: 日志目录路径
 */
module.exports = app => {
  const logger = app.getLogger('requestCurl');

  // 检查是否启用请求日志（可通过环境变量控制）
  const enableLogging = process.env.ENABLE_REQUEST_LOGGING !== 'false';

  if (!enableLogging) {
    app.logger.info('[RequestCurl] 请求日志已禁用');
    return;
  }

  // 获取自定义配置
  const config = app.config.requestCurl || {};

  // 配置优先级：函数参数 > 环境变量 > 默认值
  const recorderOptions = {
    // 响应体大小限制（默认 3KB）
    lengthLimit: config.lengthLimit || parseInt(process.env.NODE_REQUEST_CURL_RESPONSE_LIMIT || '3072'),

    // 请求体大小限制（默认 2KB）
    requestBodyLimit: config.requestBodyLimit || parseInt(process.env.NODE_REQUEST_CURL_REQUEST_LIMIT || '2048'),

    // 响应过大时的占位符
    responseSizeExceededMessage: config.responseSizeExceededMessage || process.env.NODE_REQUEST_CURL_SIZE_MESSAGE || 'the response is too large',

    // 默认字符编码
    defaultEncoding: config.defaultEncoding || process.env.NODE_REQUEST_CURL_ENCODING || 'utf8',
  };

  // 在应用启动时输出配置信息
  app.logger.info('[RequestCurl] 已启用，配置如下：', {
    lengthLimit: recorderOptions.lengthLimit,
    requestBodyLimit: recorderOptions.requestBodyLimit,
    responseSizeExceededMessage: recorderOptions.responseSizeExceededMessage,
    defaultEncoding: recorderOptions.defaultEncoding,
  });

  // 使用中间件监听所有请求
  app.use(async (ctx, next) => {
    recorder(recorderOptions, (record) => {
      // 使用异步处理避免阻塞主线程
      setImmediate(() => {
        // 构建结构化日志对象
      logger.info(`${record.request} \n ${record.error || record.response} \n`)
      });
    });

    await next();
  });
};

