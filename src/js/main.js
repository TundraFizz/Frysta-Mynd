$(".btn2").hover(function(){
  $(this).animate({
    "box-shadow": "0px 0px 10px 0px #5fb9ff"
  }, 50);
}, function(){
  $(this).animate({
    "box-shadow": "0px 0px 5px 0px #5fb9ff"
  }, 50);
});

$(".btn2").mousedown(function(){
  $(this).animate({
    "box-shadow": "0px 0px 0px 0px #5fb9ff"
  }, 50);
});

$(".btn2").mouseup(function(){
  $(this).animate({
    "box-shadow": "0px 0px 5px 0px #5fb9ff"
  }, 50);
});

const ipc         = require("electron").ipcRenderer;
const EmitMessage = require("electron").remote.app.emit;

function SendMessage(func, data=null){
  EmitMessage("message", {
    "function": func,
    "data"    : JSON.stringify(data)
  });
}

// Sending messages to main.js
$("#btn-screenshot").click(function(){
  SendMessage("TakeScreenshot");
});

$("#btn-minimize").click(function(){
  SendMessage("Minimize");
});

$("#btn-quit").click(function(){
  SendMessage("Quit");
});

function SubmitLogin(username, password){
  if(username.length == 0 && password.length == 0){
    ShowSubmitMessage("Username/password fields are empty", true);
    return false;
  }else if(username.length == 0){
    ShowSubmitMessage("Username field is empty", true);
    return false;
  }else if(password.length == 0){
    ShowSubmitMessage("Password field is empty", true);
    return false;
  }else{
    SendMessage("Login", {
      "username": username,
      "password": password
    });
    return true;
  }
}

function SubmitCreateAccount(email, username, password){
  if(email.length == 0 || username.length == 0 || password.length == 0){
    ShowSubmitMessage("All fields must be filled in", true);
    return false;
  }else if(false){
    // Check if email address is valid
    ShowSubmitMessage("Email address isn't valid", true);
    return false;
  }else if(username.length < 3){
    ShowSubmitMessage("Username must be at least three characters", true);
    return false;
  }else if(password.length < 6){
    ShowSubmitMessage("Password must be at least six characters", true);
    return false;
  }else{
    SendMessage("CreateAccount", {
      "email"   : email,
      "username": username,
      "password": password
    });
    return true;
  }
}

function AnimateSubmitButtonToLoading(){
  $("#submit > div").animate({
    "opacity": "0"
  }, 100);

  $("#submit").animate({
    "width": "22px",
    "border-radius": "12px"
  }, 100, function(){
    $("#submit").animate({
      "opacity": "0"
    }, 100);
    $("#loading").animate({
      "opacity": "1"
    }, 100);

    $("#loading").css("visibility", "visible");
  });
}

function AnimateLoadingToSubmitButton(){
  $("#submit").animate({
    "opacity": "1"
  }, 100, function(){
    $("#submit").animate({
      "width": "54px",
      "border-radius": "4px"
    }, 100);

    $("#submit > div").animate({
      "opacity": "1"
    }, 100);
  });
}

$("#submit").click(function(){
  var selection = $($(".menu-button[active='true']")[0]).text();
  var email     = $("input[name='email']").val();
  var username  = $("input[name='username']").val();
  var password  = $("input[name='password']").val();

  if(selection == "Login"){
    if(SubmitLogin(username, password))
      AnimateSubmitButtonToLoading();
  }
  else if(selection == "Create Account"){
    if(SubmitCreateAccount(email, username, password))
      AnimateSubmitButtonToLoading();
  }
});

$("#test-save").click(function(){
  SendMessage("TestSave");
});

$("#test-load").click(function(){
  SendMessage("TestLoad");
});

$("input").on("focus",function(){
  var text = $(this).val();
  var span = $("span", $(this).parent())[0];
  if(!text)
    $(span).css("color", "rgba(0, 0, 0, 0.4)");
});

$("input").on("blur",function(){
  var text = $(this).val();
  var span = $("span", $(this).parent())[0];
  if(!text)
    $(span).css("color", "rgba(0, 0, 0, 0.7)");
});

$("input").on("input", function(){
  var text = $(this).val();
  var span = $("span", $(this).parent())[0];
  if(text)
    $(span).hide();
  else
    $(span).show();
});

