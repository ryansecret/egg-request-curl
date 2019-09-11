# egg-request-curl

### 注意log 日志输出路径

部署的时候日志路径默认是 path.join(appInfo.baseDir, '../../log')，如果docker 中路径权限有限制，需要修改，否则会导致docker启动失败。
