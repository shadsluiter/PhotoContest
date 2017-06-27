$(document).ready(function() {

  var signinButton = $('#signin-button');
  var signinButton2 = $('#signin-button2');
  var listeningFirebaseRefs = [];
  var currentUID;
  var selectedFile;
  

 // inital setup screen.
  $('section').hide();
  if (currentUID) {
    $('#login-button').show();
    $('#logout-button').hide();
    $('button-new-post').show();
  }
  else {
    $('#login-button').hide();
    $('#logout-button').show();
    $('#button-new-post').hide();
  }


  loadAllPics("reversedStarCount");
  $('#all-photos').show();


  // Listen for auth state changes
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      console.log("New user logged in = " + user.uid + " " + user.displayName);
        $('#current-user').html("Logged in as " + user.displayName);
        $('#login-button').hide();
        $('#logout-button').show();
        $('#button-new-post').show();
    } else {
      console.log('nobody logged in');
      $('#current-user').html("Not logged in");
      $('#login-button').show();
      $('#logout-button').hide();
        $('#button-new-post').hide();
    }

    if (user && currentUID === user.uid) {
      return;
    }
    cleanupUi();
    if (user) {
      currentUID = user.uid;
      writeUserData(user.uid, user.displayName, user.email, user.photoURL);
      //startDatabaseQueries();
    } else {
      // Set currentUID to null.
      currentUID = null;
    }
});

/**
 * Writes the user's data to the database.
 */
function writeUserData(userId, name, email, imageUrl) {
  firebase.database().ref('users/' + userId).set({
    username: name,
    email: email,
    profile_picture : imageUrl
  });
} // end writeUserData

// reset posts when a new user logs in
function cleanupUi() {
  // Remove all previously displayed posts.
  //topUserPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
  //recentPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
  //userPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';

  // Stop all currently listening Firebase listeners.
  listeningFirebaseRefs.forEach(function(ref) {
    ref.off();
  });
  listeningFirebaseRefs = [];
}

/**
 * Saves a new post to the Firebase DB.
 */

function writeNewPost(uid, username, photoTitle, photoDescription, photoFileName, photoData ) {
 // picture = thunbnail?


 // get all #tags

 var tagwords = /(?:^|\W)#(\w+)(?!\w)/g, match, matches = [];
    while (match = tagwords.exec(photoDescription)) {
      console.log(match[1]);
      matches.push(match[1]);
    }

 // upload picture
  var storageRef = firebase.storage().ref('/uploadedImages/' + photoFileName);

  var uploadTask = storageRef.putString(photoData, 'data_url');


  uploadTask.on('state_changed', function(snapshot) {
     var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
     $("#uploadbar").attr("aria-valuenow",progress);
     $("#uploadbar").attr("style","width:" + progress + "%");
     $("#uploadbar").html(Math.round(progress) + "% uploading...");   
    //console.log('Upload is ' + progress + '% done');
  }, function(error){
    console.log("Something went wrong");
  }, function(){
    var downloadURL = uploadTask.snapshot.downloadURL;
    console.log("The download URL = " + downloadURL);

    var d = new Date();
    var reversedTimeStap = -(d.getTime());

  // A post entry.
  var postData = {
    author: username,
    uid: uid,
    photoTitle: photoTitle,
    starCount: 0,
    reversedStarCount: 5,
    //authorPic: picture,
    photoDescription: photoDescription,
    //photoLocation: photoLocation,
    //photoFile: photoFile,
    downloadURL: downloadURL,
    createdAt: reversedTimeStap,
    numberOfComments: 0
  };

 
  // Get a key for a new Post.
  var newPostKey = firebase.database().ref().child('posts').push().key;
  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/posts/' + newPostKey] = postData;
  updates['/user-posts/' + uid + '/' + newPostKey] = postData;
  // matches is an array that contains all of the hashtag words in the description of the new photo
  // create a dabase entry for each hashtag.  Add one to the hashtag counter.
  matches.forEach(function(word) {
    updates['/hashtags/'  + word + '/' + newPostKey ] = postData;  
  });
   return firebase.database().ref().update(updates);
});
}

