import React from 'react';
import ReactDOM from 'react-dom';
import Draggable from 'react-draggable';
import * as d3 from "d3";
import $ from "jquery";
import './index.css';

var extId = window.location.hash.substr(1);
var hosted = false;
var idToType = {};
var usercode = {};

var lightBeingConnected = null;

/* ================================= MAIN APP COMPONENT ================================= */
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      history: [{
        lights: [new RGBLight(0, '#ee00aa')],
        connections: [],
        scenes: [],
      }],
      stepNumber: 0,
      drawingAWire: false,
      mouseX: 0,
      mouseY: 0,
    }
  }

  /* ============== event handling dom events ============== */
  componentDidMount() {
    document.getElementById("container").addEventListener('mousemove', this.handleMouseMove.bind(this));
  }
  componentWillUnmount() {
    document.getElementById("container").removeEventListener('mousemove', this.handleMouseMove.bind(this));
  }
  handleMouseMove(e) {
    var rect = e.target.getBoundingClientRect();
    var x = e.clientX - rect.left; //e.pageX
    var y = e.clientY - rect.top;
    //this.setState({...this.state, mouseX: x, mouseY: y});
  }
  onStart(e, ui, app) {
    const index = parseInt(e.target.id.split(':')[1]);
    const light = app.getCurrentStateFromHistory().lights[index];
    light.setPrevXPos(ui.x);
    light.setPrevYPos(ui.y);
  }
  onStop(e, ui, app) {
    const index = parseInt(e.target.id.split(':')[1]);
    const light = app.getCurrentStateFromHistory().lights[index];
    light.setXPos(ui.x);
    light.setYPos(ui.y);
  }

  /* =================== helper functions =================== */
  getHistory() {
    return this.state.history.slice(0, this.state.stepNumber + 1);
  }
  getCurrentStateFromHistory() {
    const history = this.getHistory();
    return history[history.length - 1];
  }
  getStateFromHistory(i) {
    const history = this.getHistory();
    return history[i];    
  }

  /* ======== functions for dynamic element creation ======== */
  createLightElements = () => {
    const current = this.getCurrentStateFromHistory();
    const lights = current.lights.slice();  
    let lightElements = [];
    for (let i = 0; i < lights.length; i++) {
      let color = lights[i].getColor();
      lightElements.push(<Light key={i} index={i} self={this} color={color} dragHandlers={{onStart: (e, ui) => {this.onStart(e, ui, this)}, onStop: (e, ui) => {this.onStop(e, ui, this)}}} />);
    }  
    return lightElements;
  }
  createWireElements = () => {
    const current = this.getCurrentStateFromHistory();
    const connections = current.connections.slice();  
    let wireElements = [];
    for (let i = 0; i < connections.length; i++) {
        const firstlight = connections[i].getFirstNode();
        const secondlight = connections[i].getSecondNode();
        const firstlightelement = document.getElementById("lightnodesvgright:"+i);
        const secondlightelement = document.getElementById("lightnodesvgleft:"+i);
        //console.log(firstlightelement.getBoundingClientRect());
        wireElements.push(<Wire key={i} index={i} firstnode={firstlight} secondnode={secondlight} mousex={this.state.mouseX} mousey={this.state.mouseY} transformX={0} transformY={50} firstnodeX={firstlightelement.x} firstnodeY={firstlightelement.y}  secondnodeX={secondlightelement.x} secondnodeY={secondlightelement.y}/>);
      }  
    return wireElements;    
  }
  createSavedSceneElements = () => {
    const current = this.getCurrentStateFromHistory();
    const scenes = current.scenes.slice();  
    let sceneElements = [];
    for (let i = 0; i < scenes.length; i++) {
      sceneElements.push(<SceneButton key={i} name={scenes[i].getName()}/>);
    }  
    return sceneElements;  
  }

  /* ==================== button callbacks =================== */
  addLightButtonClicked() {
    const history = this.getHistory();
    const current = this.getCurrentStateFromHistory();
    const lights = current.lights.slice();    

    lights.push(new RGBLight(lights.length, '#'+Math.floor(Math.random()*16777215).toString(16)));
    this.setState({
      ...this.state, 
      history: history.concat([{
        ...current, // keeps everything the same and only updates lights
        lights: lights,
      }]),
      stepNumber: history.length,   
    });
  }
  saveSceneButtonClicked() {
    const history     = this.getHistory();
    const current     = this.getCurrentStateFromHistory();   
    const scenes      = current.scenes.slice();
    const lights      = current.lights.slice();    
    const connections = current.connections.slice();    
    const newscene = new Scene("bloop", lights);
    scenes.push(newscene);
    this.setState({
      ...this.state, 
      history: history.concat([{
        ...current,
        scenes: scenes,
      }]),
      stepNumber: history.length,
    });    
  }

  /* ======================== render ======================== */
  render() {
    //const dragHandlers = {onStart: (e, ui) => {this.onStart(e, ui, this)}, onStop: (e, ui) => {this.onStop(e, ui, this)}};
    return (
      <div>
      <h1>Lighting App</h1>
      <button onClick={() => this.addLightButtonClicked()}>add light</button><br></br>
      <div id="container">
          <div className="workspace">
              {this.createLightElements()}
              {this.createWireElements()}
          </div>

        <div className="scene-creator">
              Scenes & patterns builder
              <hr />
              Scenes<br />
              <button onClick={() => this.saveSceneButtonClicked()}>save scene</button>
              {this.createSavedSceneElements()}
              <hr />
              Build patterns<br />
            </div>
      </div>
      </div>
    );
  }
}

