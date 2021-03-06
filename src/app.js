var path          = require("path");    // -
var url           = require("url");     // -
var fs            = require("fs");      // File system
var crypto        = require("crypto");  // -
var $             = require("jquery");  // jQuery
var request       = require("request"); // POST request to the server
var storage       = require("electron-json-storage");
var autoLaunch    = require("auto-launch");
var {autoUpdater} = require("electron-updater");
var {app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, clipboard, shell, dialog} = require("electron");

var screenCapture; // C++ module for screen capturing
try{screenCapture = require("./screen-capture.node");}               catch(err){}
// try{screenCapture = require("../build/Release/screen-capture.node");}catch(err){}

var frystaAutoLaunch = new autoLaunch({
  "name"    : "Frysta",
  "isHidden": "true"
});

//////////////////////////////
///// CHECK FOR UPDATES! /////

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var win                       = null;
var tray                      = null;
var clickedOnButton           = null;
var lastUploadedScreenshotUrl = null;
var quit                      = false;
var loggedIn                  = false;
var balloonUpdateFrysta       = false;
var screenshotMaskActive      = false;
// var platformArch              = `${process.platform}-${process.arch}`;
// var server                    = `https://fizz.gg/releases/${platformArch}`;
var server                    = `https://fizz.gg/releases/${process.platform}`;

// List of platforms:
// - win32 [Windows]
//
// List of architectures:
// - x64 [64-bit]

autoUpdater.autoDownload = false;
autoUpdater.setFeedURL(server);

// Silence console logging for the autoUpdater
autoUpdater.logger.info  = function(m){console.log(m)}
autoUpdater.logger.warn  = function(m){console.log(m)}
autoUpdater.logger.error = function(m){console.log(m)}
autoUpdater.logger.debug = function(m){console.log(m)}

autoUpdater.logger.error = function(msg){
  if(msg.indexOf("Cannot parse update info from latest.yml") >=0){
    console.log("========== ERROR ==========");
    console.log("Could not get latest.yml from the server");
    console.log();
  }else if(msg.indexOf("status 404: Not Found") >=0){
    console.log("========== ERROR ==========");
    console.log("latest.yml pointed to a file that doesn't exist");
    console.log();
  }
}

autoUpdater.on("update-not-available", (info) => {});
autoUpdater.on("update-available",     (info) => {
  // If there's an update available, download it. But do not
  // automatically install it since I'll let the user decide
  // when they want to exit and install the update.
  autoUpdater.downloadUpdate();
});

autoUpdater.on("update-downloaded", () => {
  // setImmediate(() => {
  //   app.removeAllListeners("window-all-closed");
  //   win.close();
  //   autoUpdater.quitAndInstall(false);
  // });





  balloonUpdateFrysta = true;

  tray.displayBalloon({
    "icon"   : path.join(__dirname, "img/icon64x64.png"),
    "title"  : "Update Ready",
    "content": "Click on this notification to restart and update Frysta"
  });

  SendMessage("PlaySfxNotification");
});

autoUpdater.on("download-progress", (ev, progressObj) => {
  // console.log(ev["percent"]);
  // var data = {
  //   "percent": ev["percent"]
  // }
  // SendMessage("DownloadProgress", data);
});

autoUpdater.checkForUpdates();

///// CHECK FOR UPDATES! /////
//////////////////////////////

// Default options
var options = {
  "LaunchOnStartup" : "true",
  "CopyUrlOnSuccess": "true",
  "SfxOnSuccess"    : "true",
  "SfxOnFailure"    : "true",
  "LocalCopy"       : "false",
  "Username"        : "",
  "LoginToken"      : ""
};

