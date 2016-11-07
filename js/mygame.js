/*
	Proyecto final GPC - German Garcia Ferrando 
*/

// Add cursor en el centro y comprobar colision con las mallas 

// Variables globales consensuadas
var renderer, scene, camera;
var loader, fontLoader; 
var first_time_init = true; 
var first_time_simulate = true; 
// Time 
var lastTime = Date.now(); 
var elapsedTime = 0; 
var regenerationTime = 0; 
// Set up physics lib 
Physijs.scripts.worker = 'lib/physijs_worker.js'; // relative html
Physijs.scripts.ammo = 'ammo.js'; // relative physijs
var physics_stats;
// Pointer 
var raycaster, intersects; 
// Array of meteors 
var meteors = [];
// Spacecraft 
var spacecraft; 

// Lights 
var luzAmbiente;

// Set up game 
const MAX_NUM_METEORS = 5; 
const PROB_GOLDEN_METEOR = 0.2; 
const MAX_HP = 3;
const TIME_RESTO_HP = 4; // seconds  
const OP_INCRE = 0.15; 
var lvl, hp, alive, score; 
var scoreText, scoreMat; 

// audio 
var audioFile = 'audio/track2.mp3';
var blopFile = 'audio/blop.mp3'; 
var punchFile = 'audio/punch.mp3'; 
var explosionFile = 'audio/explosion.mp3'; 
var songAudio, blopSound, punchSound, explosionSound; 

// Font 
var fontProperties = {
    size: 20,
    height: 0,
    curveSegments: 4,
    bevelThickness: 1,
    bevelSize: 0,
    bevelEnabled: true
}

// Game Over 
var button; 
const ROT_SPEED = 0.01; 

// Call functions 
start(); 

function start(){
	if(first_time_init){
		init(); 
		first_time_init = false; 
	}
	reset();
	loadScene(); 
	// audio
	songAudio.play(); 
	render();
}

function cleanScene(){
	// deadline made this :(
	scene = new Physijs.Scene;
    scene.setGravity(new THREE.Vector3(0,0,0)); 
    // Listener update Scene 
    scene.addEventListener('update', updatePhysi);
	// Add camera again 
	scene.add(camera); 
	// Add lights again 
	scene.add(luzAmbiente);
}

function reset(){
	cleanScene(); 
	// setUp game 
	lvl = 1; 
	score = 0; 
	alive = true; 
	hp = MAX_HP; 
}

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
	        color: 0x00FF00,
	        innerRadius: 0.002,
	        outerRadius: 0.005,
	        hover: {
	            color: 0x00FF00,
	            innerRadius: 0.02,
	            outerRadius: 0.024,
	            speed: 5,
	            vibrate: 50 //Set to 0 or [] to disable
	        }
	    },
	    fuse: {
	        visible: true,
	        duration: 0.75,
	        color: 0x00fff6,
	        innerRadius: 0.045,
	        outerRadius: 0.06,
	        vibrate: 0, //Set to 0 or [] to disable
	        clickCancelFuse: false //If users clicks on targeted object fuse is canceled
	    }
	});

    scene.add( camera );

	// Lights  
	luzAmbiente = new THREE.AmbientLight(0x444444); 
	scene.add(luzAmbiente); 

	// Enable listener of android-chrome-controller to track the motion of the phone 
	window.addEventListener('deviceorientation', setOrientationControls, true); 

	// Initialize loader 
	loader = new THREE.TextureLoader(); 
	fontLoader = new THREE.FontLoader()

	// Initialize all the variables of the audio 
	initAudio(); 

	// From zero  
	lvl = 1; 
	score = 0; 
	alive = true; 
	hp = MAX_HP; 

	// Turn on Stereo Effect 
    effect = new THREE.StereoEffect(renderer); 
    effect.setSize( window.innerWidth, window.innerHeight); 
}

function initAudio(){
	// Song
	songAudio = document.createElement('audio'); 
	var source = document.createElement('source'); 
	source.src = audioFile; 
	songAudio.appendChild(source); 
	// Blop 
	blopSound = document.createElement('audio'); 
	var blopSource = document.createElement('source'); 
	blopSource.src = blopFile; 
	blopSound.appendChild(blopSource); 
	// Punch 
	punchSound = document.createElement('audio'); 
	var punchSource = document.createElement('source'); 
	punchSource.src = punchFile; 
	punchSound.appendChild(punchSource); 
	// Explosion 
	explosionSound = document.createElement('audio'); 
	var explosionSource = document.createElement('source'); 
	explosionSource.src = explosionFile; 
	explosionSound.appendChild(explosionSource); 
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
	var spacecraftGeo = new THREE.SphereGeometry(2); 
	var spacecraftMat = new THREE.MeshBasicMaterial({transparent:true, opacity:0, color:"red", side: THREE.BackSide});
	spacecraft = new Physijs.SphereMesh(spacecraftGeo, spacecraftMat, 
		0 // masa 0 ti make it immobile
		); 
	spacecraft.position.set(0,0,0); 
	spacecraft.name = "spacecraft";
	spacecraft.addEventListener('collision', handleCollisionSpacecraft);
	scene.add(spacecraft); 

	// Test 
	fontLoader.load('fonts/helvetiker_bold.typeface.js', function(font){
		fontProperties.font = font; 
		scoreMat = new THREE.MeshBasicMaterial({color:0x86FFFC}); 
		var textGeo = new THREE.TextGeometry("0", fontProperties); 
		scoreText = new THREE.Mesh(textGeo , scoreMat); 
		scoreText.rotation.y = -Math.PI/2;
		scoreText.position.set(200,0,0);
		scene.add(scoreText); 
	})
}