/* =================== THE VIEWS OF OUR DIFFERENT LIGHTING COMPONENTS =================== */
function Light(props) {
  return (
      <Draggable 
        bounds="parent"
        defaultPosition={{x: 0, y: 0}}
        {...props.dragHandlers}>
        <div className="box" style={{overflow: 'visible'}}>
          <form>
            <label id={'lightlabel:'+props.index} className="light-label">
              Name:
              <input id={'inputlabel:'+props.index} type="text" name="name" value={'light'+props.index} onChange={() => {}}/>
            </label>
          </form>
          <svg id={'lightsvg:'+props.index}>
            <circle id={'light:'+props.index} className="light" cx={60} cy={52} r={50} fill={props.color} />
            <svg id={'lightnodesvgleft:'+props.index}>
              <circle id={'node-left:'+props.index} className="node-left" cx={12} cy={52} r={10} onMouseDown={() => {
                var appObj = props.self;    
                if (appObj.state.drawingAWire) {
                  const history = appObj.getHistory();
                  const current = appObj.getCurrentStateFromHistory();
                  const lights = current.lights.slice();
                  const lightToConnectTo = lights[props.index];
                  if (lightBeingConnected != lightToConnectTo) {
                    const connections = current.connections.slice();
                    console.log("new connection made!");
                    connections.push(new Cable(lightBeingConnected, lightToConnectTo));     
                    lightBeingConnected = null;
                    appObj.setState({
                      ...appObj.state,
                      history: history.concat([{
                        ...current, // keeps everything the same and only updates lights
                        connections: connections,
                      }]),
                      stepNumber: history.length,   
                      drawingAWire: false,
                      }); 
                  }                                     
                }                 
              }}/>
            </svg>   
            <svg id={'lightnodesvgright:'+props.index}>
              <circle id={'node-right:'+props.index} className="node-right" cx={108} cy={52} r={10} onMouseDown={() => {
                var appObj = props.self;
                if (!appObj.state.drawingAWire) {
                  lightBeingConnected = appObj.getCurrentStateFromHistory().lights[props.index];
                } else {
                  lightBeingConnected = null;
                }                
                appObj.setState({
                  ...appObj.state, 
                  drawingAWire: !appObj.state.drawingAWire,
                  });
              }}/>
            </svg>                
          </svg>   
          <input type="color" id={'colorpicker:'+props.index} value={props.color} style={{position: 'relative', top: '-50px', left:'35px'}} onChange={() => {
              const appObj = props.self;
              const history = appObj.getHistory();
              const current = appObj.getCurrentStateFromHistory();
              const lights = current.lights.slice();                  
              var light = lights[props.index];        
              const colorPickerElement = document.getElementById('colorpicker:'+props.index);      
              light.setColor(colorPickerElement.value);
              appObj.setState({
                ...appObj.state, 
                history: history.concat([{
                  ...current, // keeps everything the same and only updates lights
                  lights: lights,
                }]),
                stepNumber: history.length,   
              });            
            }}>
            </input>   
        </div>
      </Draggable>
  );
}
function Wire(props) {
  return (
    <div id={"wire"+props.index} className="svg-wire-container" style={{top: props.firstnode.getXPos(), left: props.firstnode.getYPos(), zIndex: 900}}>
      <svg pointerEvents="none" transform={ "translate("+props.transformX+","+props.transformY+")" }>
        <line className='wire' x1={0} y1={0} x2={props.secondnode.getXPos()} y2={props.secondnode.getYPos()} />
      </svg>
      {console.log(document.getElementById("wire"+props.index))}
    </div>
  );
}
function SceneButton(props) {
  return (
    <div>
      <br />
      <button>{props.name}</button>
    </div>
  );
}