function createWindow(){
  // Create the browser window
  win = new BrowserWindow({
    "width"          : 400,
    "height"         : 300,
    "show"           : false,
    "frame"          : false,
    "backgroundColor": "#33363f",
    "resizable"      : false,
    "icon"           : path.join(__dirname, "img/icon64x64.png")
  });

  // win.toggleDevTools();

  win.setMenu(null);

  globalShortcut.register("ctrl+shift+1", function (){
    TakeScreenshotShortcut();
  });

  tray = new Tray(path.join(__dirname, "img/icon64x64.png"));

  var contextMenu = Menu.buildFromTemplate([
    {
      "label": "Quit Frysta",
      "click": function(){
        quit = true;
        win.close();
      }
    }
    // All of this stuff is used for future reference
    // ,{
    //   "label": "Item 1",
    //   "type" : "radio",
    //   "icon" : path.join(__dirname, "img/icon64x64.png")
    // },
    // {
    //   "label": "Item 2",
    //   "submenu": [
    //     {"label": "submenu 1"},
    //     {"label": "submenu 2"},
    //   ]
    // },
    // {
    //   "label": "Item 3",
    //   "type" : "radio",
    //   "checked": true
    // },
    // {
    //   "label": "Toggle Tools",
    //   "accelerator": "Ctrl+I",
    //   "click": function(){
    //     win.webContents.toggleDevTools();
    //   }
    // }
  ]);

  tray.setToolTip("Frysta");
  tray.setContextMenu(contextMenu);

  tray.on("click", function(){
    win.show();
  });

  tray.on("double-click", function(){
    win.show();
  });

  tray.on("balloon-click", function(){
    if(balloonUpdateFrysta)
      autoUpdater.quitAndInstall();
    else if(lastUploadedScreenshotUrl)
      shell.openExternal(lastUploadedScreenshotUrl);
  });

  win.once("ready-to-show", function(){
    storage.get("config", function(error, data){
      if("LaunchOnStartup"  in data) options["LaunchOnStartup"]  = data["LaunchOnStartup"];
      if("CopyUrlOnSuccess" in data) options["CopyUrlOnSuccess"] = data["CopyUrlOnSuccess"];
      if("SfxOnSuccess"     in data) options["SfxOnSuccess"]     = data["SfxOnSuccess"];
      if("SfxOnFailure"     in data) options["SfxOnFailure"]     = data["SfxOnFailure"];
      if("LocalCopy"        in data) options["LocalCopy"]        = data["LocalCopy"];
      if("Username"         in data) options["Username"]         = data["Username"];
      if("LoginToken"       in data) options["LoginToken"]       = data["LoginToken"];

      if     (options["LaunchOnStartup"] == "true")  frystaAutoLaunch.enable();
      else if(options["LaunchOnStartup"] == "false") frystaAutoLaunch.disable();

      storage.set("config", options, function(error){});

      // If a username and login token is defined in the options, attempt to login automatically
      if(options["Username"] && options["LoginToken"]){
        var data = {
          "username"  : options["Username"],
          "loginToken": options["LoginToken"]
        };

        data = JSON.stringify(data);
        LoginWithToken(data);
      }else{
        // Show the window to the user if there's no username/token to login automatically
        win.show();
      }
    });
  });

  // Load main page of the application
  win.loadURL(url.format({
    pathname: path.join(__dirname, "main.html"),
    protocol: "file:",
    slashes: true
  }));

  // When the window is going to be minimized
  win.on("minimize",function(event){
    event.preventDefault();
    win.hide();
  });

  // When the window is about to be closed
  win.on("close", function (event){
    if(quit == false){
      event.preventDefault();
      win.hide();
    }
  });

  // When the window is actually closed
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit()
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null){
    createWindow();
  }
});

// Messages received from the client
app.on("message", (msg) => {
  var func = msg["function"];
  var data = msg["data"];

  if     (func == "TakeScreenshotButton") TakeScreenshotButton(data);
  else if(func == "Minimize")             Minimize            (data);
  else if(func == "Quit")                 Quit                (data);
  else if(func == "Login")                Login               (data);
  else if(func == "CreateAccount")        CreateAccount       (data);
  else if(func == "RecoverAccount")       RecoverAccount      (data);
  else if(func == "SetOption")            SetOption           (data);
  else if(func == "UpdateManager")        UpdateManager       (data);
  else if(func == "UpdateFrysta")         UpdateFrysta        (data);
  else if(func == "Logout")               Logout              (data);
});

function SetOption(data){
  data = JSON.parse(data);

  for(var key in data){
    options[key] = data[key];

    // Special cases for options
    if(key == "LaunchOnStartup"){
      if     (options["LaunchOnStartup"] == "true")  frystaAutoLaunch.enable();
      else if(options["LaunchOnStartup"] == "false") frystaAutoLaunch.disable();
    }
  }

  storage.set("config", options, function(error){});
}

