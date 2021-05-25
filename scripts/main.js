/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// Shortcuts to DOM Elements.
var splashPage = document.getElementById('page-splash');
var signOutButton = document.getElementById('sign-out-button');
var staticNameText = document.getElementById('staticName');
var staticIdText = document.getElementById('staticId');
var submitButton = document.getElementById('submit-button');
var option1Text = document.getElementById('option1-text');
var option2Text = document.getElementById('option2-text');
var option3Text = document.getElementById('option3-text');
var option4Text = document.getElementById('option4-text');
var option5Text = document.getElementById('option5-text');

var isSuccess = 0;

const _maxRegister = 15;
const register_time = new Date(2021, 4, 8, 14, 30, 0); // month는 설정할 month-1 로 값을 넣어야합니다.

function submitSession(){
  var today = new Date();
  var date = register_time;
  if(today.getTime() < register_time.getTime()){
    alert("수강신청 기간이 아닙니다.\n" +
      "수강신청 기간: " + 
      date.getFullYear() + "/" +
      ("00" + (date.getMonth() + 1)).slice(-2) + "/" +
      ("00" + date.getDate()).slice(-2) + " " +
      ("00" + date.getHours()).slice(-2) + ":" +
      ("00" + date.getMinutes()).slice(-2) + ":" +
      ("00" + date.getSeconds()).slice(-2)
      + " -");

    return;
  }

  var session = document.querySelector('input[name="sessions"]:checked').value;
  isSuccess = 0;
  registerSession(session);

  var sessionName = document.getElementById(session);
  //console.log(sessionName);
  alertSuccess(sessionName.innerText);
}

function registerSession(session){
  var dbRef = firebase.database().ref('/sessions/' + session);
  var currentTime = new Date();

  submitButton.disabled = true;

  Kakao.API.request({
    url: '/v2/user/me',
    success: function(response) {
      // console.log(response);
      dbRef.once('value').then(function(snapshot) {
        const data = snapshot.val();
        //console.log(data);

        firebase.database().ref('users/' + 'k'+response.id).once('value').then(function(snapshot2){
          const checkData = snapshot2.val();
          
          if(checkData.register_session ==  null){
            if(data == null || data.length < _maxRegister || Object.keys(data).length < _maxRegister){
              dbRef.child('k'+response.id).set({
                username: checkData.username,
                register_time: currentTime.toTimeString() + " +" + currentTime.getMilliseconds().toString() +"ms",
              });
    
              firebase.database().ref('users/' + 'k'+response.id).set({
                username: checkData.username,
                email: checkData.email,
                profile_picture : checkData.profile_picture,
                register_session: session,
              }).then(() => {
                isSuccess = 1;
              })
            }
            else{
              isSuccess = -1;
            }
          }
          else{
            isSuccess = -2;
          }
        });
      })
    },
    fail: function(error) {
      //console.log(error);

      Kakao.Auth.logout();
      Kakao.Auth.setAccessToken(null);
      location.reload();
    }
  });
}

function alertSuccess(session){
  if(isSuccess == 1){
    submitButton.disabled = false;
    alert("수강신청에 성공하셨습니다. \n\n 수강신청 과목: " + session);
  }
  else if(isSuccess == -1){
    submitButton.disabled = false;
    alert("수강신청에 실패하셨습니다. \n\n 정원초과 ");
  }
  else if(isSuccess == -2){
    submitButton.disabled = false;
    alert("수강신청에 실패하셨습니다. \n\n 이미 신청된 상태입니다.");
  }
  else {
    setTimeout(alertSuccess, 500, session);
  }
}

/**
 * Writes the user's data to the database.
 */
function writeUserData() {
  Kakao.API.request({
    url: '/v2/user/me',
    success: function(response) {
      //console.log(response);
      var currentTime = new Date();
      // firebase.database().ref('login-log/' + currentTime.toString()).set(response);

      firebase.database().ref('users/' + 'k'+response.id).once('value').then(function(snapshot){
        const data = snapshot.val();
        var updatedData = {
          username: response.kakao_account.profile.nickname,
          email: (response.kakao_account.email != null || response.kakao_account.email != undefined ? response.kakao_account.email : '비공개'),
          profile_picture : (response.kakao_account.profile.profile_image_url != null || response.kakao_account.profile.profile_image_url != undefined ? response.kakao_account.profile.profile_image_url : 'default')
        };

        if(data != null){
          if(data.register_session != null || data.register_session != undefined)
          updatedData.register_session = data.register_session;
        }
        
        firebase.database().ref('users/' + 'k'+response.id).set(updatedData);

        staticNameText.value = response.kakao_account.profile.nickname;
        staticIdText.value = (response.kakao_account.email != null || response.kakao_account.email != undefined ? response.kakao_account.email : '비공개');
      });
    }, 
    fail: function(error) {
      //console.log(error);

      Kakao.Auth.logout();
      Kakao.Auth.setAccessToken(null);
      location.reload();
    }
  });
}


// Bindings on load.
window.addEventListener('load', function() {
  var token = Kakao.Auth.getAccessToken();
  //console.log(token);
  if (!token) {
    //console.log('Not logged in.');
    Kakao.Auth.setAccessToken(null);
    splashPage.style.display = '';
  }
  else {
    writeUserData();
    splashPage.style.display = 'none';
  }

  Kakao.Auth.createLoginButton({
    container: '#kakao-login-btn',
    success: function(authObj) {
      //console.log(authObj);
      // Kakao.Auth.setAccessToken(authObj['access_token']);
      location.reload();
    },
    fail: function(err) {
      alert('failed to login: ' + JSON.stringify(err));
    },
  })

  // Bind Sign out button.
  signOutButton.addEventListener('click', function() {
    Kakao.Auth.logout();
    Kakao.Auth.setAccessToken(null);
    
    location.reload();
  });

  submitButton.addEventListener('click', function() {
    submitSession();
  });

  var dbRef = firebase.database().ref('/sessions/');
  dbRef.child('option1').on('value',(snapshot) => {
    const data = snapshot.val();
    if(data != null)
      option1Text.innerText = Object.keys(data).length + '/' + _maxRegister;
    else
      option1Text.innerText = 0 + '/' + _maxRegister;
  });
  dbRef.child('option2').on('value',(snapshot) => {
    const data = snapshot.val();
    if(data != null)
      option2Text.innerText = Object.keys(data).length + '/' + _maxRegister;
    else
      option2Text.innerText = 0 + '/' + _maxRegister;
  });
  dbRef.child('option3').on('value',(snapshot) => {
    const data = snapshot.val();
    if(data != null)
      option3Text.innerText = Object.keys(data).length + '/' + _maxRegister;
    else
      option3Text.innerText = 0 + '/' + _maxRegister;
  });
  dbRef.child('option4').on('value',(snapshot) => {
    const data = snapshot.val();
    if(data != null)
      option4Text.innerText = Object.keys(data).length + '/' + _maxRegister;
    else
      option4Text.innerText = 0 + '/' + _maxRegister;
  });
  dbRef.child('option5').on('value',(snapshot) => {
    const data = snapshot.val();
    if(data != null)
      option5Text.innerText = Object.keys(data).length + '/' + _maxRegister;
    else
      option5Text.innerText = 0 + '/' + _maxRegister;
  });
}, false);
