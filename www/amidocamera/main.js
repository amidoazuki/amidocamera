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
var s3credential = '';
var s3bucket = '';
var attendees = [];

// retrieve the list as plain-text
var fetchAndLoadAttendeeList = function() {
    $.get('amidocamera/urls.txt', function(data) {
        var lines = data.split(/\r\n|\r|\n/);
        attendeeList = lines[0]; // the first line
        s3credential = lines[1];
        s3bucket = lines[2];
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
};

// setup autocomplete for name list
var loadNameList = function () {
    $("#photoName").autocomplete( {
        source: attendees,
        classes: {
            'ui-autocomplete': 'nameInput',
        } 
    });
};

var picturePreview = function(data) {
    $('#imagePreview').attr({'src': data, 'width': '100vw', 'height': 'auto'});
};

var fail = function(msg) {
    alert(msg);
};

// generate dialog-like screen..
var uploadPhotoDialog = function(ev) {
    ev.preventDefault();
    console.log('uploadPhoto');
    var img = ev.target;
    var form = $('#pictureForm');
    var photoName = $('#photoName');
    var uploadBtn = $('#uploadPhoto');
    var removeBtn = $('#removePhoto');
    var cancelBtn = $('#cancelPhoto');
    uploadBtn.off('click'); // clear the event listner
    removeBtn.off('click'); // clear the event listner
    cancelBtn.off('click'); // clear the event listner
    picturePreview(img.src);
    uploadBtn.click(function(ev) {
        ev.preventDefault();
        if (photoName.val().length >0) {
            if (confirm('Upload the photo as "' + photoName.val() + '" ?')) {
                s3_upload(photoName.val(), img.src.substr(23), img.parentNode); // remove leading 'data:image/jpeg;base64,'
            }
        }
        else {
            alert('You must enter the name !!');
        }
    });
    cancelBtn.click(function(ev) {
        ev.preventDefault();
        closeUploadPhotoDialog();
    });
    removeBtn.click(function(ev) {
        ev.preventDefault();
        if (confirm('Really delete ?')) {
            closeUploadPhotoDialog();
            img.parentNode.remove();
            picturePreview(''); // clear preview
        }
    });
    form.css({'display': 'inherit'}); // show it
};

var closeUploadPhotoDialog = function() {
    var form = $('#pictureForm');
    var photoName = $('#photoName');
    form.css({'display': 'none'});
    photoName.val(''); // empty the form
};

function addStock(i, data) {
    console.log('addStock'); //debug
    var uri = 'data:image/jpeg;base64,' + data;
    var imgtag = $('<img>', {src: uri, class: 'stockImage'});
    var divtag = $('<div>');
    divtag.append('<p><b>' + i + '</b></p>');
    imgtag.click(uploadPhotoDialog);
    divtag.prepend(imgtag);
    imageList.prepend(divtag);
}

var stockPicture = function(data) {
    console.log('stockPicture'); //debug
    pictureCount += 1;
    addStock(pictureCount, data);
};

var takePicture = function(ev) {
    ev.preventDefault();
    navigator.camera.getPicture(stockPicture, fail, {
        sourceType: Camera.PictureSourceType.CAMERA,
        encodingType: Camera.EncodingType.JPEG,
        quality : 70,
        destinationType: Camera.DestinationType.DATA_URL,
        targetWidth: 600,
        targetHeight: 800,
        correctOrientation: true
    });
};
startButton.click(takePicture);
startButton.focus();

// from http://yamano3201.hatenablog.jp/entry/2016/03/05/214018
var dataURItoBlob = function(dataURI) {
    var binary = atob(dataURI);
    var array = [];
    for (var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
	return new Blob([new Uint8Array(array)], {
    });
};

// below 2 functions are derived from the codes at:
// http://yamano3201.hatenablog.jp/entry/2016/03/05/214018
// https://www.selfree.co.jp/2015/06/18/サーバーレスでjavascript-だけで画像ファイルをアップロードする方法
var s3_client = function() {
    console.log(s3credential);
    console.log(s3bucket);
    AWS.config.region = 'us-east-1'; // this is fixed ?
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: s3credential});
    AWS.config.credentials.get(function(err) {
        if (!err) {
            console.log('Cognito Identify Id: ' + AWS.config.credentials.identityId);
        }
    });
    return new AWS.S3({params: {Bucket: s3bucket}});
};

var s3_upload = function(photoName, dataURI, node2delete) {
    s3_client().putObject({Key: photoName + '.jpg', ContentType: 'image/jpeg', Body: dataURItoBlob(dataURI), ACL: "public-read"},
    function(err, data){
        // if failed, alert
        if(!err){
            $(node2delete).find('b').text(photoName); // update the photo name
            if(confirm('File successfully uploaded !\nDelete it ?')) {
                node2delete.remove();
            }
            console.log('File successfully uploaded !')
        } else {
            alert('Error while uploading file...');
            console.log('Error while uploading file...');
            console.log(err);
        }
        closeUploadPhotoDialog();
    });
};

// PhoneGap event handler
document.addEventListener('deviceready', onDeviceReady, false);
function onDeviceReady() {
    console.log('PhoneGap is ready');
    fetchAndLoadAttendeeList();
}


})()