// Functions for the messages received from the client

function TakeScreenshotButton(){
  clickedOnButton = true;
  TakeScreenshot();
}

function Minimize(){
  win.hide();
}

function Quit(){
  quit = true;
  win.close();
}

function Login(data){
  SendMessage("GetOptions", options);

  EncryptData(data)
  .then((data) => {
    request.post({url:"https://fizz.gg/login", form: {"data":data}}, function(err, res, msg){
      // If this login attempt was successful, the server will have given us a login token
      // that should should be stored in the config file. This token is used to automatically
      // login to Frysta whenever it's launched so that the user doesn't need to supply
      // their username and password every single time.
      var username   = JSON.parse(msg)["username"];
      var loginToken = JSON.parse(msg)["loginToken"];

      if(typeof loginToken != "undefined"){
        loggedIn = true;
        options["Username"]   = username;
        options["LoginToken"] = loginToken;
        storage.set("config", options, function(error){});
      }else{
        loggedIn = false;
      }

      SendMessage("LoginPageToMainApp", msg);
    });
  });
}

function LoginWithToken(data){
  SendMessage("GetOptions", options);

  EncryptData(data)
  .then((data) => {
    request.post({url:"https://fizz.gg/login-with-token", form: {"data":data}}, function(err, res, msg){
      // If we can sucesfully log in automatically on startup by using the token,
      // make sure that Frysta is hidden. If logging in via token failed,
      // show the window so that the user knows.
      var color = JSON.parse(msg)["color"];

      if(color == "green"){
        loggedIn = true;
        win.hide();
      }else if(color == "red"){
        loggedIn = false;
        win.show();
      }

      SendMessage("LoginPageToMainApp", msg);
    });
  });
}

function CreateAccount(data){
  EncryptData(data)
  .then((data) => {
    request.post({url:"https://fizz.gg/create-account", form: {"data":data}}, function(err, res, msg){
      SendMessage("AccountWasCreated", msg);
    });
  });
}

function RecoverAccount(data){
  EncryptData(data)
  .then((data) => {
    request.post({url:"https://fizz.gg/recover-account", form: {"data":data}}, function(err, res, msg){
      SendMessage("RecoverAccountResponse", msg);
    });
  });
}

function UpdateManager(data){
  data = JSON.parse(data);
  var text = data["text"];

  if(text == "Check for updates"){
    autoUpdater.checkForUpdates()
    .then((res) => {
      console.log("============================================");
      console.log(res);
      // { versionInfo: { version: '0.2.0', files: [ [Object] ] },
      // updateInfo: { version: '0.2.0', files: [ [Object] ] },
      // cancellationToken:
      //  CancellationToken {
      //    domain: null,
      //    _events: {},
      //    _eventsCount: 0,
      //    _maxListeners: undefined,
      //    parentCancelHandler: null,
      //    _parent: null,
      //    _cancelled: false },
      // downloadPromise: null }
    });
  }else if(text == "Install update!"){
    autoUpdater.quitAndInstall();
  }
}

function UpdateFrysta(data){
  console.log("UpdateFrysta()");
}

function Logout(data){
  var data = JSON.stringify({
    "username"  : options["Username"],
    "loginToken": options["LoginToken"]
  });

  // Upon logging out, remove the username and login token from the config file
  options["Username"]   = "";
  options["LoginToken"] = "";
  storage.set("config", options, function(error){});

  EncryptData(data)
  .then((data) => {
    request.post({url:"https://fizz.gg/logout-of-frysta-app", form: {"data":data}}, function(err, res, msg){
    });
  });
}

/////////////////////////////
// Miscellaneous functions //
/////////////////////////////

function TakeScreenshotShortcut(){
  clickedOnButton = false;
  TakeScreenshot();
}

function ErrorNoPathToSaveImageExists(){
  var errorMessage = "The directory to save a local copy no longer exists. ";
  errorMessage    += "You should disable this feature in the settings, or declare a new valid path.";
  lastUploadedScreenshotUrl = null;

  tray.displayBalloon({
    "icon"   : path.join(__dirname, "img/icon64x64.png"),
    "title"  : "Error!",
    "content": errorMessage
  });

  if(options["SfxOnFailure"] == "true")
    SendMessage("PlaySfxError");
}

