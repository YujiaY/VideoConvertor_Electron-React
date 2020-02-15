const electron = require("electron");
const ffmpeg = require("fluent-ffmpeg");
const _ = require("lodash");
const path = require("path");

const { app, BrowserWindow, ipcMain } = electron;

let mainWindow;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration: true
    }
  });
  mainWindow.loadURL(`file://${__dirname}/src/index.html`);
});

ipcMain.on("video:added", (event, videos) => {
  const promises = _.map(videos, video => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(video.path, (err, metadata) => {
        resolve({
          ...video,
          duration: metadata.format.duration,
          format: "avi"
        });
      });
    });
  });

  Promise.all(promises).then(results => {
    mainWindow.webContents.send("metadata:complete", results);
  });
});

ipcMain.on("conversion:start", (event, videos) => {
  _.each(videos, video => {
    const pathData = path.parse(video.path);
    const outputPath = `${pathData.dir}\\${pathData.name}.${video.format}`;
    console.log("outputPath: " + `${outputPath}`);

    ffmpeg(video.path)
      .output(outputPath)
      .on("end", () => {
        mainWindow.webContents.send("conversion:end", {
          video,
          outputPath
        });
        console.log(
          `Video ${pathData.name}.${pathData.ext} conversion finished.`
        );
      })
      .run();
  });
});
