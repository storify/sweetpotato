/* Author: 

*/

$(document).ready(function() { 
   
  io.setPath('/client/');
  socket = new io.Socket(null, { 
    port: 8081
    ,transports: ['websocket', 'htmlfile', 'xhr-multipart', 'xhr-polling']
  });
  socket.connect();
   
  $('#sender').bind('click', function(e) {
    e.preventDefault();
    socket.send("Message Sent on " + new Date());  
    return false;   
  });
  
  socket.on('message', function(data){
    var potato = $.parseJSON( data );
    $('#potatos').append('<li>' + potato.to + ": " + potato.msg + " - " + potato.category + " - " + potato.created_at + " - " + potato.from + " - " + potato.hashtag + '</li>');  
  });
  
  socket.on('connect', function(data){
    console.log(data);
  });
      
});






















