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

var attendeeList = '';
var s3credential = '';
var s3bucket = '';
var s3folder = '';
var pictureWidth = 600;
var pictureHeight = 800;

// start app
var vm = new Vue({
  el: '#main-page',
  data: {
      dialogVisible: false,
      photoListVisible: false,
      photoName: '',
      photoData: '',
      attendees: [],
      selectedAttendee: null,
  },
  computed: {
    filteredAttendees: function() {
      var filtered = [];
      for (var i=0; i<this.attendees.length; i++) {
        var attendee = this.attendees[i];
        var re = new RegExp(this.photoName, 'i');
        if (re.test(attendee)) {
//        console.debug(attendee);
          filtered.push(attendee);
        }
      }
      return filtered;
    }
  },
  created() {
    console.debug('Vue is ready');
  },
  methods: {
    takePicture(ev) {
      ev.preventDefault();
      navigator.camera.getPicture(this.showUploadPhotoDialog, this.fail, {
        sourceType: Camera.PictureSourceType.CAMERA,
        encodingType: Camera.EncodingType.JPEG,
        quality : 70,
        destinationType: Camera.DestinationType.DATA_URL,
        targetWidth: pictureWidth,
        targetHeight: pictureHeight,
        correctOrientation: true
      });
    },
    showUploadPhotoDialog(data) {
      this.photoName = '';
      this.photoData = data;
      this.dialogVisible = true;
    },
    fail(msg) {
      alert(msg);
      this.photoName = '';
      this.photoData = '';
      this.dialogVisible = false;
    },
    uploadPhoto(ev) {
      ev.preventDefault();
      if (this.photoName.length >0) {
        var photoName = this.photoName + '.jpg';
        if (s3folder.length) {
            photoName = s3folder + '/' + photoName;
        }
        console.debug(photoName);
        console.debug(this.photoName);
        if (confirm('Upload the photo as "' + this.photoName + '" ?')) {
          s3_upload(photoName, this.photoData); // remove leading 'data:image/jpeg;base64,'
          this.dialogVisible = false;
        }
      }
      else {
          alert('You must enter the name !!');
      }        
    },
    selectAttendee(attendee) {
//      console.debug('selectedAttendee: ' + attendee);
        this.photoName = attendee;
        this.selectedAttendee = attendee;
    },
    inputAttendee() {
//      console.debug('inputAttendee: ' + this.photoName);
        this.selectedAttendee = null;
        document.getElementById('upload-button-bar').scrollIntoView();
    },
    focusAttendee() {
      document.getElementById('upload-button-bar').scrollIntoView();
    }
  }
});

// retrieve the list as plain-text
var fetchAndLoadAttendeeList = function() {
    var attendees = [];
    axios.get('amidocamera/urls.txt').then(res => {
        var lines = res.data.split(/\r\n|\r|\n/);
        attendeeList = lines[0]; // the first line
        s3credential = lines[1];
        s3bucket = lines[2];
        s3folder = lines[3];
        axios.get(attendeeList).then(res => {
            var lines = res.data.split(/\r\n|\r|\n/);
            for (var i=0; i<lines.length; i++) {
                if (lines[i].length > 0) {
//                  console.debug(lines[i]);
                    attendees[i] = lines[i];
                }
            }
            vm.attendees = attendees;
        }).catch(error => {
          alert('Error while retrieving attendee list...')
          console.debug(error);
        });
    }).catch(error => {
      alert('Fialed load configuration file...');
      console.debug(error);
    });
};

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
    console.debug(s3credential);
    console.debug(s3bucket);
    AWS.config.region = 'us-east-1'; // this is fixed ?
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: s3credential});
    AWS.config.credentials.get(function(err) {
        if (!err) {
            console.debug('Cognito Identify Id: ' + AWS.config.credentials.identityId);
        }
    });
    return new AWS.S3({params: {Bucket: s3bucket}});
};

var s3_upload = function(photoName, dataURI) {
    var blob = dataURItoBlob(dataURI);
    s3_client().putObject({Key: photoName, ContentType: 'image/jpeg', Body: blob, ACL: "public-read"},
    function(err, data){
        // if failed, alert
        if(!err){
          alert("File successfully uploaded !");
          console.debug('File successfully uploaded !')
        } else {
            alert('Error while uploading file...');
            console.debug('Error while uploading file...');
            console.debug(err);
        }
        delete blob;
    });
};

// PhoneGap event handler
document.addEventListener('deviceready', onDeviceReady, false);
function onDeviceReady() {
    console.debug('PhoneGap is ready');
    fetchAndLoadAttendeeList();
}


})()