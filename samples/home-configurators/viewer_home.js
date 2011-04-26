/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * This file contains definitions for the common functions used by all the home
 * configurator pages.
 */
o3djs.require('o3djs.util');
o3djs.require('o3djs.arcball');
o3djs.require('o3djs.dump');
o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.shape');
o3djs.require('o3djs.effect');
o3djs.require('o3djs.material');
o3djs.require('o3djs.pack');
o3djs.require('o3djs.picking');
o3djs.require('o3djs.scene');
o3djs.require('o3djs.canvas');
o3djs.require('o3djs.loader');
o3djs.require('o3djs.camera');


var g_root;
var g_o3d;
var g_math;
var g_client;
var g_thisRot;
var g_lastRot;
var g_pack = null;
var g_mainPack;
var g_viewInfo;
var g_lightPosParam;
var g_currentTool = null;
var g_floorplanRoot = null;
var g_placedModesRoot = null;
var TOOL_ORBIT = 3;
var TOOL_MOVE = 1;
var TOOL_ZOOM_EXTENTS = 6;
var g_urlToInsert;
var g_isDraggingItem = false;
var g_o3dElement = null;
var g_lastMouseButtonState = 0;

// for onrender
var g_clock = 0;
var g_timeMult = 1;

// for cat animation
var g_aniClock = 0;
var g_animTimeParam;
var g_animEndTime = 249 / 30;  // 249 30hz frames.
var g_loadInfo;
var g_downloadPercent = -1;
/** for animation **/
/**
 * Sets the status message
 * @param {string} msg The message.
 */

function setStatus(msg) {
  var element = document.getElementById('status');
  if (element) {
    element.innerHTML = msg;
  }
}

/**
 * Loads a scene into the transform graph.
 * @param {!o3d.Pack} pack Pack to load scene into.
 * @param {string} fileName filename of the scene.
 * @param {!o3d.Transform} parent parent node in the transform graph to
 *      which to load the scene into.
 */
function loadScene(pack, fileName, parent) {
  // Get our full path to the scene
  var scenePath = o3djs.util.getCurrentURI() + fileName;

  // Load the file given the full path, and call the callback function
  // when its done loading.
  g_loadInfo = o3djs.scene.loadScene(
      g_client, pack, parent, scenePath, callback,
      { opt_animSource: g_animTimeParam});

  /**
   * Our callback is called once the scene has been loaded into memory
   * from the web or locally.
   * @param {!o3d.Pack} pack The pack that was passed in above.
   * @param {!o3d.Transform} parent The parent that was passed in above.
   * @param {*} exception null if loading succeeded.
   */
  function callback(pack, parent, exception) {

    g_loadInfo = null;
    if (exception) {
      setStatus('could **not** load ' + fileName + '. ' + exception);
      return;
    }
	
	parent.rotateX(90*Math.PI/180);
	parent.rotateY(195*Math.PI/180);
	parent.scale([1/2,1/2,1/2]);
	parent.translate([-90,0,110]);
    // Get a CameraInfo (an object with a view and projection matrix)
    // using our javascript library function
    // var cameraInfo = o3djs.camera.getViewAndProjectionFromCameras(
    //       parent,
    //       g_client.width,
    //       g_client.height);

    // Copy the view and projection to the draw context.
    // g_viewInfo.drawContext.view = cameraInfo.view;
    //    g_viewInfo.drawContext.projection = cameraInfo.projection;

    // Generate draw elements and setup material draw lists.
    o3djs.pack.preparePack(pack, g_viewInfo);

    var materials = pack.getObjectsByClassName('o3d.Material');
      for (var m = 0; m < materials.length; ++m) {
        var material = materials[m];
        var param = material.getParam('lightWorldPos');
        if (param) {
          param.bind(g_lightPosParam);
        }
      }

    // Reset the clock.
    g_aniClock = 0;

    setStatus('');

    g_finished = true;  // for selenium testing.

  }
}

function init_ani(){

 // Create a param to bind to the animation.
  var paramObject = g_pack.createObject('ParamObject');
  g_animTimeParam = paramObject.createParam('myClock', 'ParamFloat');

  // Creates a transform to put our data on.
  var myDataRoot = g_pack.createObject('Transform');

  // Connects our root to the client root.
  myDataRoot.parent = g_client.root;

  // Load the scene into the transform graph as a child myDataRoot
  loadScene(g_pack, 'assets/kitty_151_idle_stand05_cff1.o3dtgz', myDataRoot);


}
function onrender_ani(render_event){
// Get the number of seconds since the last render.
  var elapsedTime = render_event.elapsedTime;
  g_aniClock += elapsedTime * g_timeMult;

    // Repeat the animation over and over.
  g_aniClock = g_aniClock % g_animEndTime;

  // Set the time to display.
  g_animTimeParam.value = g_aniClock;

  if (g_loadInfo) {
    var progressInfo = g_loadInfo.getKnownProgressInfoSoFar();
    if (progressInfo.percent != g_downloadPercent) {
      g_downloadPercent = progressInfo.percent;
      setStatus('Loading... ' + progressInfo.percent + '%' +
                ' (' + progressInfo.downloaded +
                ' of ' + progressInfo.totalBytes + progressInfo.suffix + ')');
    }
  }
}

/****************************/
/**
 * Retrieve the absolute position of an element on the screen.
 */
function getAbsolutePosition(element) {
  var r = { x: element.offsetLeft, y: element.offsetTop };
  if (element.offsetParent) {
    var tmp = getAbsolutePosition(element.offsetParent);
    r.x += tmp.x;
    r.y += tmp.y;
  }
  return r;
}

/**
 * Retrieve the coordinates of the given event relative to the center
 * of the widget.
 *
 * @param event
 *  A mouse-related DOM event.
 * @param reference
 *  A DOM element whose position we want to transform the mouse coordinates to.
 * @return
 *    An object containing keys 'x' and 'y'.
 */
function getRelativeCoordinates(event, reference) {
  var x, y;
  event = event || window.event;
  var el = event.target || event.srcElement;
  if (!window.opera && typeof event.offsetX != 'undefined') {
    // Use offset coordinates and find common offsetParent
    var pos = { x: event.offsetX, y: event.offsetY };
    // Send the coordinates upwards through the offsetParent chain.
    var e = el;
    while (e) {
      e.mouseX = pos.x;
      e.mouseY = pos.y;
      pos.x += e.offsetLeft;
      pos.y += e.offsetTop;
      e = e.offsetParent;
    }
    // Look for the coordinates starting from the reference element.
    var e = reference;
    var offset = { x: 0, y: 0 }
    while (e) {
      if (typeof e.mouseX != 'undefined') {
        x = e.mouseX - offset.x;
        y = e.mouseY - offset.y;
        break;
      }
      offset.x += e.offsetLeft;
      offset.y += e.offsetTop;
      e = e.offsetParent;
    }
    // Reset stored coordinates
    e = el;
    while (e) {
      delete e.mouseX;
      delete e.mouseY;
      e = e.offsetParent;
    }
  }
  else {
    // Use absolute coordinates
    var pos = getAbsolutePosition(reference);
    x = event.pageX - pos.x;
    y = event.pageY - pos.y;
  }

  return { x: x, y: y };
}