// display all pictures on the screen. 1) read data from firebase 2) append element to the page
function loadAllPics(orderBy) {
  // [START my_top_posts_query]
  //var myUserId = firebase.auth().currentUser.uid;
  var allPicsRef = firebase.database().ref('posts');
  $('#all-photos').html("");
  allPicsRef.orderByChild(orderBy).on('child_added', function(snapshot){
    var newElement = createElement(snapshot.key, snapshot.val().author, snapshot.val().photoDescription, snapshot.val().downloadURL, snapshot.val().photoLocation, snapshot.val().photoTitle, snapshot.val().starCount, snapshot.val().numberOfComments, snapshot.val().createdAt);    
    $('#all-photos').append(newElement);
  });
} // loadAllPics

// load all photos who have the specified hashtag (i.e. category) mentioned in the description.
function loadCategory(category) {
  if (category.charAt(0) == "#") {
    category = category.slice(1,category.length);
  }
  console.log("Loading the category " + category);
  var allPicsRef = firebase.database().ref('posts');
  $('#all-photos').html("");
  allPicsRef.orderByChild("reversedStarCount").on('child_added', function(snapshot){

   if (snapshot.val().photoDescription.includes("#" + category) ) {
      var newElement = createElement(snapshot.key, snapshot.val().author, snapshot.val().photoDescription, snapshot.val().downloadURL, snapshot.val().photoLocation, snapshot.val().photoTitle, snapshot.val().starCount, snapshot.val().numberOfComments, snapshot.val().createdAt); 
      $('#all-photos').append(newElement);
    } 
  });

  // hide the hashtag buttons and show the pictures.
  $("section").hide();
  $("#all-photos").show();
}

  // called by loadAllPics() function to create a gallery.
