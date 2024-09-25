const path = require("path");
const fs = require("fs");
module.exports = (appInfo) => {
  let logBase = path.join(appInfo.baseDir, "../../log");
  if (fs.existsSync("/export/Logs")) {
    logBase = path.join(appInfo.baseDir, "../../log");
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