// The target camera has its z and y flipped because that's the way Scott
// Lininger thinks.
function TargetCamera() {
  // this.eye = {
  //       rotZ: -Math.PI / 3,
  //       rotH: Math.PI / 3,
  //       distanceFromTarget: 700 };
  // this.target = { x: 0, y: 0, z: 0 };
  this.eye = {
	x: -128,
	y: 432,
	z: 50,
      rotZ: 1.78,
      rotH: 1.43,
      distanceFromTarget: 409 };
  this.target = { x: -115, y: 407, z: 50 }; // position of target
}	

TargetCamera.prototype.update = function() {
  var target = [this.target.x, this.target.y, this.target.z];

  // this.eye.x = this.target.x + Math.cos(this.eye.rotZ) *
  //     this.eye.distanceFromTarget * Math.sin(this.eye.rotH);
  // this.eye.y = this.target.y + Math.sin(this.eye.rotZ) *
  //     this.eye.distanceFromTarget * Math.sin(this.eye.rotH);
  // this.eye.z = this.target.z + Math.cos(this.eye.rotH) *
  //     this.eye.distanceFromTarget;

   var eye = [this.eye.x, this.eye.y, this.eye.z];
//   var eye = [100,10,50];
 //  var target=[0,0,50];
 // this.up = [0, 0, 1];
  g_viewInfo.drawContext.view = g_math.matrix4.lookAt(eye, target, this.up);
  g_lightPosParam.value = eye;

	// update status bar
	
	cx = document.getElementById("c_x");
		//alert(cx.innnerHTML);
		if (cx)
				cx.innerHTML=this.eye.x;
	document.getElementById("c_y").innerHTML=this.eye.y;
	document.getElementById("c_z").innerHTML=this.eye.z;
	document.getElementById("t_x").innerHTML=this.target.x;
	document.getElementById("t_y").innerHTML=this.target.y;
	document.getElementById("t_z").innerHTML=this.target.z;
	document.getElementById("distance").innerHTML=this.eye.distanceFromTarget;
	document.getElementById("rotZ").innerHTML=this.eye.rotZ;
	document.getElementById("rotH").innerHTML=this.eye.rotH;
	
};

var g_camera = new TargetCamera();
g_camera.up=[0,0,1];
function peg(value, lower, upper) {
  if (value < lower) {
    return lower;
  } else if (value > upper) {
    return upper;
  } else {
    return value;
  }
}

/**
 * Keyboard constants.
 */
var BACKSPACE = 8;
var TAB = 9;
var ENTER = 13;
var SHIFT = 16;
var CTRL = 17;
var ALT = 18;
var ESCAPE = 27;
var PAGEUP = 33;
var PAGEDOWN = 34;
var END = 35;
var HOME = 36;
var LEFT = 37;
var UP = 38;
var RIGHT = 39;
var DOWN = 40;
var DELETE = 46;
var SPACE = 32;

/**
 * Create some global key capturing. Keys that are pressed will be stored in
 * this global array.
 */
g_keyIsDown = [];

document.onkeydown = function(e) {
  var keycode;
  if (window.event) {
    keycode = window.event.keyCode;
  } else if (e) {
    keycode = e.which;
  }
  g_keyIsDown[keycode] = true;
  if (g_currentTool != null) {
    g_currentTool.handleKeyDown(keycode);
  }
};

document.onkeyup = function(e) {
  var keycode;
  if (window.event) {
    keycode = window.event.keyCode;
  } else if (e) {
    keycode = e.which;
  }
  g_keyIsDown[keycode] = false;
  if (g_currentTool != null) {
    g_currentTool.handleKeyUp(keycode);
  }
};

document.onmouseup = function(e) {
  if (g_currentTool != null) {
    g_currentTool.handleMouseUp(e);
  } else {
    cancelInsertDrag();
  }
};

// NOTE: mouseDown, mouseMove and mouseUp are mouse event handlers for events
// taking place inside the o3d area.  They typically pass the events down
// to the currently selected tool (e.g. Orbit, Move, etc).  Tool and item
// selection mouse events are registered seperately on their respective DOM
// elements.

// This function handles the mousedown events that happen inside the o3d
// area.  If a tool is currently selected (e.g. Orbit, Move, etc.) the event
// is forwarded over to it.  If the middle mouse button is pressed then we
// temporarily switch over to the orbit tool to emulate the SketchUp behavior.
function mouseDown(e) {
  // If the middle mouse button is used, then switch into the orbit tool,
  // Sketchup-style.
  // if (e.button == g_o3d.Event.BUTTON_MIDDLE) {
  //   g_lastTool = g_currentTool;
  //   g_lastSelectorLeft = $('toolselector').style.left;
  //   selectTool(null, TOOL_ORBIT);
  // }

  if (g_currentTool != null) {
    g_currentTool.handleMouseDown(e);
  }
}

// This function handles mouse move events inside the o3d area.  It simply
// forwards them down to the currently selected tool.
function mouseMove(e) {
  if (g_currentTool != null) {
    g_currentTool.handleMouseMove(e);
  }
}

// This function handles mouse up events that take place in the o3d area.
// If the middle mouse button is lifted then we switch out of the temporary
// orbit tool mode.
function mouseUp(e) {
  // If the middle mouse button was used, then switch out of the orbit tool
  // and reset to their last tool.
  // if (e.button == g_o3d.Event.BUTTON_MIDDLE) {
  //   $('toolselector').style.left = g_lastSelectorLeft;
  //   g_currentTool = g_lastTool
  // }
  if (g_currentTool != null) {
    g_currentTool.handleMouseUp(e);
  }
}

function scrollMe(e) {
  e = e ? e : window.event;
  var raw = e.detail ? e.detail : -e.wheelDelta;
  if (raw < 0) {
    g_camera.eye.distanceFromTarget *= 11 / 12;

  } else {
    g_camera.eye.distanceFromTarget *= (1 + 1 / 12);
  }
  g_camera.update();
}

function $(name) {
  return document.getElementById(name);
}


