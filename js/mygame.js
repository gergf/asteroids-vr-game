/*
	Proyecto final GPC - German Garcia Ferrando 
*/

// Add cursor en el centro y comprobar colision con las mallas 

// Variables globales consensuadas
var renderer, scene, camera, loader;
var hudCanvas, hudSc
// Time 
var lastTime = Date.now(); 
var elapsedTime = 0; 
// Set up physics lib 
Physijs.scripts.worker = 'lib/physijs_worker.js'; // relative html
Physijs.scripts.ammo = 'ammo.js'; // relative physijs
var physics_stats;
// Pointer 
var raycaster, intersects; 
// Array of meteors 
var meteors = []; 

// Set up game 
const MAX_NUM_METEORS = 5; 
const PROB_GOLDEN_METEOR = 0.2; 
var lvl = 1; 
var score = 0; 

// audio 
var audioFile = 'audio/track2.mp3';
var blopFile = 'audio/blop.mp3'; 
var blopSound; 

// Call functions 
init();
loadScene(); 
render();

function init(){
	// 3D Scene 
	renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    element =  renderer.domElement;
    document.getElementById( 'container' ).appendChild(element);

    // Physic scene 
    scene = new Physijs.Scene;
    scene.setGravity(new THREE.Vector3(0,0,0)); 
    // Listener update Scene 
    scene.addEventListener('update', updatePhysi);

    // Camera 
    camera = new THREE.PerspectiveCamera(
        90,
        window.innerWidth / window.innerHeight,
        0.01,
        1500
    );
    camera.position.set( 0, 0, 0 );
    camera.lookAt(new THREE.Vector3(1,0,0));

    // Camera controls 
    cameraControls = new THREE.OrbitControls(camera, element);  
    // LookAt
	cameraControls.target.set(
	  camera.position.x + 1,
	  camera.position.y,
	  camera.position.z
	);
	cameraControls.noPan = true; 
	cameraControls.noZoom = true; 

    /* Reticulum */
	Reticulum.init(camera, {
	    proximity: false,
	    near: 0.01, 
	    far: 1000, 
	    reticle: {
	        visible: true,
	        restPoint: 1000, //Defines the reticle's resting point when no object has been targeted
	        color: 0xFFFF00,
	        innerRadius: 0.002,
	        outerRadius: 0.005,
	        hover: {
	            color: 0xFFFF00,
	            innerRadius: 0.02,
	            outerRadius: 0.024,
	            speed: 5,
	            vibrate: 50 //Set to 0 or [] to disable
	        }
	    },
	    fuse: {
	        visible: true,
	        duration: 1,
	        color: 0x00fff6,
	        innerRadius: 0.045,
	        outerRadius: 0.06,
	        vibrate: 0, //Set to 0 or [] to disable
	        clickCancelFuse: false //If users clicks on targeted object fuse is canceled
	    }
	});

    scene.add( camera );

	// Lights  
	var luzAmbiente = new THREE.AmbientLight(0x444444); 
	scene.add(luzAmbiente); 

	// Enable listener of android-chrome-controller to track the motion of the phone 
	window.addEventListener('deviceorientation', setOrientationControls, true); 

	// Initialice loader 
	loader = new THREE.TextureLoader(); 

	// Audio 
	var audio = document.createElement('audio'); 
	var source = document.createElement('source'); 
	source.src = audioFile; 
	audio.appendChild(source); 
	blopSound = document.createElement('audio'); 
	var blopSource = document.createElement('source'); 
	blopSource.src = blopFile; 
	blopSound.appendChild(blopSource); 
	

    // Stereoscopic view 
    // effect = new THREE.StereoEffect(renderer); 
    // effect.setSize( window.innerWidth, window.innerHeight); 
	
    // audio
	// audio.play(); 
}

function loadScene() {
	/* Universe */
	var uniGeo = new THREE.SphereGeometry(1500,100,100);
	var texturaUniverso = loader.load('textures/uniSphere.png'); 
	var uniMat = new THREE.MeshLambertMaterial({
				side: THREE.BackSide,
				map: texturaUniverso
			})
	var universe = new THREE.Mesh(uniGeo, uniMat); 
	universe.name = "universe"; 
	scene.add(universe);

	/* Spacecraft */ 
	var spacecraftGeo = new THREE.SphereGeometry(1.5); 
	var spacecraftMat = new THREE.MeshBasicMaterial({transparent:true, opacity:0, color:"red"});
	var spacecraft = new Physijs.SphereMesh(spacecraftGeo, spacecraftMat, 
		0 // masa 0 ti make it immobile
		); 
	spacecraft.position.set(0,0,0); 
	spacecraft.name = "spacecraft"
	spacecraft.addEventListener('collision', handleCollisionSpacecraft);
	scene.add(spacecraft); 

	// displayScore(10); 
}

