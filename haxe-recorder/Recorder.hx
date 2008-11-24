import flash.Lib;
import flash.display.MovieClip;
import flash.display.Loader;
import flash.events.NetStatusEvent;
import flash.external.ExternalInterface;
import flash.media.Microphone;
import flash.media.Sound;
import flash.net.NetConnection;
import flash.net.NetStream;
import flash.net.ObjectEncoding;
import flash.net.URLRequest;
import flash.text.TextField;
import flash.text.TextFieldType;

class Recorder {

  static var nc  : NetConnection;
  static var ns  : NetStream;
  static var mic : Microphone;

  public static function main()
  {
    var mc = createMovieClip();
    //var s = new Sound(new URLRequest("babylon.mp3"));
    var sc;
    addButton(flash.Lib.current, "stop", 200, 10, function(e){ 
      trace("stopping");
      stop(); 
    });
    addButton(flash.Lib.current, "record", 200, 32, function(e){ 
      trace("recording");
      record("bavl.flv");
    });
    addButton(flash.Lib.current, "play", 200, 54, function(e){ 
      trace("playing");
      play("bavl.flv");
    });
  }

  static function startConnect(host, f) 
  {
    nc = new NetConnection();
    nc.addEventListener(NetStatusEvent.NET_STATUS, f);
    nc.connect(host);
    trace(host);
  }

  static function stop() {
    // ExternalInterface.call("");
    ns.close();
    nc.close();
  }

  static function record(filename)
  {
    NetConnection.defaultObjectEncoding = ObjectEncoding.AMF0;
    mic = Microphone.getMicrophone(-1);
    mic.rate = 44;
    startConnect("rtmp://localhost", function(e){
      trace("connecting...");
      if (e.info.code == "NetConnection.Connect.Success") {
        ns = new NetStream(nc);
        ns.addEventListener(NetStatusEvent.NET_STATUS, function(e) { });
        ns.attachAudio(mic);
        ns.publish(filename);
      }
    });
  }

  static function play(filename)
  {
    NetConnection.defaultObjectEncoding = ObjectEncoding.AMF0;
    startConnect("rtmp://localhost", function(e){
      trace(e.info);
      if (e.info.code == "NetConnection.Connect.Success") {
        ns = new NetStream(nc);
        ns.play(filename);
      }
    });
  }

  static function createMovieClip(?parent:MovieClip) : MovieClip
  {
    if (parent == null) parent = Lib.current;
    var mc = new MovieClip();
    parent.addChild(mc);
    return mc;
  }

  static function addButton(mc:MovieClip, text, x:Float, y:Float, f)
  {
    var t = new TextField();
    t.text = text;

    var b = new MovieClip();
    b.graphics.beginFill(0xc0c0c0);
    b.graphics.lineStyle(2,0x000000);
    b.graphics.drawRect(0,0,t.width,18);
    b.addChild(t);

    var sb = new flash.display.SimpleButton(); 
    sb.upState = b;
    sb.overState = b;
    sb.downState = b;
    sb.hitTestState = b;
    sb.useHandCursor = true; 
    sb.addEventListener(flash.events.MouseEvent.CLICK, f);
    mc.addChild(sb);
    sb.x = x;
    sb.y = y;
  }

}