// An array of tool objects that will get populated when our base model loads.
var g_tools = [];
/*
function selectTool(e, opt_toolNumber) {
  var ICON_WIDTH = 32;
  var toolNumber = opt_toolNumber;

  if (toolNumber == undefined) {
    // Where you click determines your tool. But since our underlying toolbar
    // graphic isn't perfectly uniform, perform some acrobatics to get the best
    // toolNumber match.
    var pt = getRelativeCoordinates(e, $('toolpanel'));
    if (pt.x < 120) {
      toolNumber = Math.floor((pt.x - 8) / ICON_WIDTH)
    } else {
      toolNumber = Math.floor((pt.x - 26) / ICON_WIDTH)
    }
    toolNumber = peg(toolNumber, 0, 9);
  }

  // Now place the selector graphic over the tool we clicked.
  if (toolNumber < 3) {
    $('toolselector').style.left = toolNumber * ICON_WIDTH + 8;
  } else {
    $('toolselector').style.left = toolNumber * ICON_WIDTH + 26;
  }

  // Finally, activate the appropriate tool.
  // TODO: Replace this hacky zoom extents tool detection with
  // tools that have an onActivate callback.
  if (toolNumber == TOOL_ZOOM_EXTENTS) {
    // Reset our camera. (Zooming to extents would be better, obviously ;)
    g_camera.eye.distanceFromTarget = 900;
    g_camera.target = { x: -100, y: 0, z: 0 };
    g_camera.update();

    // Then reset to the orbit tool, after pausing for a bit so the user
    // sees the zoom extents button depress.
    setTimeout(function() { selectTool(null, TOOL_ORBIT)}, 200);
  } else {
    g_currentTool = g_tools[toolNumber];
  }

}
*/
function loadFile(context, path) {
  function callback(pack, start_move_tool_root, exception) {
    if (exception) {
      alert('Could not load: ' + path + '\n' + exception);
    } else {
      // Generate draw elements and setup material draw lists.
      o3djs.pack.preparePack(g_pack, g_viewInfo);

      // Manually connect all the materials' lightWorldPos params to the context
      var materials = g_pack.getObjectsByClassName('o3d.Material');
      for (var m = 0; m < materials.length; ++m) {
        var material = materials[m];
        var param = material.getParam('lightWorldPos');
        if (param) {
          param.bind(g_lightPosParam);
        }
      }

      /*
      o3djs.dump.dump('---dumping context---\n');
      o3djs.dump.dumpParamObject(context);

      o3djs.dump.dump('---dumping root---\n');
      o3djs.dump.dumpTransformTree(g_client.root);

      o3djs.dump.dump('---dumping render root---\n');
      o3djs.dump.dumpRenderNodeTree(g_client.renderGraphRoot);

      o3djs.dump.dump('---dump g_pack shapes---\n');
      var shapes = g_pack.getObjectsByClassName('o3d.Shape');
      for (var t = 0; t < shapes.length; t++) {
        o3djs.dump.dumpShape(shapes[t]);
      }

      o3djs.dump.dump('---dump g_pack materials---\n');
      var materials = g_pack.getObjectsByClassName('o3d.Material');
      for (var t = 0; t < materials.length; t++) {
        o3djs.dump.dump (
            '  ' + t + ' : ' + materials[t].className +
            ' : "' + materials[t].name + '"\n');
        o3djs.dump.dumpParams(materials[t], '    ');
      }

      o3djs.dump.dump('---dump g_pack textures---\n');
      var textures = g_pack.getObjectsByClassName('o3d.Texture');
      for (var t = 0; t < textures.length; t++) {
        o3djs.dump.dumpTexture(textures[t]);
      }

      o3djs.dump.dump('---dump g_pack effects---\n');
      var effects = g_pack.getObjectsByClassName('o3d.Effect');
      for (var t = 0; t < effects.length; t++) {
        o3djs.dump.dump ('  ' + t + ' : ' + effects[t].className +
                ' : "' + effects[t].name + '"\n');
        o3djs.dump.dumpParams(effects[t], '    ');
      }
    */
    }
    // if (start_move_tool_root != g_floorplanRoot) {
    //      selectTool(null, TOOL_MOVE);
    //      g_tools[TOOL_MOVE].initializeWithShape(start_move_tool_root);
    //    }
    g_camera.update();
  }

  g_pack = g_client.createPack();
  g_pack.name = 'load pack';

  new_object_root = null;
  if (g_floorplanRoot == null) {
    // Assign as the floorplan
    g_floorplanRoot = g_pack.createObject('o3d.Transform');
    g_floorplanRoot.name = 'floorplan';
    g_floorplanRoot.parent = g_client.root;

    g_placedModelsRoot = g_pack.createObject('o3d.Transform');
    g_placedModelsRoot.name = 'placedModels';
    g_placedModelsRoot.parent = g_floorplanRoot;

    // Put the object we're loading on the floorplan.
    new_object_root = g_floorplanRoot;

    // Create our set of tools that can be activated.
    // Note: Currently only the Delete, Move, Rotate, Orbit, Pan and Zoom
    // tools are implemented.  The last four icons in the toolbar are unused.
    // g_tools = [
    //   new DeleteTool(g_viewInfo.drawContext, g_placedModelsRoot),
    //   new MoveTool(g_viewInfo.drawContext, g_placedModelsRoot),
    //   new RotateTool(g_viewInfo.drawContext, g_placedModelsRoot),
    //   new OrbitTool(g_camera),
    //   new PanTool(g_camera),
    //   new ZoomTool(g_camera),
    //   null,
    //   null,
    //   null,
    //   null
    // ]

    // selectTool(null, TOOL_ORBIT);
  } else {
    // Create a new transform for the loaded file
    new_object_root = g_pack.createObject('o3d.Transform');
    new_object_root.name = 'loaded object';
    new_object_root.parent = g_placedModelsRoot;

  }

  if (path != null) {
    o3djs.scene.loadScene(g_client, g_pack, new_object_root, path, callback);
  }

  return new_object_root;
}

function setClientSize() {
  // Create a perspective projection matrix
  g_viewInfo.drawContext.projection = g_math.matrix4.perspective(
    3.14 * 45 / 180, g_client.width / g_client.height, 0.1, 5000);
}

function resize() {
  setClientSize();
}

function init() {
  o3djs.util.makeClients(initStep2);
}