function update3d(){
	// Reticulum 
	Reticulum.update(); 

	// time 
	var now = Date.now(); 
	// Evitar grandes saltos 
	var delta = Math.min(100, now - lastTime); 
	elapsedTime += delta; 
	lastTime = now; 

	// Check updates 
	if(elapsedTime > 1000){
		// Keep same number of meteors in the space 
		if (MAX_NUM_METEORS*lvl > meteors.length){
			spawnMeteor();
		}
		elapsedTime = 0; 
	}
}

function updatePhysi() {
	// Apply force to all the objects 
	for(var i = 0; i<meteors.length; i++){
		// Keep linearVelocity 
		var force = meteors[i]._physijs.linearVelocity;
		meteors[i].setLinearVelocity(force); 
	}
	
}

/*
	This function receives the object e {alpha, beta, gamma}
	from android-chrome. If the event is working, the controllers from 
	OrbitContorl are replaced by DeviceOrientationControls.
*/
function setOrientationControls(e) {
	// If it's not working 
	if (!e.alpha) {
	  return;
	}
	// Create DeviceOrientation Controls 
	cameraControls = new THREE.DeviceOrientationControls(camera, true);
	// Set up new controller 
	cameraControls.connect();
	cameraControls.update();
	// Test without click false 
	element.addEventListener('click', fullscreen, false);
	// Once the new controller is ready, delete the listener. 
	window.removeEventListener('deviceorientation', setOrientationControls, true);
}

function displayScore(score){
	var string = "Score: "+score; 
	var textGeo = new THREE.TextGeometry(string, {size:2}); 

	var scoreMesh = new THREE.Mesh(textGeo, 
		new THREE.MeshBasicMaterial({color: 0xffffff})
	);

	// Move the text to the top 
	scoreMesh.position.x = 20; 
	
	scene.add(scoreMesh);
}

function spawnMeteor(){
	var type = "standard"; 
	var material; 
	var plusOrMinus;
	/* Get random position */
	plusOrMinus = Math.random() < 0.5 ? -1 : 1; 
	var x = Math.round(Math.random() * 250)*plusOrMinus;
	plusOrMinus = Math.random() < 0.5 ? -1 : 1; 
	var y = Math.round(Math.random() * 250)*plusOrMinus;
	plusOrMinus = Math.random() < 0.5 ? -1 : 1; 
	var z = Math.round(Math.random() * 250)*plusOrMinus;
    // Calculate vec velocity respect to 0,0,0
    var mod = Math.sqrt((x*x)+(y*y)+(z*z))
    var _vel = new THREE.Vector3(-(x/mod),-(y/mod),-(z/mod));
    _vel.multiplyScalar(lvl*10);  
	/* Define type */
	if(Math.random() < PROB_GOLDEN_METEOR){
		type = "golden";
		material = new THREE.MeshBasicMaterial({color: "yellow"}); 
		_vel.multiplyScalar(2);
	}else{
		// var texturaUniverso = loader.load('images/8bit-colors.jpg');
		material = new THREE.MeshBasicMaterial({color: "red"});
	}
	/* Create Mesh */ 
    var meteor = new Physijs.BoxMesh(
        new THREE.CubeGeometry( 5, 5, 5 ),
        material
    );
    // set name 
    meteor.name = type; 
    meteor.position.set(x,y,z);
    // Apply impulse 
	// meteor.applyCentralImpulse() Ver que pasa con esto 
	meteor._physijs.linearVelocity.x = _vel.x; 
	meteor._physijs.linearVelocity.y = _vel.y; 
	meteor._physijs.linearVelocity.z = _vel.z; 
    // add to the list 
    meteors.push(meteor); 

    Reticulum.add( meteor, {
	    onGazeOver: function(){
	        // do something when user targets object

	    },
	    onGazeOut: function(){
	        // do something when user moves reticle off targeted object
	    },
	    onGazeLong: function(){
	    	var i; var found = false;
	    	// Find correct element  
	    	for(i = 0; i < meteors.length; i++){
	    		if(this.uuid == meteors[i].uuid){
	    			found = true; 
	    			break; 
	    		}
	    	}
	    	// If found, remove element 
			if (found){
				meteors.splice(i,1); 
				this.visible = false;  // No se por que, pero realmente no los borra de las escena
				score += (this.name == "standard") ? 1 : 10;
				scene.remove(this);
				// audio
				// blopSound.play(); 
			}  
	    },
	    onGazeClick: function(){
	        // have the object react when user clicks / taps on targeted object
	        // this.material.emissive.setHex( 0x0000cc );
	    }
	});


    // add to the scene 
    scene.add( meteor );
}

function handleCollisionSpacecraft(collided_with, linearVelocity, angularVelocity){
	// Pintar la sphera de color rojo e ir reduciendo la intensidad 
	
}

function render(){
	// Physics 
	scene.simulate();
	// Threejs update 
	update3d();
	// Render 3D Scene  
	renderer.render( scene, camera );
	// Re-loop
	requestAnimationFrame( render );	 
}