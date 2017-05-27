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
  }
  else {
    $('#login-button').hide();
    $('#logout-button').show();
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
    } else {
      console.log('nobody logged in');
      $('#current-user').html("Not logged in");
      $('#login-button').show();
      $('#logout-button').hide();
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

function writeNewPost(uid, username, picture, photoTitle, photoDescription, photoLocation, photoFile ) {

 // get all #tags

 var tagwords = /(?:^|\W)#(\w+)(?!\w)/g, match, matches = [];
    while (match = tagwords.exec(photoDescription)) {
      console.log(match[1]);
      matches.push(match[1]);
    }

 // upload picture

  var fileName = selectedFile.name;
  var storageRef = firebase.storage().ref('/uploadedImages/' + fileName);
  var uploadTask = storageRef.put(selectedFile);

  uploadTask.on('state_changed', function(snapshot) {
     var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
     $("#uploadbar").attr("aria-valuenow",progress);
     $("#uploadbar").attr("style","width:" + progress + "%");
     $("#uploadbar").html(Math.round(progress) + "% uploading...");   
    console.log('Upload is ' + progress + '% done');
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
    authorPic: picture,
    photoDescription: photoDescription,
    photoLocation: photoLocation,
    photoFile: photoFile,
    downloadURL: downloadURL,
    createdAt: reversedTimeStap,
    numberOfComments: 0
  };

  console.log("Posting" , postData);

  // Get a key for a new Post.
  var newPostKey = firebase.database().ref().child('posts').push().key;
  // Write the new post's data simultaneously in the posts list and the user's post list.
  var updates = {};
  updates['/posts/' + newPostKey] = postData;
  updates['/user-posts/' + uid + '/' + newPostKey] = postData;
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


  // called by loadAllPics() function to create a gallery.
createElement = function(key, author, photoDescription, downloadURL, photoLocation, photoTitle, starCount, numberOfComments, createdAt) {
    
    // convert timestamp to readable string
    createdAt = -createdAt;
    var d = new Date(createdAt);
    var timeString = d.toLocaleString();
    
    // Using Handlebars template to crate a new photo post.
    var template = $('#handlebars-photo-item').html();
    // Compile the template data into a function
    var templateScript = Handlebars.compile(template);
    var context = { "key": key, "author" : author, "photoTitle" : photoTitle, "photoDescription" : photoDescription, "photoLocation" : photoLocation, "photoFileName": downloadURL, "startCount" : starCount, "numberOfComments": - numberOfComments, "createdAt" : timeString };
    var html = templateScript(context);

    // return the html code which will be appended to the page.
    return html;
  } // createElement


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



// listen for new file upload
$('#inputFile').on('change', function(event){
  selectedFile = event.target.files[0];
  console.log('Selected file is ' + selectedFile.name);

});


// Saves message on form submit.
  $('#submit-photo-button').on('click', function(e) {
    e.preventDefault();
    var photoTitle = $('#inputPhotoTitle').val();
    var photoDescription = $('#inputPhotoDescription').val();
    var photoLocation = $('#inputPhotoLocation').val();
    var photoFile = $('#inputFile').val();
     if (photoTitle && photoDescription && photoLocation && photoFile) {
      newPostForCurrentUser(photoTitle, photoDescription, photoLocation, photoFile).then(function() {
        $('section').hide();
        $('#all-photos').show();
      });
    $('#inputPhotoTitle').val('');
    $('#inputPhotoDescription').val('');
    $('inputPhotoLocation').val('');
    $('#inputFile').val('');
    }
  });



// View More button - more info about a picture - show ratings etc.
$(document).on("click", ".pic-details", function() {
  var pictureNumber = $(this).closest("div").parent().parent().attr("data-photo-number");
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
function newPostForCurrentUser(photoTitle, photoDescription, photoLocation, photoFile) {
  var userId = firebase.auth().currentUser.uid;
  return firebase.database().ref('/users/' + userId).once('value').then(function(snapshot) {
    var username = snapshot.val().username;
    return writeNewPost(firebase.auth().currentUser.uid, username,
        firebase.auth().currentUser.photoURL,
        photoTitle, 
        photoDescription,
        photoLocation,
        photoFile
        );
  });
}
  


    // nav bar actions
    $('.button-contests').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#all-contests').show();
    });

     $('#button-photos-recent').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        loadAllPics("createdAt");
        $('#all-contests').show();
    });

     $('#button-photos-comments').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        loadAllPics("numberOfComments");
        $('#all-contests').show();
    });

     $('#button-photos-votes').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        loadAllPics("reversedStarCount");
        $('#all-contests').show();
    });


     $('.button-photos').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#all-photos').show();
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
