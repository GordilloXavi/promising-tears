import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js'

// Debug
const gui = new GUI()
gui.close()

// Canvas
const canvas = document.querySelector('canvas.webgl')
/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Camera
 */

const cameraControlParams = {
    movementSpeed: 15,
    velocityDecay: 0.1,
    initialX: 0, 
    initialY: 0,
    initialZ: 0,
    renderDistance: 500 // TODO: make this as small as possible
}

const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, cameraControlParams.renderDistance)

camera.position.x = cameraControlParams.initialX
camera.position.y = cameraControlParams.initialY
camera.position.z = cameraControlParams.initialZ


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.shadowMap.enabled = true
renderer.colorSpace = THREE.SRGBColorSpace

renderer.physicallyCorrectLights = true

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Scene
const scene = new THREE.Scene()

//scene.fog = fog
scene.background = new THREE.Color(0x00AA00)


// Controls
const controls = new PointerLockControls( camera, document.body )
const controlsGUIFolder = gui.addFolder('controls')
controlsGUIFolder.close()

let moveForward = false
let moveBackward = false
let moveLeft = false
let moveRight = false
const velocity = new THREE.Vector3()
const direction = new THREE.Vector3()

controls.pointerSpeed = 0.8

scene.add(controls.getObject())

const onKeyDown = function ( event ) {
    switch ( event.code ) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true
            break

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true
            break

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true
            break

        case 'ArrowRight':
        case 'KeyD':
            moveRight = true
            break
        
        case 'ShiftRight':
        case 'ShiftLeft':
            sprinting = true
            justBeganSprinting = true
            break
    }
}

const onKeyUp = function ( event ) {
    switch ( event.code ) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false
            break

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false
            break

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false
            break

        case 'ArrowRight':
        case 'KeyD':
            moveRight = false
            break

        case 'ShiftRight':
        case 'ShiftLeft':
            sprinting = false
            break
    }
}

document.addEventListener( 'keydown', onKeyDown )
document.addEventListener( 'keyup', onKeyUp )


/**
* SCENE BUILDING
*/

// Env map
let envMap;
if (window.resources && window.resources.items && window.resources.items.skyEnvMap) {
    envMap = window.resources.items.skyEnvMap;
} else if (typeof resources !== 'undefined' && resources.items && resources.items.skyEnvMap) {
    envMap = resources.items.skyEnvMap;
}
if (envMap) {
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = envMap;
    scene.environment = envMap;
    // For background/environment intensity, use renderer/exposure or materials, not properties on scene directly
    renderer.toneMappingExposure = 0.7;
}

const crystalMaterial = new THREE.MeshPhysicalMaterial()
crystalMaterial.color = new THREE.Color(0xffffff)
crystalMaterial.metalness = 0
crystalMaterial.roughness = 0.05
crystalMaterial.transmission = 0.98
crystalMaterial.ior = 1.6
crystalMaterial.thickness = 0.1


const crystalCube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    crystalMaterial
)

crystalCube.castShadow = true
crystalCube.receiveShadow = true

crystalCube.position.x = 0
crystalCube.position.y = 0
crystalCube.position.z = -2
scene.add(crystalCube)


/**
 * Lights
 */
const lightsGUIFolder = gui.addFolder( 'lights' )
lightsGUIFolder.close()


const ambientLight = new THREE.AmbientLight(0xffffff, 1)
scene.add(ambientLight)
lightsGUIFolder.add(ambientLight, 'intensity', 0, 10).name('ambient light intensity')

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    effectComposer.setSize(sizes.width, sizes.height)
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

let gameStarted = false
document.addEventListener('click', () => {
    // Ignore clicks while still on the loading screen; allow relock after starting
    if (gameStarted) return
    gameStarted = true
    controls.lock()
})

// POST-PROCESSING
const effectComposer = new EffectComposer(renderer)
effectComposer.setSize(sizes.width, sizes.height)
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
effectComposer.addPass(new RenderPass(scene, camera))

const unrealBloomPass = new UnrealBloomPass()

const bloomGUIFolder = gui.addFolder('bloom')
bloomGUIFolder.close()

let bloomParams = {
    effectComposerEnabled: false,
    enabled: false,
    threshold: 0.05,
    strength: 0.82,
    radius: 0.2,
    closeRadius: 1.2,
    filmGrainIntensity: 0,
    grayscale: false
}

unrealBloomPass.strength = bloomParams.strength
unrealBloomPass.radius = bloomParams.radius
unrealBloomPass.threshold = bloomParams.threshold

bloomGUIFolder.add(bloomParams, 'effectComposerEnabled').name('effect composer enabled')

bloomGUIFolder.add(bloomParams, 'strength', 0, 3).name('bloom strength').onChange(() => {
    unrealBloomPass.strength = bloomParams.strength
})
bloomGUIFolder.add(bloomParams, 'radius', 0, 2).name('bloom radius').onChange(() => {
    unrealBloomPass.radius = bloomParams.radius
})
bloomGUIFolder.add(bloomParams, 'threshold', 0, 0.3).name('bloom threshold').onChange(() => {
    unrealBloomPass.threshold = bloomParams.threshold
})

effectComposer.addPass(unrealBloomPass)

// Film grain
const effectFilm = new FilmPass( bloomParams.filmGrainIntensity, bloomParams.greyscale )
effectComposer.addPass(effectFilm)
bloomGUIFolder.add(bloomParams, 'filmGrainIntensity', 0, 5).name('film grain intensity').onChange(() => {effectFilm.uniforms.intensity.value = bloomParams.filmGrainIntensity})
bloomGUIFolder.add(bloomParams, 'grayscale').onChange(() => {effectFilm.uniforms.grayscale.value = bloomParams.grayscale})

const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader)
effectComposer.addPass(gammaCorrectionPass)

// Antialias
if(renderer.getPixelRatio() == 1 ) // && !renderer.capabilities.isWebGL2
    {
        const smaaPass = new SMAAPass()
        effectComposer.addPass(smaaPass)
    }

const timer = new Timer()

const tick = () =>
{
    // Timer
    timer.update()

    const frameElapsedTime = timer.getDelta()


    // Controls:
    velocity.x -= velocity.x * frameElapsedTime * 1/cameraControlParams.velocityDecay
	velocity.z -= velocity.z * frameElapsedTime * 1/cameraControlParams.velocityDecay

    direction.z = Number( moveForward ) - Number( moveBackward )
	direction.x = Number( moveRight ) - Number( moveLeft )
    direction.normalize()

    if ( moveForward || moveBackward ) velocity.z -= direction.z * frameElapsedTime
    if ( moveLeft || moveRight ) velocity.x -= direction.x * frameElapsedTime

    const currentMovementSpeed = cameraControlParams.movementSpeed
    const deltaX = - velocity.x * frameElapsedTime * currentMovementSpeed
    const deltaZ = - velocity.z * frameElapsedTime * currentMovementSpeed

    const playerRadius = 0.5
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()

    if (deltaX !== 0) {
        right.setFromMatrixColumn(camera.matrix, 0)
        controls.moveRight(deltaX)
    }

    if (deltaZ !== 0) {
        right.setFromMatrixColumn(camera.matrix, 0)
        forward.crossVectors(camera.up, right).normalize()
        const moveDir = forward.clone()
        if (deltaZ < 0) moveDir.negate()
        controls.moveForward(deltaZ)
    }



    // Render
    if (bloomParams.effectComposerEnabled) {
        effectComposer.render()
    } else {
        renderer.render(scene,camera)
    }

    window.requestAnimationFrame(tick)
}

tick()