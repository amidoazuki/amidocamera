/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/
(function(){

var pictureCount = 0;
var imageList = $('#imageList');
var startButton = $('#start-button');
var attendeeList = '';
var attendees = [];

// retrieve the list as plain-text
var fetchAndLoadAttendeeList = function() {
    $.get('amidocamera/urls.txt', function(data) {
        var lines = data.split(/\r\n|\r|\n/);
        attendeeList = lines[0]; // the first line
        $.get(attendeeList, function(data) {
            var lines = data.split(/\r\n|\r|\n/);
            for (var i=0; i<lines.length; i++) {
                if (lines[i].length > 0) {
//                    console.log(lines[i]);
                    attendees[i] = lines[i];
                }
            }
            loadNameList();
        });
    });
}

var loadNameList = function () {
    options = $.map(attendees, function(n, i) {
        console.log(n);
        return $('<option>', { value: i, text: n, selected: false });
    });
    var $namelist = $('#namelist');
    $namelist.append(options);
    $namelist.comboboxex();
}

var picturePreview = function(data) {
    $('#imagePreview').attr({'src': "data:image/jpeg;base64," + data});
    $('#imagePreview').css('display', 'inherit')
};

var closePreview = function() {
    $('#imagePreview').css('display', 'none');
}

var fail = function(msg) {
    alert(msg);
}

function addStock(i, data) {
    console.log('addStock'); //debug
    var uri = 'data:image/jpeg;base64,' + data;
    var imgtag = '<div class="container"><p><img class="stockImage" src="' + uri + '"/></p><p><b>' + i + '</b></p></div>';
    imageList.prepend(imgtag);
}

var stockPicture = function(data) {
    console.log('stockPicture'); //debug
    pictureCount += 1;
    addStock(pictureCount, data);
}

var takePicture = function() {
    navigator.camera.getPicture(stockPicture, fail, {
        sourceType: Camera.PictureSourceType.CAMERA,
        encodingType: Camera.EncodingType.JPEG,
        quality : 70,
        destinationType: Camera.DestinationType.DATA_URL,
        targetWidth: 600,
        targetHeight: 800,
        correctOrientation: true
    });
}
startButton.click(takePicture);
startButton.focus();

// PhoneGap event handler
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
    console.log("PhoneGap is ready");
    fetchAndLoadAttendeeList();
}


})()