function initStep2(clientElements) {
	
  g_o3dElement = clientElements[0];

  var path = window.location.href;
  var index = path.lastIndexOf('/');
  path = path.substring(0, index + 1) + g_buildingAsset;
  var url = document.getElementById('url').value = path;

  g_o3d = g_o3dElement.o3d;
  g_math = o3djs.math;
  g_client = g_o3dElement.client;

  g_mainPack = g_client.createPack();
  g_mainPack.name = 'simple viewer pack';

  // Create the render graph for a view.
  g_viewInfo = o3djs.rendergraph.createBasicView(
      g_mainPack,
      g_client.root,
      g_client.renderGraphRoot,
      [1, 1, 1, 1]);

  g_lastRot = g_math.identity(3);
  g_thisRot = g_math.identity(3);

  var root = g_client.root;

  var target = [0, 0, 0];
  var eye = [0, 0, 5];
  var up = [0, 1, 0];
  g_viewInfo.drawContext.view = g_math.matrix4.lookAt(eye, target, up);

  setClientSize();

  var paramObject = g_mainPack.createObject('ParamObject');
  // Set the light at the same position as the camera to create a headlight
  // that illuminates the object straight on.
  g_lightPosParam = paramObject.createParam('lightWorldPos', 'ParamFloat3');
  g_lightPosParam.value = eye;


  doload();


  // load sofa
   r = loadObject("cbassets/Troy_Sofa.o3dtgz");
	// r.rotateX(90*Math.PI/180);
	// r.rotateY(195*Math.PI/180);
	// r.scale([1/2,1/2,1/2]);
	r.translate([-20,300,0]);
	

	
  o3djs.event.addEventListener(g_o3dElement, 'mousedown', mouseDown);
  o3djs.event.addEventListener(g_o3dElement, 'mousemove', mouseMove);
  o3djs.event.addEventListener(g_o3dElement, 'mouseup', mouseUp);

  g_o3dElement.addEventListener('mouseover', dragOver, false);
  // for Firefox
 // g_o3dElement.addEventListener('DOMMouseScroll', scrollMe, false);
  // for Safari
  //g_o3dElement.onmousewheel = scrollMe;

 // document.getElementById('toolpanel').onmousedown = selectTool;

 /* // Create our catalog list from the global list of items (g_items).
  html = [];
  for (var i = 0; i < g_items.length; i++) {
    html.push('<div class="catalogItem" onmousedown="startInsertDrag(\'',
        g_items[i].url, '\')" style="background-position:-', (i * 62) ,
        'px 0px" title="', g_items[i].title, '"></div>');
  }
  $('itemlist').innerHTML = html.join('');
*/
  // Register a mouse-move event listener to the entire window so that we can
  // catch the click-and-drag events that originate from the list of items
  // and end up in the o3d element.
  document.addEventListener('mousemove', mouseMove, false);

	createPanels();
	createWelcome3();
		createPhotoWall();
 // init for cat animation

init_ani();
	g_currentTool = new WalkTool(g_camera);

}

function loadObject(fileName){

		  // Creates a transform to put our data on.
  var myDataRoot = g_pack.createObject('Transform');

  // Connects our root to the client root.
  myDataRoot.parent = g_client.root;
	var	pack = g_pack;
	var parent = myDataRoot;

  // Get our full path to the scene
  var scenePath = o3djs.util.getCurrentURI() + fileName;

  // Load the file given the full path, and call the callback function
  // when its done loading.
  g_loadInfo = o3djs.scene.loadScene(
      g_client, pack, parent, scenePath, callback,
      { opt_animSource: g_animTimeParam});

return myDataRoot;
  /**
   * Our callback is called once the scene has been loaded into memory
   * from the web or locally.
   * @param {!o3d.Pack} pack The pack that was passed in above.
   * @param {!o3d.Transform} parent The parent that was passed in above.
   * @param {*} exception null if loading succeeded.
   */
  function callback(pack, parent, exception) {

    g_loadInfo = null;
    if (exception) {
      setStatus('could **not** load ' + fileName + '. ' + exception);
      return;
    }
	

    // Get a CameraInfo (an object with a view and projection matrix)
    // using our javascript library function
    // var cameraInfo = o3djs.camera.getViewAndProjectionFromCameras(
    //       parent,
    //       g_client.width,
    //       g_client.height);

    // Copy the view and projection to the draw context.
    // g_viewInfo.drawContext.view = cameraInfo.view;
    //    g_viewInfo.drawContext.projection = cameraInfo.projection;

    // Generate draw elements and setup material draw lists.
    o3djs.pack.preparePack(pack, g_viewInfo);

    var materials = pack.getObjectsByClassName('o3d.Material');
      for (var m = 0; m < materials.length; ++m) {
        var material = materials[m];
        var param = material.getParam('lightWorldPos');
        if (param) {
          param.bind(g_lightPosParam);
        }
      }

    // Reset the clock.
    g_aniClock = 0;

    setStatus('');

    g_finished = true;  // for selenium testing.

  }


}
// var g_hudQuad;
// var g_paint;
var g_notiQuad;
var g_notiPaint;
var g_frdQuad;
var g_frdPaint;
var g_Quad3;

// create welcome text
function createWelcome3(){
	
	// Make a canvas for text.
	  var canvasLib = o3djs.canvas.create(g_mainPack,
	                                      g_hudRoot,
	                                      g_hudViewInfo);
	
	  g_hudQuad = canvasLib.createXYQuad(220, 25, -1, 512, 512, true);
        g_paint = g_mainPack.createObject('CanvasPaint');
	
	 // g_paint.setOutline(3, [1, 1, 1, 1]);
	  g_paint.textAlign = g_o3d.CanvasPaint.LEFT;
	  g_paint.textSize = 16;
	  g_paint.textTypeface = 'Arial';
	  g_paint.color = [1, 1, 1, 1];
	
	g_notiQuad =  canvasLib.createXYQuad(650, 120, -1, 512, 512, true);
    g_notiPaint = g_mainPack.createObject('CanvasPaint');
	g_notiPaint.textAlign = g_o3d.CanvasPaint.LEFT;
	  g_notiPaint.textSize = 12;
	  g_notiPaint.textTypeface = 'Arial';
	  g_notiPaint.color = [9, 200, 1, 1];
	
		g_frdQuad =  canvasLib.createXYQuad(640, 255, -1, 512, 512, true);
    g_frdPaint = g_mainPack.createObject('CanvasPaint');
	g_frdPaint.textAlign = g_o3d.CanvasPaint.LEFT;
	  g_frdPaint.textSize = 12;
	  g_frdPaint.textTypeface = 'Arial';
	  g_frdPaint.color = [9, 200, 1, 1];
	
		g_Quad3 =  canvasLib.createXYQuad(640, 395, -1, 512, 512, true);
		
	// alert("createWelcome3");
	  setHudText('Jackie, Welcome back to home.');

     setNotiText("1 messges");
setFrdText("2 frends updated");
setText3("3 events");
}
function setText3(text) {
  // if (g_showError) {
  //    return;
  //  }
  var canvas = g_Quad3.canvas;
    canvas.clear([0, 0, 0, 0]);
    canvas.saveMatrix();
    var lines = text.split('\n');
    for (var ll = 0; ll < lines.length; ++ll) {
      var tabs = lines[ll].split('\t');
      for (var tt = 0; tt < tabs.length; ++tt) {
        canvas.drawText(tabs[tt], 10 + tt * 120, 30 + 20 * ll, g_notiPaint);
      }
    }
    canvas.restoreMatrix();
  
    g_Quad3.updateTexture();
}
function setFrdText(text) {
  // if (g_showError) {
  //    return;
  //  }
  var canvas = g_frdQuad.canvas;
    canvas.clear([0, 0, 0, 0]);
    canvas.saveMatrix();
    var lines = text.split('\n');
    for (var ll = 0; ll < lines.length; ++ll) {
      var tabs = lines[ll].split('\t');
      for (var tt = 0; tt < tabs.length; ++tt) {
        canvas.drawText(tabs[tt], 10 + tt * 120, 30 + 20 * ll, g_frdPaint);
      }
    }
    canvas.restoreMatrix();
  
    g_frdQuad.updateTexture();
}
function setNotiText(text) {
  // if (g_showError) {
  //    return;
  //  }
  var canvas = g_notiQuad.canvas;
    canvas.clear([0, 0, 0, 0]);
    canvas.saveMatrix();
    var lines = text.split('\n');
    for (var ll = 0; ll < lines.length; ++ll) {
      var tabs = lines[ll].split('\t');
      for (var tt = 0; tt < tabs.length; ++tt) {
        canvas.drawText(tabs[tt], 10 + tt * 120, 30 + 20 * ll, g_notiPaint);
      }
    }
    canvas.restoreMatrix();
  
    g_notiQuad.updateTexture();
}
/**
 * Sets the text on the hud.
 * @param {string} text The text to display.
 */