createElement = function(key, author, photoDescription, downloadURL, photoLocation, photoTitle, starCount, numberOfComments, createdAt) {
    
    // convert timestamp to readable string
    createdAt = -createdAt;
    var d = new Date(createdAt);
    var timeString = d.toLocaleString();
    var winnerIconVisible = "show-award";
    if (starCount > 4 ) {
      winnerIconVisible = "show-award";
    }
    else {
      winnerIconVisible = "hide-award";
    }
    
    // Using Handlebars template to crate a new photo post.
    var template = $('#handlebars-photo-item').html();
    // Compile the template data into a function
    var templateScript = Handlebars.compile(template);
    var context = { "key": key, "author" : author, "photoTitle" : photoTitle, "photoDescription" : photoDescription, "photoLocation" : photoLocation, "photoFileName": downloadURL, "startCount" : starCount, "numberOfComments": - numberOfComments, "createdAt" : timeString, "winnerIconVisible" : winnerIconVisible };
    var html = templateScript(context);


    var edt = html.replace(/(^|\s)(#[a-z\d-]+)/ig, "$1<a href='#' class='hashButton btn btn-primary' role='button'>$2</a>");


    



    // return the html code which will be appended to the page.
    return edt;
  } // createElement


// show button for each hashtag stored in the database.
function loadAllHashtags() {
  var allHashTagsRef = firebase.database().ref('hashtags');
  $('#all-contests').html("");
  allHashTagsRef.on('child_added', function(snapshot){
   
    var newElement = createHashTagElement(snapshot.key );    
    $('#all-contests').append(newElement);
  });
} // loadAllHashtags

function createHashTagElement(key) {
// Using Handlebars template to crate a new photo post.
    var template = $('#handlebars-contest-item').html();
    // Compile the template data into a function
    var templateScript = Handlebars.compile(template);
    var context = { "key": key};
    var html = templateScript(context);

    // return the html code which will be appended to the page.
    return html;

}



function loadPhotosFromHashTags(key) {
 var oneHashTagsRef = firebase.database().ref('hashtags/' + key);
  $('#all-contests').html("");
  oneHashTagsRef.on('child_added', function(snapshot){
    var newElement = createElement(snapshot.key, snapshot.val().author, snapshot.val().photoDescription, snapshot.val().downloadURL, snapshot.val().photoLocation, snapshot.val().photoTitle, snapshot.val().starCount, snapshot.val().numberOfComments, snapshot.val().createdAt);    
    $('#all-photos').append(newElement);  
  });
}


// button listeners

    // signin
    signinButton.on('click',function() {
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider);
      $('#button-login').hide();
      $('#button-logout').show();
    });

   signinButton2.on('click',function() {
      var provider = new firebase.auth.FacebookAuthProvider();
      firebase.auth().signInWithPopup(provider);
    });

    
    // signout
    function logUserOut() {
         firebase.auth().signOut().then(function() {
          // Sign-out successful.
          $('#button-login').show();
          $('#button-logout').hide();
         }, function(error) {
        // An error happened.
        });
    }






// Saves message on form submit.
  $('#submit-photo-button').on('click', function(e) {
    e.preventDefault();
    var photoTitle = $('#inputPhotoTitle').val();
    var photoDescription = $('#inputPhotoDescription').val();
    var photoData = $('#inp_img').val();
    var photoFileName = $('#inp_file').val();
     if (photoTitle && photoDescription && photoFileName && photoData) {
      newPostForCurrentUser(photoTitle, photoDescription, photoFileName, photoData).then(function() {
        $('section').hide();
        $('#all-photos').show();
      });
    $('#inputPhotoTitle').val('');
    $('#inputPhotoDescription').val('');
    $('inputPhotoLocation').val('');
    $('#inp_file').val('');
    $('#inp_img').val('');
    $('#picPreview').html('');
    
   
    }
  });

//  file upload listener.  Resize files and show preview before doing the upload.
function fileChange(e) { 
     document.getElementById('inp_img').value = '';
     
     var file = e.target.files[0];
 
     if (file.type == "image/jpeg" || file.type == "image/png") {
 
        var reader = new FileReader();  
        reader.onload = function(readerEvent) {
   
           var image = new Image();
           image.onload = function(imageEvent) {    
              var max_size = 700;
              var w = image.width;
              var h = image.height;
             
              if (w > h) {  if (w > max_size) { h*=max_size/w; w=max_size; }
              } else     {  if (h > max_size) { w*=max_size/h; h=max_size; } }
             
              var canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              canvas.getContext('2d').drawImage(image, 0, 0, w, h);
              $("#picPreview").html(canvas);
              if (file.type == "image/jpeg") {
                 var dataURL = canvas.toDataURL("image/jpeg", 1.0);
              } else {
                 var dataURL = canvas.toDataURL("image/png");   
              }
              document.getElementById('inp_img').value = dataURL;   
           }
           image.src = readerEvent.target.result;
        }
        reader.readAsDataURL(file);



     } else {
        document.getElementById('inp_file').value = ''; 
        alert('Please only select images in JPG- or PNG-format.');  
     }
  }
 
  document.getElementById('inp_file').addEventListener('change', fileChange, false);    




// Hastag name button - click to show all pics with this tag.
$(document).on("click", ".hashButton", function(e) {
  e.preventDefault();
  var tagName = $(this).html();
  loadCategory(tagName);
  
});


// View More button - more info about a picture - show ratings etc.
$(document).on("click", ".pic-details", function() {
  var pictureNumber = $(this).closest(".col-sm-6 ").attr("data-photo-number");
  loadModelDetailView(pictureNumber);

});

// handle star button clicks - update the text
$(document).on("click", "#starButtons > .btn", function(e) {
    var starNumber = $(this).find('input:radio').attr('id');
    starNumber = Number(starNumber.substring(6,starNumber.length));
    $("#star-rating-text").html(starNumber);
});


// write new comments on modal save button.
$(document).on("click", "#save-comments", function(e) {
  e.preventDefault();
  var pictureNumber = $(this).attr("data-photo-number");
  var comments = $('#inputComments').val();
  var starNumber = $('#starButtons').find('input:checked').attr('id');
  starNumber = Number(starNumber.substring(6,starNumber.length));
  var photoTitle = $(this).closest('.modal-content').find('.modal-title').html();
 var userId = firebase.auth().currentUser.uid;
 if (comments) {
  return firebase.database().ref('/users/' + userId).once('value').then(function(snapshot) {
      var username = snapshot.val().username;
      return  writeNewComments(pictureNumber, userId, username, photoTitle, comments, starNumber);
  });
 }
});

// write comments in three locations.
function writeNewComments(picId, uid, username, photoTitle, commentText, starRating) {
  // update the avgStar count
  var allCommentsRef = firebase.database().ref('/posts-comments/' + picId);
  var commentAvgStars = 0;
  var commentSum = 0;
  // commentSum = count the number of comments
  allCommentsRef.once("value")
  .then(function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
       if (childSnapshot.val().starCount > 0) {
          commentAvgStars += parseInt(childSnapshot.val().starCount);
          commentSum += 1;
        }
  });
  }).then(function() { 
        var roundedStarCount = 0; 
        if (commentAvgStars > 0 && commentSum > 0) {
          roundedStarCount = (commentAvgStars / commentSum ).toFixed(1);
        }
        updatePhotoAverage(picId, uid, roundedStarCount, commentSum);
        $("[data-photo-number=" + picId + "]").find("#badge-star-count").html(roundedStarCount);
        $("[data-photo-number=" + picId + "]").find("#badge-comment-count").html(commentSum);
        
  }); 
  // A post entry.
  var postData = {
    picId: picId,
    author: username,
    uid: uid,
    photoTitle: photoTitle,
    starCount: starRating,
    commentText: commentText
  };
  var newPostKey = firebase.database().ref().child('comments').push().key;
  // Write the new comment's data simultaneously in the comments list, the user-comments list nad post-comments list.
  var updates = {};
  updates['/comments/' + newPostKey] = postData;
  updates['/user-comments/' + uid + '/' + newPostKey] = postData;
  updates['/posts-comments/' + picId + '/' + newPostKey] = postData;
  
 return firebase.database().ref().update(updates);
};
// [END writeNewComments]

