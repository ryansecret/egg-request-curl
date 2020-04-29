# egg-request-curl  
  egg 插件用于将http请求转换为curl命令，方便调试抓包。

## 安装

```bash
$ npm i egg-request-curl --save
```

## 使用说明

```js
// {app_root}/config/plugin.js
exports.RequestCurl = {
  enable: true,
  package: 'egg-request-curl'
}
```


## 详细配置

```js
// {app_root}/config/config.default.js
module.exports = appInfo => {
  let logBase = path.join(appInfo.baseDir, 'log');
  if (fs.existsSync('/export/Logs')) {
    logBase = path.join(appInfo.baseDir, '../../log');
  }
  if (process.env.LOG) {
    logBase = process.env.LOG;
  }

  return {
    customLogger: {
      requestCurl: {
        file: `${logBase}/requestCurl.log`,
      },
    },
  };
};

```
默认生成log文件夹下requestCurl.log文件。

 >部署的时候日志路径默认是 path.join(appInfo.baseDir, '../../log')，如果docker 中路径权限有限制，需要修改，否则会导致docker启动失败。