$("#menu-login").click(function(){
  if($(this).attr("active") == "false"){
    $("#menu-login").attr("active", "true");
    $("#menu-create-account").attr("active", "false");

    // Animate the line
    $("#menu-line-fg").animate({
      "left": "0%"
    }, {duration: 250, queue: false});

    $("#input-field-username").animate({
      "top": "14px"
    }, {duration: 250, queue: false});

    $("#input-field-password").animate({
      "top": "48px"
    }, {duration: 250, queue: false});

    $("#input-field-email").animate({
      "opacity": "0"
    }, {duration: 250, queue: false, complete: function(){
      $("#input-field-email").css("visibility", "hidden", "important");
    }});
  }
});

$("[data='create-account']").click(function(){
  if($(this).attr("active") == "false"){
    $("#menu-login").attr("active", "false");
    $("#menu-create-account").attr("active", "true");

    // Animate the line
    $("#menu-line-fg").animate({
      "left": "50%"
    }, {duration: 250, queue: false});

    $("#input-field-username").animate({
      "top": "30px"
    }, {duration: 250, queue: false});

    $("#input-field-password").animate({
      "top": "56px"
    }, {duration: 250, queue: false});

    $("#input-field-email").animate({
      "opacity": "1"
    }, {duration: 250, queue: false});

    $("#input-field-email").css("visibility", "visible", "important");
  }
});

$(".menu-button").click(function(){
  $(".menu-button:visible").attr("active", "false");
  $(this).attr("active", "true");
});

$(".menu-button").hover(function(){
  var self  = this;
  var index = 0;

  $(".menu-button:visible").each(function(){
    if(this == self)
      return false;
    else
      index++;
  });

  var buttonCount = $(".menu-button:visible").length;
  var left        = (100 / buttonCount) * index + "%";

  $(".menu-line-fg:visible").animate({
    "left": left
  }, {duration: 200, queue: false});
}, function(){
  var index = 0;

  $(".menu-button:visible").each(function(){
    if($(this).attr("active") == "true")
      return false;
    else
      index++;
  });

  var buttonCount = $(".menu-button:visible").length;
  var left        = (100 / buttonCount) * index + "%";

  $(".menu-line-fg:visible").animate({
    "left": left
  }, {duration: 200, queue: false});
});

function ShowSubmitMessage(msg, err){
  // The error code may come from an external source which could
  // means it enters as a string. If so, correct it here
  if     (err == "true")  err = true;
  else if(err == "false") err = false;

  $("#message").text(msg);
  $("#message").removeClass();

  if     (err == true)  $("#message").addClass("alert-red");
  else if(err == false) $("#message").addClass("alert-green");

  $("#message").animate({
    "opacity": "1"
  }, 100);
}

function HideSubmitMessage(){
  $("#message").animate({
    "opacity": "0"
  }, 100);
}

$("#message").click(HideSubmitMessage);

function AccountWasCreated(data){
  var msg = data["msg"];
  var err = data["err"];
  ShowSubmitMessage(msg, err);
  AnimateLoadingToSubmitButton();

  $("#loading").animate({
    "opacity": "0"
  }, 100, function(){
    $("#loading").css("visibility", "hidden");
  });
}

function LoginPageToMainApp(data){
  var msg = data["msg"];
  var err = data["err"];

  if(err == "false"){
    $("#loading").css("background-image", "url(ok.png)");
    $("#loading").css("background-size", "cover");
    setTimeout(TransitionToMain, 1000);
  }else if(err == "true"){
    $("#loading").animate({
      "opacity": "0"
    }, 100, function(){
      $("#loading").css("visibility", "hidden");
    });
    AnimateLoadingToSubmitButton();
  }

  ShowSubmitMessage(msg, err);
}

function TransitionToMain(){
  $("#app-1").css("display", "none");
  $("#app-2").css("display", "block");
}

// Receiving a message from main.js
ipc.on("message", (event, msg) => {
  var func = msg["function"];
  var data = JSON.parse(msg["data"]);

  if(func == "AccountWasCreated")  AccountWasCreated(data);
  if(func == "LoginPageToMainApp") LoginPageToMainApp(data);
});

//////////////////////////////////////////////
 // $("#app-2").css("display", "block"); /**/
//////////////////////////////////////////////

// Determine the width and starting position of the menu line forground
$(".menu-line-fg").each(function(){
  var menuButtons = $(".menu-button", $(this).parent().parent());
  var index       = 0;

  $(menuButtons).each(function(){
    if($(this).attr("active") == "true")
      return false;
    else
      index++;
  });

  var left  = (100 / menuButtons.length) * index + "%";
  var width = (100 / menuButtons.length) + "%";

  $(this).css("left", left);
  $(this).css("width", width);
});