function setHudText(text) {
  // if (g_showError) {
  //    return;
  //  }
  var canvas = g_hudQuad.canvas;
    canvas.clear([0, 0, 0, 0]);
    canvas.saveMatrix();
    var lines = text.split('\n');
    for (var ll = 0; ll < lines.length; ++ll) {
      var tabs = lines[ll].split('\t');
      for (var tt = 0; tt < tabs.length; ++tt) {
        canvas.drawText(tabs[tt], 10 + tt * 120, 30 + 20 * ll, g_paint);
      }
    }
    canvas.restoreMatrix();
  
    g_hudQuad.updateTexture();
}



var g_textureUrls = [
  'assets/purple-flower.png',   // 0
  'assets/orange-flower.png',   // 1
  'assets/egg.png',             // 2
  'assets/gaugeback.png',       // 3
  'assets/gauge.png',           // 4
  'assets/iconback.png',        // 5
  'assets/radar.png',           // 6
  'assets/one-pixel-white.tga'  // 7
];
var g_materialUrls = [
  'shaders/texture-colormult.shader',    // 0
  'shaders/phong-with-colormult.shader'  // 1
];
var g_materials = [];
var g_textures = [];
var g_radar;
var g_radarNeedle;
var g_gaugeBack;
var g_gauges = [];
var g_gaugeFrames = [];
var g_iconBacks = [];
var g_icons = [];
var g_selectedIndex = 0;
var g_randSeed = 0;
	
function createPanels(){
	// alert("createWecome21");	
   // Create 2 root transforms, one for the 3d parts, one for the 2d parts.
  // This is not strictly neccassary but it is helpful for organization.
    g_3dRoot = g_pack.createObject('Transform');

	g_hudRoot = g_pack.createObject('Transform');

  // g_viewInfo = o3djs.rendergraph.createBasicView(
  //      g_pack,
  //      g_3dRoot,
  //      g_client.renderGraphRoot);

// alert("10");  here start render UI
  // Create a second view for the hud. There are other ways to do this but
  // this is the easiest.
  g_hudViewInfo = o3djs.rendergraph.createBasicView(
        g_pack,
        g_hudRoot,
        g_client.renderGraphRoot);
// alert("11");
  // Make sure the hud gets drawn after the 3d stuff
  g_hudViewInfo.root.priority = g_viewInfo.root.priority + 1;

  // Turn off clearing the color for the hud since that would erase the 3d
  // parts but leave clearing the depth and stencil so the HUD is unaffected
  // by anything done by the 3d parts.
  g_hudViewInfo.clearBuffer.clearColorFlag = false;

  // Set culling to none so we can flip images using rotation or negative scale.
  g_hudViewInfo.zOrderedState.getStateParam('CullMode').value =
      g_o3d.State.CULL_NONE;
  g_hudViewInfo.zOrderedState.getStateParam('ZWriteEnable').value = false;

  // Create an orthographic matrix for 2d stuff in the HUD.
  // We assume the area is 800 pixels by 600 pixels and therefore we can
  // position things using a 0-799, 0-599 coordinate system. If we change the
  // size of the client area everything will get scaled to fix but we don't
  // have to change any of our code. See 2d.html
  g_hudViewInfo.drawContext.projection = g_math.matrix4.orthographic(
      0 + 0.5,
      800 + 0.5,
      600 + 0.5,
      0 + 0.5,
      0.001,
      1000);

  g_hudViewInfo.drawContext.view = g_math.matrix4.lookAt(
      [0, 0, 1],   // eye
      [0, 0, 0],   // target
      [0, 1, 0]);  // up

  g_viewInfo.drawContext.projection = g_math.matrix4.perspective(
      g_math.degToRad(30), // 30 degree fov.
      g_client.width / g_client.height,
      0.1,                // Near plane.
      5000);              // Far plane.


 for (var ii = 0; ii < g_materialUrls.length; ++ii) {

    var material = o3djs.material.createMaterialFromFile(
        g_pack,
        g_materialUrls[ii],
        g_viewInfo.performanceDrawList);

    // Set the default params. We'll override these with params on transforms.
    material.getParam('colorMult').value = [1, 1, 1, 1];

    g_materials[ii] = material;
  }

  // Set the materials' drawLists
  g_materials[0].drawList = g_hudViewInfo.zOrderedDrawList;
  g_materials[1].drawList = g_viewInfo.performanceDrawList;

  g_materials[1].getParam('lightWorldPos').value = [500, 1000, 0];
  g_materials[1].getParam('lightIntensity').value = [1, 1, 1, 1];
  g_materials[1].getParam('ambientIntensity').value = [0.1, 0.1, 0.1, 1];
  g_materials[1].getParam('ambient').value = [1, 1, 1, 1];
  g_materials[1].getParam('diffuse').value = [1, 1, 1, 1];
  g_materials[1].getParam('specular').value = [0.5, 0.5, 0.5, 1];
  g_materials[1].getParam('shininess').value = 20;

  // Create a 2d plane for images. createPlane makes an XZ plane by default
  // so we pass in matrix to rotate it to an XY plane. We could do
  // all our manipluations in XZ but most people seem to like XY for 2D.
  g_planeShape = o3djs.primitives.createPlane(
      g_pack,
      g_materials[0],
      1,
      1,
      1,
      1,
      [[1, 0, 0, 0],
       [0, 0, 1, 0],
       [0,-1, 0, 0],
       [0, 0, 0, 1]]);

  // Create a ground plane
  g_groundShape = o3djs.primitives.createPlane(
      g_pack,
      g_materials[1],
      30,
      30,
      10,
      10);

  // Create a cube with its origin at the bottom center.
  g_cubeShape = o3djs.primitives.createCube(
      g_pack,
      g_materials[1],
      1,
      [[0.9, 0, 0, 0],
       [0, 1, 0, 0],
       [0, 0, 0.9, 0],
       [0, 0.5, 0, 1]]);

  // Load all the textures.
  var loader = o3djs.loader.createLoader(initStep3);
  for (var ii = 0; ii < g_textureUrls.length; ++ii) {
    loadTexture(loader, g_textureUrls[ii], ii);
  }
  loader.finish();
// alert("createWelcome2");
}
/**
 * Loads a texture and saves it in the g_textures array.
 * @param {Object} loader The loader to load with.
 * @param {stinrg} url of texture to load
 * @param {number} index Index to put texture in g_textures
 */
