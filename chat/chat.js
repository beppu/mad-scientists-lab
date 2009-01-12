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
      var line = $('#factory li.message').clone().html(message);
      $('#messages li:first').remove();
      $('#messages').append(line);
    }
  };
  cb.init();

  // setup handlers
  $.ev.handlers.time = function(e){
    cb.print(null, e.value);
  };
  $.ev.handlers.message = function(e){
    cb.print(null, e.value);
  };

  // listen for events
  if ($chat.listen) {
    $.ev.loop('/@event', $chat.listen);
  }

});