// within the modal, load the comments for the photo.
function loadModelDetailView(postID) {
  // load the photo and its details.
  var picRef = firebase.database().ref('/posts/' + postID);
    picRef.once('value').then(function(snapshot) {
    var newContent = createModalContent(snapshot.key, snapshot.val().author, snapshot.val().photoDescription, snapshot.val().downloadURL, snapshot.val().photoLocation, snapshot.val().photoTitle, snapshot.val().starCount, snapshot.val().uid, snapshot.val().author);
    $('#pictureDetailsModal .modal-content').html(newContent);
    // add the comments
  var newComments = "<div class='list-group'><a href='#' class='list-group-item active'><h4 class='list-group-item-heading'>Comments</h4></a>";
  var allCommentsRef = firebase.database().ref('/posts-comments/' + snapshot.key);
  var commentAvgStars = 0;
  var commentSum = 0;
  var commentArray = [0,0,0,0,0,0];
  allCommentsRef.once("value")
  .then(function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
        var newComment = createComment(childSnapshot.key, childSnapshot.val().author, childSnapshot.val().commentText, childSnapshot.val().starCount, childSnapshot.val().uid);
        if (childSnapshot.val().starCount > 0) {
          commentAvgStars += parseInt(childSnapshot.val().starCount);
          commentSum += 1;
          commentArray[childSnapshot.val().starCount] += 1;
        }
        newComments = newComments + newComment;
  });
  }).then(function() { 
        var roundedStarCount = 0; 
        if (commentAvgStars > 0 && commentSum > 0) {
          roundedStarCount = (commentAvgStars / commentSum ).toFixed(1);
        }
        newComments = newComments + "<p>Avg star rating: " + roundedStarCount + "<br>";
        updatePhotoAverage(postID, snapshot.val().uid, roundedStarCount, commentSum);
        for(var i = 1; i <= 5; i++) {
          newComments = newComments + "Number of " + i + " ratings: " + commentArray[i] + "<br>"
        }
        newComments = newComments + "<p></div>"; 
        $('#modal-comments-section').html(newComments); 
  }); 
 });
} // loadModalDetailView

  // used by previous function (loadModalDetailView) to update the average starCount value in the picture