function loadTexture(loader, url, index) {
  loader.loadTexture(g_pack, url, function(texture, exception) {
    if (exception) {
      alert(exception);
    } else {
      g_textures[index] = texture;
    }
  });
}
var g_photoTexture = [];
var g_photoTextureUrls = [
"1.jpg",
"http://www.google.com.sg/images/logos/ps_logo2.png",
"1.jpg",
"http://www.google.com.sg/images/logos/ps_logo2.png",
"1.jpg",
"http://www.google.com.sg/images/logos/ps_logo2.png",
"1.jpg",
"http://www.google.com.sg/images/logos/ps_logo2.png"
];
function loadTexture2(loader, url, index) {
  loader.loadTexture(g_pack, url, function(texture, exception) {
     if (exception) {
      alert(exception);
    } else {

      g_photoTexture[index] = texture;
    }
  });

}

/**
 * Now that the textures are loaded continue.
 */
function initStep3() {
	// alert("init3");
  // Setup the hud images.
  // g_radar = new Image(g_textures[6], true);
  // g_radar.transform.translate(3, 1, -2);
  // 
  // g_radarNeedle = new Image(g_textures[7], false);
  // g_radarNeedle.scaleTransform.translate(0, 0.5, 0);

  g_gaugeBack = new Image(g_textures[3], true);
  g_gaugeBack.transform.translate(201, 17, -2);
	// alert("init31");
  for (var ii = 0; ii < 3; ++ii) {
/*		// alert("init310"+g_gaugeFrames);
    g_gaugeFrames[ii] = new Image(g_textures[4], true);
	// alert("init310"+g_gaugeFrames[ii]);
    g_gaugeFrames[ii].transform.translate(220, 39 + ii * 21, -2);
		// alert("init311");
    g_gauges[ii] = new Image(g_textures[7], true);
    g_gauges[ii].setColor((ii == 0) ? 1 : 0,
                          (ii == 1) ? 1 : 0,
                          (ii == 2) ? 1 : 0,
                          1);
		// alert("init312");*/
    g_iconBacks[ii] = new Image(g_textures[5], true);
    g_iconBacks[ii].transform.translate(634, 17 + ii * 140 +10, -2);

	// draw icon
    // Make the icons' origin their center so we can easily rotate/scale them.
    g_icons[ii] = new Image(g_textures[ii], false);
  }
	// alert("init315");
  resetIcons();

  // // make the ground plane.
  // var transform = g_pack.createObject('Transform');
  // transform.addShape(g_groundShape);
  // transform.parent = g_3dRoot;
  // transform.createParam('colorMult', 'ParamFloat4').value =
  //     [166 / 255, 124 / 255, 82 / 255, 1];
  // 
  // // Make a random city with 25 blocks.
  // for (var bz = -2; bz <= 2; ++bz) {
  //   for (var bx = -2; bx <= 2; ++bx) {
  //     for (var xx = 0; xx < 4; ++xx) {
  //       createBuilding(bx * 5 + 1 + xx - 1.5, bz * 5 + 1 - 1.5);
  //       createBuilding(bx * 5 + 1 + xx - 1.5, bz * 5 + 4 - 1.5);
  //     }
  //     for (var zz = 1; zz < 3; ++zz) {
  //       createBuilding(bx * 5 + 1 - 1.5, bz * 5 + 1 + zz - 1.5);
  //       createBuilding(bx * 5 + 4 - 1.5, bz * 5 + 1 + zz - 1.5);
  //     }
  //   }
  // }

  // Setup an onrender callback for animation.
   g_client.setRenderCallback(onrender);

  g_finished = true;  // for selenium testing.
// alert("init3000");
}

// /**
//  * Creates a building.
//  * @param {number} x X coordinate to create building at
//  * @param {number} z Y coordinate to create building at
//  */
// function createBuilding(x, z) {
//   var transform = g_pack.createObject('Transform');
//   transform.addShape(g_cubeShape);
//   transform.parent = g_3dRoot;
//   transform.translate(x, 0, z);
//   transform.scale(1, g_math.pseudoRandom() * 3 + 1, 1);
//   transform.createParam('colorMult', 'ParamFloat4').value = [
//     g_math.pseudoRandom() * 0.6 + 0.4,
//     g_math.pseudoRandom() * 0.6 + 0.4,
//     g_math.pseudoRandom() * 0.6 + 0.4,
//     1];
// }

/**
 * Resets the orientation of the icons.
 */
function resetIcons() {
  for (var ii = 0; ii < g_icons.length; ++ii) {
    g_icons[ii].transform.identity();
    g_icons[ii].transform.translate(634 + 6 + 64, 17 + ii * 140 + 5 + 64, -1);
    g_icons[ii].transform.scale(0.8, 0.8, 0);
  }
}

var render_count = 0;
/**
 * Called every frame.
 * @param {!o3d.RenderEvent} renderEvent Rendering Information.
 */
function onrender(renderEvent) {
	render_count ++;
	if (render_count > 1){
		render_count = 0;
	}else
		return;
	
  var elapsedTime = renderEvent.elapsedTime;
  g_clock += elapsedTime * g_timeMult;
  g_selectedIndex = Math.floor(g_clock / 3) % 3;

/** for animation **/
    onrender_ani(renderEvent);
/********************/



  // Fly the camera around the city.
  // var eye = [
  //     Math.sin(g_clock * g_cameraSpeed) * g_cameraRadius,
  //     10,
  //     Math.cos(g_clock * g_cameraSpeed) * g_cameraRadius];
  // 
  // g_viewInfo.drawContext.view = g_math.matrix4.lookAt(
  //     eye,
  //     [0, 0, 0],  // target
  //     [0, 1, 0]); // up
    var icon = g_icons[g_selectedIndex];
    icon.transform.identity();
    icon.transform.translate(
        634 + 6 + 64, 17 + g_selectedIndex * 140 + 5 + 64, -1);
	icon.transform.rotateZ(g_clock * -1);
      var scale = Math.sin(g_clock * 15) * 0.1 + 0.7;
      icon.transform.scale(scale, scale, 1);

  // for (var i = 0; i < g_icons.length; i++) {
  //     var icon = g_icons[i];
  //     icon.transform.identity();
  //     icon.transform.translate(
  //         634 + 6 + 64, 17 + i * 140 + 5 + 64, -1);
  //     if (i == g_selectedIndex) {
  //       icon.transform.rotateZ(g_clock * -1);
  //       var scale = Math.sin(g_clock * 15) * 0.1 + 0.7;
  //       icon.transform.scale(scale, scale, 1);
  //     } else {
  //       icon.transform.scale(0.8, 0.8, 0);
  //     }
  //   }

// document.getElementById("clock").innerHTML="<br>clock:"+g_clock+"<br>elapsedTime:"+elapsedTime+"<br>g_selectedIndex:"+g_selectedIndex;

  // // Adjust the gauges
  // for (var ii = 0; ii < 3; ++ii) {
  //   var gauge = g_gauges[ii];
  //   gauge.transform.identity();
  //   gauge.transform.translate(220 + 1, 39 + ii * 21 + 1, -1);
  //   switch (ii) {
  //     case 0:
  //       gauge.transform.scale((Math.sin(g_clock) * 0.5 + 0.5) * g_gaugeWidth,
  //                             g_gaugeHeight,
  //                             1);
  //     break;
  //     case 1:
  //       gauge.transform.scale((Math.cos(g_clock) * 0.5 + 0.5) * g_gaugeWidth,
  //                             g_gaugeHeight,
  //                             1);
  //     break;
  //     case 2:
  //       gauge.transform.scale(
  //           (Math.cos(g_clock * 3.2) * 0.2 + 0.6) * g_gaugeWidth,
  //           g_gaugeHeight,
  //           1);
  //     break;
  //   }
  // }

/*
  // Rotate the radar
  g_radarNeedle.transform.identity();
  g_radarNeedle.transform.translate(93, 89, 0);
  g_radarNeedle.transform.rotateZ(g_clock * 3);
  g_radarNeedle.transform.scale(1, 80, 1);
	*/
 // alert("onredner2");
}