/* ==================== CLASSES FOR LIGHTING ELEMENT DATA STRUCTURES ==================== */
class RGBLight {
  constructor(index, color) {
    this.color = color;
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.index = index;
    this.connectedTo = null;
    this.connectedBy = null;
  }
  setColor(color) {
    this.color = color;;
  }
  setXPos(x) {
    this.x = x;
  }
  setYPos(y) {
    this.y = y;
  }
  setPrevXPos(x) {
    this.prevX = x;
  }
  setPrevYPos(y) {
    this.prevY = y;
  }
  setConnectedTo(fixture) {
    this.connectedTo = fixture;
  }
  setConnectedBy(fixture) {
    this.connectedBy = fixture;
  }
  getColor()       { return this.color; }
  getIndex()       { return this.index; }
  getXPos()        { return this.x; }
  getYPos()        { return this.y; }  
  getPrevXPos()    { return this.prevX; }
  getPrevYPos()    { return this.prevY; }  
  getConnectedTo() { return this.connectedTo; }
  getConnectedBy() { return this.connectedBy; }
}
class Cable {
  constructor(firstNode, secondNode) {
    this.firstNode = firstNode; // nodes will be structured like {parent: Light, x: x, y: y}
    this.secondNode = secondNode;
    console.log("connection made between " + this.firstNode + " and " + this.secondNode);
  }
  setFirstNode(firstNode)   { this.firstNode = firstNode; }
  setSecondNode(secondNode) { this.secondNode = secondNode; }
  getFirstNode()            { return this.firstNode; }
  getSecondNode()           { return this.secondNode; }
}
class Scene {
  constructor(name, lights) {
    this.name = name;
    this.lights = lights;
  }
  setName(name) {
    this.name = name;
  }
  getName() { return this.name; }
}

/* ========================= MAKECODE SPECIFIC EDITOR FUNCTIONS ========================= */
function receiveMessage(ev) {
  var msg = ev.data;
  var action = idToType[msg.id];
  if (action) {
      console.debug('dmxeditor received ' + action);
      switch (action) {
          case "extinit":
              hosted = true;
              console.log('host connection completed')
              sendRequest("extreadusercode");
              break;
          case "extreadusercode":
              usercode = msg.resp || {};
              break;
          case "exthidden":
              console.log("hidden!!");
              break;
      }
      delete idToType[msg.id];
  }
}
function mkRequest(action) {
  var id = Math.random().toString();
  idToType[id] = action;
  return {
      type: "pxtpkgext",
      action: action,
      extId: extId,
      response: true,
      id: id
  }
}
function isIFrame() {
  try {
      return window && window.self !== window.top;
  } catch (e) {
      return true;
  }
}
function sendRequest(action, body) {
  if (!isIFrame()) return;
  var msg = mkRequest(action);
  msg.body = body;
  window.parent.postMessage(msg, "*");
}

/* ============================= BLOCK GENERATION FUNCTIONS ============================= */
function renderUserCode() {
  var ts = `
  // This file was autogenerated, do not edit...
  
  namespace dmx { 
      console.info("initializing dmx extension namespace");
      export const metadata = ${JSON.stringify(usercode)};
      export const dmxcontroller = new _core.hacks.nodedmx();
      dmxcontroller.addUniverse('pidmx', 'dmxking-ultra-dmx-pro', '/dev/ttyUSB0');
      export const intervalIDs = {};`

  //ts += renderEnumCode();
  //ts += renderSceneBlocksCode();
  //ts += renderPatternBlocksCode();
  //ts += renderFixtureBlocksCode();
  ts += `
  }`

  console.log(ts);
  return ts;
}
function renderEnumCode() {
  // STUB
  return ``;
}
function renderSceneBlocksCode() {
  // STUB
  return ``;
}
function renderPatternBlocksCode() {
  // STUB  
  return ``;
}
function renderFixtureBlocksCode() {
  // STUB  
  return ``;
}
function generateBlackoutJSON() { }
function generatePlayPatternCode() { }
function generateCurrentChannelStateJSON() { }

/* =============================== RENDER THE APPLICATION =============================== */
ReactDOM.render(
  <App />,
  document.getElementById('root')
);
