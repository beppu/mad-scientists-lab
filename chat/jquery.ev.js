(function($){

  $.ev = $.ev || {

    handlers : {},
    running  : false,
    xhr      : null,
    verbose  : true,

    log: function() {
      /*
      if (opera) {
        opera.postError(arguments);
      } else if (self.verbose && console) {
        console.log(arguments);
      }
      */
    },

    run: function(events) {
      var i;
      for (i = 0; i < events.length; i++) {
        var e = events[i];
        if (!e) continue;
        var h = this.handlers[e.type];
        if (h) h(e);
      }
    },

    stop: function() {
      this.running = false;
      if (this.xhr) {
        this.xhr.abort();
        this.xhr = null;
      }
      // Maybe it should let the server side know that it stopped listening.
    },

    loop: function(url, channels) {
      var self = this;
      this.running = true;
      if (!channels) channels = [];
      this.xhr = $.ajax({
        type     : 'GET',
        dataType : 'json',
        url      : url,
        data     : { channels: channels },
        success  : function(events, status) {
          self.log('success', events);
          self.run(events)
        },
        complete : function(xhr, status) {
          var delay;
          if (status == 'success') {
            delay = 100;
          } else {
            self.log('status: ' + status, '; waiting before long-polling again...');
            delay = 5000;
          }
          window.setTimeout(function(){ 
            if (self.running) self.loop(url, channels);
          }, delay);
        }
      });
    }

  };

})(jQuery);