/**
 * Creates an Image object which is a transform and a child scaleTransform
 * scaled to match the texture
 *
 * @constructor
 * @param {!o3d.Texture} texture The texture
 * @param {boolean} opt_topLeft If true the origin of the image will be its
 *    topleft corner, the default is the center of the image.
 */
function Image(texture, opt_topLeft) {
// alert("create images0");
  // create a transform for positioning
  this.transform = g_pack.createObject('Transform');
  this.transform.parent = g_hudRoot;

  // create a transform for scaling to the size of the image just so
  // we don't have to manage that manually in the transform above.
  this.scaleTransform = g_pack.createObject('Transform');
  this.scaleTransform.parent = this.transform;

  // setup the sampler for the texture
  this.sampler = g_pack.createObject('Sampler');
  this.sampler.addressModeU = g_o3d.Sampler.CLAMP;
  this.sampler.addressModeV = g_o3d.Sampler.CLAMP;
  this.paramSampler = this.scaleTransform.createParam('texSampler0',
                                                      'ParamSampler');
  this.paramSampler.value = this.sampler;

  // Setup our UV offsets and color multiplier
  this.paramColorMult = this.scaleTransform.createParam('colorMult',
                                                        'ParamFloat4');

  this.setColor(1, 1, 1, 1);

  this.sampler.texture = texture;
  this.scaleTransform.addShape(g_planeShape);
  if (opt_topLeft) {
    this.scaleTransform.translate(texture.width / 2, texture.height / 2, 0);
  }
  this.scaleTransform.scale(texture.width, -texture.height, 1);
// alert("create imagesz");
}

/**
 * Sets the color multiplier for the image.
 * @param {number} r Red component.
 * @param {number} g Green component.
 * @param {number} b Blue component.
 * @param {number} a Alpha component.
 */
Image.prototype.setColor = function(r, g, b, a) {
  this.paramColorMult.set(r, g, b, a);
};


// create welcome text
function createWelcome(){

	  // Create an instance of the canvas utilities library.
  var canvasLib = o3djs.canvas.create(g_pack, g_client.root, g_viewInfo);

  // Create a canvas surface to draw on.
  var canvasQuad = canvasLib.createXYQuad(0, 0, 0, 100, 100, false);

  canvasQuad.canvas.clear([1, 1, 1, 1]);
  canvasQuad.updateTexture();

	var textPaint = g_pack.createObject('CanvasPaint');
	textPaint.color = [0, 0, 0, 1];
  	textPaint.textSize = 24;
	var drawTextBox = false;
	var verticalPosition = 10;
  	var horizontalPosition = 50;
	textPaint.textTypeface = "Arial";
  	var lineDimensions = textPaint.measureText("Arial");

	verticalPosition += lineDimensions[3] - lineDimensions[1] + 20;

	canvasQuad.canvas.drawText("Arial",
                               horizontalPosition,
                               verticalPosition,
                               textPaint);
 canvasQuad.updateTexture();
g_finished = true;

alert("welcome");
}

/******** photo wall ********/
function createPhotoWall(){

	  var redMaterial = o3djs.material.createBasicMaterial(
    g_pack,
    g_viewInfo,
    [0.2, 1, 0.2, 1]);  // green

		var loader = o3djs.loader.createLoader(callback1);   
    	// loadTexture2(loader, "assets/purple-flower.png");  
		for (i = 0; i< g_photoTextureUrls.length;i++){
		loadTexture2(loader, g_photoTextureUrls[i], i);
	}
		loader.finish();

		  // // var param = o3djs.material.createAndBindStandardParams(g_pack);
		  //   		// param.lightWorldPos.value = [30, 60, 40];
		  //   		//   		param.lightColor.value = [1, 1, 1, 1];
		  // 			 var param = material.getParam('lightWorldPos');
		  //       if (param) {
		  //         param.bind(g_lightPosParam);
		  //       }   else{
		  // 				param = o3djs.material.createStandardParams(g_pack);
		  // 				param = material.getParam('lightWorldPos');
		  // 					alert(param);
		  // 				param.bind(g_lightPosParam);
		  // 			}
	 function callback1(){
			  for (i = 0; i < 3; i++){
					for (j = 0; j < 5; j++){
			var material11 = o3djs.material.createMaterialFromFile(g_pack, 'shaders/texture-only.shader', g_viewInfo.performanceDrawList);

	// var material11 = o3djs.material.createConstantMaterial(g_pack, g_viewInfo, [1,1,1,1],  false);
				 var pillarPlane = o3djs.primitives.createPlane(g_pack, material11, 15, 10, 1, 1
		//,
	  	// g_math.mulMatrixMatrix4(g_math.mulMatrixMatrix4(
	  	// 		g_math.matrix4.rotationX(g_math.degToRad(10)),
	  	// 	    g_math.matrix4.rotationZ(g_math.degToRad(10))
	  	// 	  ),
	  	// 	g_math.matrix4.rotationY(g_math.degToRad(0))
	// )
	  );
				
				
						t = g_photoTexture[i*3+j];
						if (t!=null){
							// prepare texture
							   var sampler = material11.getParam('texSampler0').value;
	  	         			  sampler.texture = t ;
				  	           sampler.addressModeU = g_o3d.Sampler.CLAMP;
				  	           sampler.addressModeV = g_o3d.Sampler.CLAMP;
				
							// prepare transform
				  				var topTransform = g_pack.createObject('Transform');
					  	      topTransform.parent = g_client.root;
				
					  	      topTransform.translate(-60-20*j+3*g_math.pseudoRandom(), 180, 60-i*15+3*g_math.pseudoRandom());
							// topTransform.scale([20,20,20]);
								 topTransform.rotateY(g_math.degToRad(150+60*g_math.pseudoRandom() ));
								
								// add shape
	  	    				  topTransform.addShape(pillarPlane);
	
	  // Create a cylinder.
  var cylinderShape = o3djs.primitives.createCylinder(
      g_pack, redMaterial, 0.5, 5, 20, 1,
      g_math.matrix4.translation([-5, 0, -4]));
		topTransform.addShape(cylinderShape);			 		 
						}
					}
				}

	 // g_globalParams = o3djs.material.createAndBindStandardParams(g_pack);
	 //   g_globalParams.lightWorldPos.value = [30, 60, 40];
	 //   g_globalParams.lightColor.value = [1, 1, 1, 1];
		// var materials = g_pack.getObjectsByClassName('o3d.Material');
				// 			      for (var m = 0; m < materials.length; ++m) {
				// 			        var material1 = materials[m];
				// 			        var param = material1.getParam('lightWorldPos');
				// 			        if (param) {
				// 			          param.bind(g_lightPosParam);
				// 			        }
				// 			      }
	
	  	    
		
	
				// var materials = g_pack.getObjectsByClassName('o3d.Material');
				// 			      for (var m = 0; m < materials.length; ++m) {
				// 			        var material1 = materials[m];
				// 			        var param = material1.getParam('lightWorldPos');
				// 			        if (param) {
				// 			          param.bind(g_lightPosParam);
				// 			        }
				// 			      }
	// alert("fa");
	
	}
	


}




