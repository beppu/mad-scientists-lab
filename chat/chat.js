$(function(){

  // chatter box
  var cb = {
    init: function(){
      $('#chat').submit(function(ev){
        var x     = {};
        x.name    = $('#chat input.name').val();
        x.message = $('#chat input.message').val();
        $.ajax({
          type: 'POST',
          data: x
        });
        $('#chat input.message').val('');
        return false;
      });
    },
    print: function(name, message) {
      var line = $('#factory tr.message').clone();
      $('td:first', line).html(name);
      $('td:last',  line).html(message);
      $('#messages tr:first').remove();
      $('#messages').append(line);
    }
  };
  cb.init();

  // setup handlers
  $.ev.handlers.time = function(e){
    cb.print(e.name, e.message);
  };
  $.ev.handlers.message = function(e){
    cb.print(e.name, e.message);
  };

  // listen for events
  if ($chat.listen) {
    $.ev.loop('/@event/'+Date.now(), $chat.listen);
  }

});