function UploadImageToServer(result){
  var formData = {
    "key": "This is the user's secret",
    "file": fs.createReadStream(result)
  };

  request.post({url:"https://fizz.gg/send-screenshot", formData: formData, json: true}, function(err, res, body){
    if(err){
      if(err["code"] == "ENOTFOUND"){
        console.log("Client was unable to communicate with the server");
      }else{
        console.log("An unknown error occurred when trying to communicate with the server");
        console.log("Error code:", err["code"]);
      }
      return;
    }

    if(res["statusCode"] != 200){
      console.log("Invalid response from the server");
      console.log("Error code:", res["statusCode"]);
      return;
    }

    balloonUpdateFrysta       = false;
    lastUploadedScreenshotUrl = body["url"];

    if(options["CopyUrlOnSuccess"] == "true")
      clipboard.write({"text": body["url"]});

    tray.displayBalloon({
      "icon"   : path.join(__dirname, "img/icon64x64.png"),
      "title"  : "Image uploaded",
      "content": lastUploadedScreenshotUrl
    });

    // Move/Rename the file if the option to do so is active
    if(options["LocalCopy"] != "false"){
      var newPath     = `${options["LocalCopy"]}/${body["fileName"]}`;
      var readStream  = fs.createReadStream(result);
      var writeStream = fs.createWriteStream(newPath);

      // Note: Error handling is done earlier so this function can stay empty
      writeStream.on("error", function(err){});

      // Remove the first temporary file when it's done copying to the new directory
      readStream.on("close", function(){
        fs.unlink(result, function(){});
      });

      // Copy the original file to the new destination
      readStream.pipe(writeStream);
    }else{
      fs.unlink(result, function(){});
    }

    if(options["SfxOnSuccess"] == "true")
      SendMessage("PlaySfxNotification");
  });
}

function CheckIfSavePathExists(data){return new Promise((resolve) => {
  if(options["LocalCopy"]){
    fs.access(options["LocalCopy"], function(err){
      if(err)
        resolve(true);
      else
        resolve(false);
    });
  }
})}

function TakeScreenshot(){
  // Do not execute this function if already taking a screenshot or not logged in
  if(screenshotMaskActive || !loggedIn)
    return;
  else
    screenshotMaskActive = false;

  // The screenshot mask will now be active, so I don't want to allow
  // another screenshot to be taken while already in progress of taking one
  screenshotMaskActive = true;

  win.hide();

  screenCapture.TakeScreenshot(function(result){
    // The C++ function has resolved, completing the callback
    // It's now safe to set set the screenshot mask to be inactive
    screenshotMaskActive = false;

    // If the user clicked on the "Screenshot" button, then the window will be displayed again
    if(clickedOnButton) win.show();
    else                win.hide();

    // The C++ function returns the result as "null" if the user hit Escape to cancel a screenshot
    if(result == "null")
      return;

    // Check to see if the path to save a local copy of the image exists
    // If the path doesn't exist, give the user an error
    if(options["LocalCopy"] != "false"){
      CheckIfSavePathExists()
      .then((err) => {
        if(err) ErrorNoPathToSaveImageExists();
        else    UploadImageToServer(result);
      });
    }else{
      UploadImageToServer(result)
    }
  });
}

// It's important that crypto.publicEncrypt is called one time on startup in
// order to prime it for future calls. The reason why this is important is
// because the client lags/freezes for half a second the first time it's
// called which is bad user experience. By doing this initial dry run, the
// lag that normally would have been experienced by the user is prevented.
var publicKey = null;
fs.readFile(path.join(__dirname, "public-key/public.key"), (err, data) => {
  publicKey = data;
  crypto.publicEncrypt(publicKey, new Buffer(""));
});

function EncryptData(data){return new Promise((resolve) => {
  var encryptedData = crypto.publicEncrypt(publicKey, Buffer.from(data));
  encryptedData = Buffer.from(encryptedData).toString("base64");
  resolve(encryptedData);
})}

function SendMessage(func, data=null){
  win.webContents.send("message", {
    "function": func,
    "data"    : data
  });
}