/****************************/

function dragOver(e) {
  if (g_urlToInsert != null) {
    doload(g_urlToInsert);
  }
  g_urlToInsert = null;
}

function doload(opt_url) {
  var url;
  if (opt_url != null) {
    url = opt_url
  } else if ($('url')) {
    url = $('url').value;
  }

  g_root = loadFile(g_viewInfo.drawContext, url);
}

/*function startInsertDrag(url) {
  // If no absolute web path was passed, assume it's a local file
  // coming from the assets directory.
  if (url.indexOf('http') != 0) {
    var path = window.location.href;
    var index = path.lastIndexOf('/');
    g_urlToInsert = path.substring(0, index + 1) + g_assetPath + url;
  } else {
    g_urlToInsert = url;
  }
}*/

function cancelInsertDrag() {
  g_urlToInsert = null;
}

function WalkTool(camera) {
  this.camera = camera;
  this.dragging = false;
  this.lastOffset = null;
}

WalkTool.prototype.handleMouseDown = function(e) {
  var offset = { x: e.x, y: e.y };
  this.lastOffset = offset;
  this.dragging = true;
};

WalkTool.prototype.handleMouseMove = function(e) {

  if (this.dragging && e.x !== undefined) {
    var offset = { x: e.x, y: e.y };

    dY = (offset.y - this.lastOffset.y);
    dX = -(offset.x - this.lastOffset.x);
    this.lastOffset = offset;

    // this.camera.target.x -= (dY * Math.cos(this.camera.eye.rotZ) +
    //          dX * Math.sin(this.camera.eye.rotZ)) /
    //          (700 / this.camera.eye.distanceFromTarget);
    //    this.camera.target.y += (-dY * Math.sin(this.camera.eye.rotZ) +
    //        dX * Math.cos(this.camera.eye.rotZ)) /
    //        (700 / this.camera.eye.distanceFromTarget);

		// this.camera.target.y -= dX/2;
		
		if (dX != 0){ // look around
			// use eye as origin for x,y of target 
			 nx = this.camera.target.x -  this.camera.eye.x; 
			 ny = this.camera.target.y -  this.camera.eye.y; 
			// nl = Math.sqrt(Math.pow(nx,2)+Math.pow(ny,2)); 
			// 		
			// a = Math.atan(ny/nx)*180/Math.PI;
			// a -= 10; // rotate by 5 degree
			// 		
			// // calculate new coordinator
			// nx2 = nl*Math.sin(a*Math.PI/180);
			// ny2 = nl*Math.cos(a*Math.PI/180);
			// 		
			// // move back to origin
			// this.camera.target.x += nx2;
			// this.camera.target.y += ny2;
			a = dX/5*Math.PI/180;
			
		   this.camera.target.x = nx*Math.cos(a)-ny*Math.sin(a)+this.camera.eye.x;
           this.camera.target.y = nx*Math.sin(a)+ny*Math.cos(a)+this.camera.eye.y;
	 	document.getElementById("debug").innerHTML="<br>a="+a+"<br>nx="+nx+"<br>ny="+ny+"<br>target.x ="+this.camera.target.x+"<br>target.y="+this.camera.target.y;

		  
		   // document.getElementById("debug").innerHTML="nl="+nl+"<br>a="+a+"<br>nx="+nx+"<br>ny="+ny+"<br>nx2="+nx2+"<br>ny2="+ny2+"<br>target.x="+this.camera.target.x +"<br>target.y="+this.camera.target.y+"<br>eye.x="+this.camera.eye.x +"<br>eye.y="+this.camera.eye.y;
		}
  	
		if (dY != 0){ // move forward or back
			 step = dY/2;
			 // distance from eye to target
		     var distance = Math.sqrt((this.camera.eye.x - this.camera.target.x)*(this.camera.eye.x - this.camera.target.x) +
				(this.camera.eye.y - this.camera.target.y)*(this.camera.eye.y - this.camera.target.y) + 
				(this.camera.eye.z - this.camera.target.z)*(this.camera.eye.x - this.camera.target.z)); 
			// ratio 
			delta_x = (this.camera.eye.x - this.camera.target.x)/distance;
			delta_y = (this.camera.eye.y - this.camera.target.y)/distance;
			delta_z = (this.camera.eye.z - this.camera.target.z)/distance;
			nx = this.camera.eye.x + delta_x*step;
			if (nx <150 && nx >-300){
				this.camera.eye.x = nx;
				this.camera.target.x += delta_x*step;
			}
			ny = this.camera.eye.y + delta_y*step;
			if (ny >-600 && ny < 430){
				this.camera.eye.y =ny;
				this.camera.target.y += delta_y*step;
			}
			// do not change z
			// this.camera.eye.z += delta_z*step;
			// 		this.camera.target.z += delta_z*step;
		}
		// 
   	  // this.camera.eye.rotZ -= dX / 300;
      // this.camera.eye.rotH -= dY / 300;
      //      this.camera.eye.rotH = peg(this.camera.eye.rotH, 0.1, Math.PI - 0.1);
      // document.getElementById('output').innerHTML = this.camera.eye.rotH;
    this.camera.update();
  }
};

WalkTool.prototype.handleMouseUp = function(e) {
  this.dragging = false;
};

WalkTool.prototype.handleKeyDown = function(e) {
  return false;
};

WalkTool.prototype.handleKeyUp = function(e) {
  return false;
};