updatePhotoAverage = function(key, uid, avgRating, numberOfComments) {

  var updates = {};
  updates['/posts/' + key + '/starCount'] = avgRating;
  updates['/user-posts/' + uid + '/' + key + '/starCount'  ] = avgRating;

  updates['/posts/' + key + '/reversedStarCount'] = 5 - avgRating;
  updates['/user-posts/' + uid + '/' + key + '/reversedStarCount'  ] = 5 - avgRating;

   updates['/posts/' + key + '/numberOfComments'] = -numberOfComments;
  updates['/user-posts/' + uid + '/' + key + '/numberOfComments'  ] = -numberOfComments;

  
  
 return firebase.database().ref().update(updates);
  }

// called by more details button function to create a modal box.
createModalContent = function(key, author, photoDescription, downloadURL, photoLocation, photoTitle, starCount, uid, author) {
    // Using Handlebars template to crate a new photo post.
    var template = $('#handlebars-photo-details').html();
    // Compile the template data into a function
    var templateScript = Handlebars.compile(template);
    var context = { "key": key, "author" : author, "photoTitle" : photoTitle, "photoDescription" : photoDescription, "photoLocation" : photoLocation, "photoFileName": downloadURL, "startCount" : starCount };
    var html = templateScript(context);
    // return the html code which will be appended to the page.
    return html;
  } // create modal content




// called by createCommentContent to generate html for a single comment.
createComment = function(key, author, commentText, starCount, uid) {
    // Using Handlebars template to crate a new photo post.
    var template = $('#handlebars-photo-comments').html();
    // Compile the template data into a function
    var templateScript = Handlebars.compile(template);
    var context = { "key": key, "author" : author, "commentText": commentText, "starCount" : starCount, "uid" : uid };
    var html = templateScript(context);

    // return the html code which will be appended to the page.
    return html;
  } // createElement


/**
 * Creates a new post for the current user.
 */
function newPostForCurrentUser(photoTitle, photoDescription, photoFileName, photoData) {
  var userId = firebase.auth().currentUser.uid;
  return firebase.database().ref('/users/' + userId).once('value').then(function(snapshot) {
    var username = snapshot.val().username;
    return writeNewPost(
        firebase.auth().currentUser.uid, 
        username,
        //firebase.auth().currentUser.photoURL,
        photoTitle, 
        photoDescription,
        photoFileName,
        photoData
       // photoLocation,
       // photoFile
        );
  });
}
  


    // nav bar actions
 

     $('#button-photos-recent').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        loadAllPics("createdAt");
        $('#all-photos').show();
        $("navbar-menu-button").addClass("collapsed");
    });

     $('#button-photos-comments').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        loadAllPics("numberOfComments");
        $('#all-photos').show();
        $("navbar-menu-button").addClass("collapsed");
    });

     $('#button-photos-votes').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        loadAllPics("reversedStarCount");
        $('#all-photos').show();
        $("navbar-menu-button").addClass("collapsed");
    });


     $('#button-constests-name').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        loadAllHashtags();
        $('#all-contests').show();
        $("navbar-menu-button").addClass("collapsed");
    });

    $('.button-photographers').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#all-photographers').show();
    });

    $('.button-new-entry').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#new-entry').show();
    });

    $('#button-login').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#login-page').show();
    });

      $('#button-new-post').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#new-entry').show();
    });

    $('#button-logout').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#login-page').show();
        logUserOut();
    });

     $('#button-home').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#opening-page').show();
    })

    $('#form-search').on('submit', function(e){
        e.preventDefault();
        $('section').hide();
        $('#search-results').show();
    })

    // end nav bar actions




});
