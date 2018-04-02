var path          = require("path");    // -
var url           = require("url");     // -
var fs            = require("fs");      // File system
var crypto        = require("crypto");  // -
var bcrypt        = require("bcrypt");  // -
var $             = require("jquery");  // jQuery
var request       = require("request"); // POST request to the server
var storage       = require("electron-json-storage");
var screenCapture = require("../build/Release/screen-capture.node"); // C++ module for screen capturing

var {app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, clipboard, shell} = require("electron");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var win  = null;
var tray = null;
var quit = false;
var clickedOnButton = null;
var lastUploadedScreenshotUrl = null;

// Default options
var options = {
  "LaunchOnStartup" : "true",
  "CopyUrlOnSuccess": "false",
  "SfxOnSuccess"    : "true",
  "SfxOnFailure"    : "true",
  "LocalCopy"       : "false"
};

storage.setDataPath(__dirname);

// Get options. If there are no options, create a file with default options
// storage.set("foobar", {"foo": "bar"}, function(error){
//   storage.get("foobar", function(error, data){
//     if(error)
//       throw error;
//     console.log(data);
//   });
// });

const dataPath = storage.getDataPath();

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

  win.toggleDevTools();

  win.setMenu(null);

  globalShortcut.register("ctrl+shift+1", function (){
    TakeScreenshotShortcut();
  });

  tray = new Tray(path.join(__dirname, "img/icon64x64.png"));

  var contextMenu = Menu.buildFromTemplate([
    {
      "label": "Item 1",
      "type" : "radio",
      "icon" : path.join(__dirname, "img/icon64x64.png")
    },
    {
      "label": "Item 2",
      "submenu": [
        {"label": "submenu 1"},
        {"label": "submenu 2"},
      ]
    },
    {
      "label": "Item 3",
      "type" : "radio",
      "checked": true
    },
    {
      "label": "Toggle Tools",
      "accelerator": "Ctrl+I",
      "click": function(){
        win.webContents.toggleDevTools();
      }
    },
    {
      "label": "Quit Frysta",
      "click": function(){
        quit = true;
        win.close();
      }
    }
  ]);

  tray.setToolTip("App icon tooltip!");
  tray.setContextMenu(contextMenu);

  tray.on("click", function(){
    console.log("Single click");
    win.showInactive();
  });

  tray.on("double-click", function(){
    console.log("Double click");
    win.focus();
  });

  tray.on("balloon-click", function(){
    if(lastUploadedScreenshotUrl)
      shell.openExternal(lastUploadedScreenshotUrl);
  });

  win.once("ready-to-show", function(){

    storage.get("config", function(error, data){
      if("LaunchOnStartup"  in data) options["LaunchOnStartup"]  = data["LaunchOnStartup"];
      if("CopyUrlOnSuccess" in data) options["CopyUrlOnSuccess"] = data["CopyUrlOnSuccess"];
      if("SfxOnSuccess"     in data) options["SfxOnSuccess"]     = data["SfxOnSuccess"];
      if("SfxOnFailure"     in data) options["SfxOnFailure"]     = data["SfxOnFailure"];
      if("LocalCopy"        in data) options["LocalCopy"]        = data["LocalCopy"];

      SendMessage("GetOptions", options);
      storage.set("config", options, function(error){});
    });

    var loggedIn = false; // DEBUG VARIABLE

    if(loggedIn)
      win.hide();
    else
      win.show();
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
  else if(func == "CreateAccount")        CreateAccount       (data);
  else if(func == "Login")                Login               (data);
  else if(func == "SetOption")            SetOption           (data);
  else if(func == "TestSave")             TestSave            (data);
  else if(func == "TestLoad")             TestLoad            (data);
});

function SetOption(data){
  data = JSON.parse(data);

  for(key in data)
    options[key] = data[key];

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

function CreateAccount(data){
  EncryptData(data)
  .then((data) => {
    request.post({url:"https://fizz.gg/create-account", form: {"data":data}}, function(err, res, msg){
      SendMessage("AccountWasCreated", msg);
    });
  });
}

function Login(data){
  EncryptData(data)
  .then((data) => {
    request.post({url:"https://fizz.gg/login", form: {"data":data}}, function(err, res, msg){
      SendMessage("LoginPageToMainApp", msg);
    });
  });
}

function TestSave(data){
  console.log("========== TestSave ==========");
}

function TestLoad(data){
  console.log("========== TestLoad ==========");
}

/////////////////////////////
// Miscellaneous functions //
/////////////////////////////

function TakeScreenshotShortcut(){
  clickedOnButton = false;
  TakeScreenshot();
}

CheckIfSavePathExists = function(data){return new Promise((resolve) => {
  if(options["LocalCopy"]){
    fs.access(options["LocalCopy"], function(err){
      if(err)
        resolve(true);
      else
        resolve(false);
    });
  }
})}

function ErrorNoPathToSaveImageExists(){
  var errorMessage = "The directory to save a local copy no longer exists. ";
  errorMessage    += "You should disable this feature in the settings, or declare a new valid path.";
  lastUploadedScreenshotUrl = null;

  tray.displayBalloon({
    "icon"   : path.join(__dirname, "img/icon64x64.png"),
    "title"  : "Error!",
    "content": errorMessage
  });

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

    lastUploadedScreenshotUrl = body["url"];
    clipboard.write({"text": body["url"]});

    tray.displayBalloon({
      "icon"   : path.join(__dirname, "img/icon64x64.png"),
      "title"  : "Image uploaded",
      "content": lastUploadedScreenshotUrl
    });

    // Delete the file

    // Move/Rename the file if the option to do so is active
    if(options["LocalCopy"]){
      var newPath = `${options["LocalCopy"]}/${body["fileName"]}`;
      console.log(newPath);

      var readStream  = fs.createReadStream(result);
      var writeStream = fs.createWriteStream(newPath);

      // readStream.on("error", callback);
      writeStream.on("error", function(err){
        // var errorMessage = "The directory to save a local copy no longer exists. ";
        // errorMessage    += "You should disable this feature in the settings, or declare a new valid path.";

        // tray.displayBalloon({
        //   "icon"   : path.join(__dirname, "img/icon64x64.png"),
        //   "title"  : "Error!",
        //   "content": errorMessage
        // });
      });

      readStream.on("close", function(){
        console.log("File has been moved, deleting");
        fs.unlink(result, function(){console.log("File has been deleted")});
      });

      readStream.pipe(writeStream);

      // fs.copyFile(result, newPath, function(err){console.log(err)});

      // fs.rename(result, newPath, function(err){console.log(err)});
    }else{
      fs.unlink(result, function(){});
    }

    SendMessage("PlaySfxNotification");
  });
}

function TakeScreenshot(){
  win.hide();
  // win.minimize(); // I don't think I need this anymore

  screenCapture.TakeScreenshot(function(result){
    // If the user clicked on the "Screenshot" button, then we'll display the window again
    if(clickedOnButton) win.show();
    else                win.hide();

    // Check to see if the path to save a local copy of the image exists
    // If the path doesn't exist, give the user an error
    CheckIfSavePathExists()
    .then((err) => {
      if(err) ErrorNoPathToSaveImageExists();
      else    UploadImageToServer(result);
    });
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

EncryptData = function(data){return new Promise((resolve) => {
  var encryptedData = crypto.publicEncrypt(publicKey, Buffer.from(data));
  encryptedData = Buffer.from(encryptedData).toString("base64");
  resolve(encryptedData);
})}

function SendMessage(func, data=null){
  win.webContents.send("message", {
    "function": func,
    "data"    : data
    // "data"    : JSON.stringify(data)
  });
}