function update3d(){
	// Reticulum 
	Reticulum.update(); 
	if(alive){
		// time 
		var now = Date.now(); 
		// Evitar grandes saltos 
		var delta = Math.min(100, now - lastTime); 
		elapsedTime += delta; 
		lastTime = now; 

		// Check updates 
		if(elapsedTime > 1000){
			if(score > lvl*10){
				lvl += 1; 
			}
			// Keep same number of meteors in the space 
			if (MAX_NUM_METEORS*lvl > meteors.length){
				spawnMeteor();
			}
			elapsedTime = 0; 
			// Check if the regeneration should start 
			if(hp < MAX_HP){
				regenerationTime += 1;  
			} 
			// Restore hp each TIME_RESTO_HP secnds
			if (regenerationTime > TIME_RESTO_HP){
				if(hp < MAX_HP)
					hp += 1; 
					spacecraft.material.opacity -= OP_INCRE; 
				regenerationTime = 0; 
			}
		}

		// Check if you're alive 
		if(hp <= 0){
			explosionSound.play(); 
			gameOver();  
		}
	}// not alive 
	else{
		// Rotate button 
		button.rotation.x -= ROT_SPEED * 2;
    	button.rotation.y -= ROT_SPEED;
    	button.rotation.z -= ROT_SPEED * 3;
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

function updateScore(){
	// remove old score 
	scene.remove(scoreText);
	// create new score  
	var s = "" + score; 
	var textGeo = new THREE.TextGeometry(s, fontProperties); 
	scoreText = new THREE.Mesh(textGeo , scoreMat); 
	scoreText.rotation.y = -Math.PI/2;
	scoreText.position.set(200,0,0);
	scene.add(scoreText); 
}

function gameOver(){
	songAudio.pause(); 
	songAudio.currentTime = 0; 
	alive = false; 
	meteors = []; 
	cleanScene(); 

	// Draw UI Game Over and Replay 
	var textGeo = new THREE.TextGeometry("SCORE", fontProperties); 
	var gameOverText = new THREE.Mesh(textGeo , scoreMat); 
	gameOverText.rotation.y = -Math.PI/2;
	gameOverText.position.set(175,15,-35);
	scene.add(gameOverText);
	// Score number 
	var string = "" + score; 
	var textGeo = new THREE.TextGeometry(string, fontProperties); 
	var scoreCounter = new THREE.Mesh(textGeo , scoreMat); 
	scoreCounter.rotation.y = -Math.PI/2;
	scoreCounter.position.set(175,-15,0);
	scene.add(scoreCounter);
	// Play again text 
	var againGeo = new THREE.TextGeometry("Try again", fontProperties); 
	var againMat = new THREE.MeshBasicMaterial({color:"white"})
	var again = new THREE.Mesh(againGeo , againMat); 
	again.rotation.y = Math.PI/2;
	again.position.set(-175, 20, 80); 
	scene.add(again); 
	// Add the box 
	var boxGeo = new THREE.BoxGeometry(20,20,20); 
	var boxMat = new THREE.MeshNormalMaterial();
	button = new THREE.Mesh(boxGeo , boxMat);  
	Reticulum.add( button, {
	    onGazeLong: function(){ 
	    	this.visible = false; 
			start();    
	    }
	});
	button.position.set(-175,-20,20); 
	scene.add(button); 
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
    // Calculate vec velocity respect to camera position 
    var mod = Math.sqrt(((camera.position.x - x)**2)+((camera.position.y - y)**2)+((camera.position.z - z)**2))
    var _vel = new THREE.Vector3(-(x/mod),-(y/mod),-(z/mod));
    _vel.multiplyScalar(lvl*10);  
	/* Define type */
	if(Math.random() < PROB_GOLDEN_METEOR){
		type = "golden";
		material = new THREE.MeshBasicMaterial({color: "yellow"}); 
		_vel.multiplyScalar(2);
	}else{
		// var texturaUniverso = loader.load('images/8bit-colors.jpg');
		material = new THREE.MeshBasicMaterial({color: "white"});
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
	        this.material.color.g -= 0.5;
	    },
	    onGazeOut: function(){
	        // do something when user moves reticle off targeted object
	        this.material.color.g += 0.5;
	    },
	    onGazeLong: function(){ 
			if (removeMeteor(this)){
				score += (this.name == "standard") ? 1 : 10;
				// updateScore 
				updateScore(); 
				// audio
				blopSound.play(); 
			}  
	    }
	});
    // add event listener for the collisions 
    meteor.addEventListener('collision', handleCollisionMeteor);

    // add to the scene 
    scene.add( meteor );
}

function handleCollisionSpacecraft(collided_with, linearVelocity, angularVelocity){
	// Pintar la sphera de color rojo e ir reduciendo la intensidad 
	if(collided_with.name == "standard"){
		this.material.opacity += OP_INCRE; 
		hp -= 1; 
	}else{  
		if(collided_with.name == "golden"){
			this.material.opacity += OP_INCRE * 2; 
			hp -= 2;
		}
	}
}

function handleCollisionMeteor(collided_with, linearVelocity, angularVelocity){
	// If a meteor collided with the space, remove it 
	removeMeteor(this);
	// play song 
	punchSound.play();  
}

function removeMeteor(meteor){
	var i; var found = false;
	// Find correct element  
	for(i = 0; i < meteors.length; i++){
		if(meteor.uuid == meteors[i].uuid){
			found = true; 
			break; 
		}
	}
	if(found){
		meteors.splice(i,1); 
		meteor.visible = false;  // Idk why, but something weird happens here 
		scene.remove(meteor); 
		return true; 
	}else{
		return false; 
	}
}

function render(){
	// Physics 
	scene.simulate();
	// Threejs update 
	update3d();
	// Render 3D Scene  
	effect.render(scene, camera); 
	// Re-loop 
	requestAnimationFrame( render );
}