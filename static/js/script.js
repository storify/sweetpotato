/* Author: 

*/

function getDate(dateStr) {
  var d;
  dateStr = (typeof dateStr == 'undefined') ? '' : ''+dateStr; // Make sure it is a string

  if(dateStr.length > 3 && dateStr.substr(10,1)=="T") {
	  dateStr = dateStr.substring(0,19).replace('T',' ').replace(/\-/g,'/');
	  d		= new Date(dateStr);
	  d		= Math.round((d.getTime() - (d.getTimezoneOffset()*60*1000)) /1000);
  }
  else {
	  d		= (dateStr.length > 0) ? new Date(dateStr) : new Date();
	  // Math.round((new Date(tweet.created_at)).getTime()/1000);
	  d		= Math.round((d.getTime()) /1000);
  }
  return d;
};

function displayDate(date,relative) {
	var date = ''+date;

	if(parseInt(date,10) > 0) {
		if(date.length==10) {
			date = parseInt(date,10)*1000;
		}
	} else {
		// Date string are not as flexible on Webkit than Gecko...
		if(date.substr(10,1)=='T') {
			if(date.substr(date.length-1,1)=='Z') {
				date = Date.UTC(parseInt(date.substr(0,4),10),parseInt(date.substr(5,2),10)-1,parseInt(date.substr(8,2),10),parseInt(date.substr(11,2),10),parseInt(date.substr(14,2),10),parseInt(date.substr(17,2),10));
			} else {
				date = (date.substr(16,1)==':') ? date.substr(0,19) : date.substr(0,16);
				date = date.replace('T',' ').replace(/\-/g,'/');
			}
		}
	}
			
	var j=new Date();
	var f=new Date(date);

	//if(B.ie) { f = Date.parse(h.replace(/( \+)/," UTC$1")) }

	if(relative) {
		var i=j-f;
		var c=1000,d=c*60,e=d*60,g=e*24,b=g*7;

		if(isNaN(i)||i<0){return"";}
		if(i<c*7){return"right now";}
		if(i<d){return Math.floor(i/c)+" seconds ago";}
		if(i<d*2){return"about 1 minute ago";}
		if(i<e){return Math.floor(i/d)+" minutes ago";}
		if(i<e*2){return"about 1 hour ago";}
		if(i<g){return Math.floor(i/e)+" hours ago";}
		//if(i>g&&i<g*2){return"yesterday"}
		//if(i<g*365){return Math.floor(i/g)+" days ago"}
	}

	var m_names = new Array("January", "February", "March", 
	"April", "May", "June", "July", "August", "September", 
	"October", "November", "December");

	var curr_date = f.getDate();
	var curr_month = f.getMonth();
	var curr_year = f.getFullYear();
	var curr_minutes = f.getMinutes();
	if(curr_minutes<10) curr_minutes = '0'+curr_minutes;

	return m_names[curr_month] + " "+curr_date+", " + curr_year + ' at '+f.getHours()+':'+curr_minutes;
};

$(document).ready(function() { 
   
  $('#bugs').live('click',function(e){
    if ($(this).hasClass('selected')) {
      $(this).removeClass('selected');
    } else {
      $(this).addClass('selected');
    }
    $('#potatoes li.bug').toggle('fast');
    return false;
  });
  
  $('#features').live('click',function(e){
    if ($(this).hasClass('selected')) {
      $(this).removeClass('selected');
    } else {
      $(this).addClass('selected');
    }
    $('#potatoes li.feature').toggle('fast');
    return false;
  });
  
  $('#todos').live('click',function(e){
    if ($(this).hasClass('selected')) {
      $(this).removeClass('selected');
    } else {
      $(this).addClass('selected');
    }
    $('#potatoes li.todo').toggle('fast');
    return false;
  });

  $('#to-users').live('click',function(e){
    $('#to-users-list').toggle('fast');
    return false;
  });
  
  $('#from-users').live('click',function(e){
    $('#from-users-list').toggle('fast');
    return false;
  });

  $('.user').live('click',function(e){
    var toUser = $(this).attr('id');
    if ($(this).hasClass('selected')) {
      $(this).removeClass('selected');
    } else {
      $(this).addClass('selected');
    }
    $('#potatoes li.'+ toUser).toggle('fast');
    return false;
  });

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
    var classString = "to-" + potato.to.replace("@",'') + " " + potato.category.replace("#",'') + " from-" + potato.from.replace("@",'');
    $('#potatoes').prepend('<li class="'+classString+'"><h3>' + potato.to + ": " + potato.category + "</h3>" + potato.msg +" <h6> Assigned by " + potato.from + " on " + displayDate(potato.created_at) + '</h6></li>');  
  });
  
  socket.on('connect', function(data){
    console.log(data);
  });
      
});






















