$(document).ready(function() {
    

    // nav bar actions
    $('.button-contests').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#all-contests').show();
    })

     $('.button-photos').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#all-photos').show();
    })

    $('.button-photographers').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#all-photographers').show();
    })

    $('.button-new-entry').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#new-entry').show();
    })

    $('.button-user').on('click', function(e){
        e.preventDefault();
        $('section').hide();
        $('#user-account').show();
    })

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



    // form actions
    



    /**
 * Creates a new post for the current user.
 */
function newPostForCurrentUser(title,description, location, file) {
  // [START single_value_read]
  var userId = firebase.auth().currentUser.uid;
  return firebase.database().ref('/users/' + userId).once('value').then(function(snapshot) {
    var username = snapshot.val().username;
    // [START_EXCLUDE]
    return writeNewPost(firebase.auth().currentUser.uid, username,
        firebase.auth().currentUser.photoURL,
        title,description, location, file);
    // [END_EXCLUDE]
  });
  // [END single_value_read]
}

    // new photo form
    $('#submit-photo-button').on('click', function(e) {
    e.preventDefault();
    console.log('clicked submit form');
    var title = $('#inputPhotoTitle').val();
    var description = $('#inputPhotoDescription').val();
    var location = $('#inputPhotoLocation').val();
    var filename = $('#inputFile').val(); 
    //newPostForCurrentUser(title, description, location ,filename);

    if (title && description && location && filename) {
      newPostForCurrentUser(title, description, location, filename).then(function(){
        $('#inputPhotoTitle').text('');
        $('#nputPhotoDescription').text('');
        $('#inputPhotoLocation').text('');
        $('#inputFile').text(''); 
      });
    }
    });



  // end form actions


  // data handling functions




  // end data handling functions

});
