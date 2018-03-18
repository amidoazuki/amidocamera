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
var s3client = null;
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
      uploadedPhotos: [],
      attendeeSortMethod: 'asc',
      photosSortMethod: 'asc',
      s3ready: false
  },
  computed: {
    filteredAttendees: function() {
      var filtered = [];
      for (var i=0; i<this.attendees.length; i++) {
        var attendee = this.attendees[i].name;
        var re = new RegExp(this.photoName, 'i');
        if (re.test(attendee)) {
//          console.debug('filter: ' + attendee);
          filtered.push(attendee);
        }
      }
      return filtered.sort();
    },
    sortedAttendees: function() {
        var sorted = [];
        for (var i=0; i<this.attendees.length; i++) {
            sorted[i] = this.attendees[i].name;
//            console.debug('sorted: ' + sorted[i]);
        }
        return sorted;  
    },
    photosOnServer: function() {
        var sorted = [];
        for (var i=0; i<this.attendees.length; i++) {
            if (this.uploadedPhotos.indexOf(this.attendees[i].name) >= 0) {
                this.attendees[i].photo = 'Yes';
            }
            else {
                this.attendees[i].photo = 'No';
            }
            sorted[i] = this.attendees[i].photo;
//            console.debug('photos: ' + sorted[i]);
        }
        return sorted;
    },
    photoProgress: function() {
        var count = 0;
        for (var i=0; i<this.attendees.length; i++) {
            if (this.attendees[i].photo === 'Yes') {
                count += 1;
            }
        }
        return '(' + count + '/' + this.attendees.length + ')';
    }
  },
  created: function() {
    console.debug('Vue is ready');
  },
  methods: {
    takePicture: function(ev) {
      ons.disableDeviceBackButtonHandler(); // this needs to prevent to exit application by 'back' button
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
    showUploadPhotoDialog: function(data) {
      this.photoName = '';
      this.photoData = data;
      this.dialogVisible = true;
      ons.enableDeviceBackButtonHandler(); // restore the default behavior
    },
    fail: function(msg) {
      alert(msg);
      this.photoName = '';
      this.photoData = '';
      this.dialogVisible = false;
      ons.enableDeviceBackButtonHandler(); // restore the default behavior
    },
    uploadPhoto: function(ev) {
      ev.preventDefault();
      if (this.photoName.length >0) {
        var photoName = this.photoName + '.jpg';
        if (s3folder.length) {
            photoName = s3folder + '/' + photoName;
        }
//        console.debug(photoName);
//        console.debug(this.photoName);
        if (confirm('Upload the photo as "' + this.photoName + '" ?')) {
          s3_upload(photoName, this.photoData); // remove leading 'data:image/jpeg;base64,'
          this.dialogVisible = false;
        }
      }
      else {
          alert('You must enter the name !!');
      }        
    },
    selectAttendee: function(attendee) {
//      console.debug('selectedAttendee: ' + attendee);
        this.photoName = attendee;
        this.selectedAttendee = attendee;
    },
    inputAttendee: function() {
//      console.debug('inputAttendee: ' + this.photoName);
        this.selectedAttendee = null;
        document.getElementById('upload-button-bar').scrollIntoView();
    },
    focusAttendee: function() {
      document.getElementById('upload-button-bar').scrollIntoView();
    },
    listPhotos: function() {
        s3_listfiles();
//        console.debug('listPhotos: ' + this.uploadedPhotos);
        this.photoListVisible = true;
    },
    sortPhotoList: function(key) {
        if (key === 'name') {
            this.attendeeSortMethod = (this.attendeeSortMethod === 'asc')? 'desc': 'asc';
            this.attendees.sort(compareValues(key, this.attendeeSortMethod));
        }
        if (key === 'photo') {
            this.photosSortMethod = (this.photosSortMethod === 'asc')? 'desc': 'asc';
            this.attendees.sort(compareValues(key, this.photosSortMethod));
        }
    }
  }
});

// retrieve the list as plain-text
var fetchAndLoadParams = function() {
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
                    attendees[i] = {name: lines[i].trim(), photo: 'No'}; // No as default
                }
            }
            s3client = s3_client();
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
//    console.debug(s3credential);
//    console.debug(s3bucket);
    AWS.config.region = 'us-east-1'; // this is fixed ?
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: s3credential});
    AWS.config.credentials.get(function(err) {
        if (!err) {
//            console.debug('Cognito Identify Id: ' + AWS.config.credentials.identityId);
        }
    });
    return new AWS.S3({params: {Bucket: s3bucket}});
};

var s3_upload = function(photoName, dataURI) {
    var blob = dataURItoBlob(dataURI);
    s3client.putObject({Key: photoName, ContentType: 'image/jpeg', Body: blob, ACL: "public-read"},
    function(err, data){
        // if failed, alert
        if(!err){
          alert("File successfully uploaded !");
//          console.debug('File successfully uploaded !')
        } else {
            alert('Error while uploading file...');
            console.debug('Error while uploading file...');
            console.debug(err);
        }
        delete blob;
    });
};

// 
var s3_listfiles = function() {
  var params = {
    Bucket: s3bucket,
    Prefix: s3folder + '/',
    Delimiter: '/'
  };
//  console.debug('s3_listfiles');
  s3client.listObjects(params, function (err, data) {
    if (err) {
      alert('Error while retrieving file list...');
      console.debug('Error while retrieving file list...');
      console.debug(err);
    } else {
//      console.debug('s3_listfiles success: ' + data.Contents.length);
      if (data.IsTruncated) {
          // this should not happen, though...
          alert('File list is truncated !!');
          console.debug('File list is truncated !!');
      }
      var files = [];
      for (var i=0; i<data.Contents.length; i++) {
          var file = data.Contents[i].Key;
          if (file.endsWith('/')) {
//              console.debug('Dir: ' + file);
          }
          else {
              if (file.endsWith('.jpg')) { // only jpg files
                files[i] = file.slice(s3folder.length + 1, -4); // remove s3folder + '/', 'jpg'
//                console.debug('File: ' + files[i]);
              }
          }
      }
      vm.uploadedPhotos = files;
    }
  });
}

var checkS3Ready = function() {
  if (s3client && 'putObject' in s3client && 'listObjects' in s3client) {
      if (typeof(s3client.putObject) === 'function' && typeof(s3client.listObjects) === 'function') {
        vm.s3ready = true;
//        console.debug('checkS3Ready: Ready !! ' + vm.s3ready);
        return;
      }
  }
//  console.debug('checkS3Ready: Not Ready !! ' + vm.s3ready);
  setTimeout(checkS3Ready, 100); // check again 0.1s later
}

// from https://www.webprofessional.jp/sort-an-array-of-objects-in-javascript/
// function for dynamic sorting
function compareValues(key, order='asc') {
  return function(a, b) {
    if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
      // property doesn't exist on either object
        return 0; 
    }

    const varA = (typeof a[key] === 'string') ? 
      a[key].toUpperCase() : a[key];
    const varB = (typeof b[key] === 'string') ? 
      b[key].toUpperCase() : b[key];

    let comparison = 0;
    if (varA > varB) {
      comparison = 1;
    } else if (varA < varB) {
      comparison = -1;
    }
    return (
      (order == 'desc') ? (comparison * -1) : comparison
    );
  };
}

// PhoneGap event handler
document.addEventListener('deviceready', onDeviceReady, false);
function onDeviceReady() {
    console.debug('PhoneGap is ready');
    fetchAndLoadParams();
    checkS3Ready();
//    ons.ready(function() {
//        ons.disableDeviceBackButtonHandler();
//    });
}


})()