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
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

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
    }
}

document.addEventListener( 'keydown', onKeyDown )
document.addEventListener( 'keyup', onKeyUp )


/**
* SCENE BUILDING
*/

// Env map
const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()

const cloudyHdrUrl = new URL('../static/cloudy.hdr', import.meta.url)
new RGBELoader().load(cloudyHdrUrl, (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    const envMap = pmremGenerator.fromEquirectangular(texture).texture

    scene.background = texture
    scene.environment = envMap
    renderer.toneMappingExposure = 0.7

    texture.dispose()
    pmremGenerator.dispose()
}, undefined, (error) => {
    console.error('Failed to load HDR environment map:', error)
})


const crystalMaterial = new THREE.MeshPhysicalMaterial()
// Crystal material settings
const crystalMaterialParams = {
    color: '#ff0000',
    metalness: 0,
    roughness: 0.05,
    transmission: 0.98,
    ior: 1.6,
    thickness: 0.1,
}

crystalMaterial.color = new THREE.Color(crystalMaterialParams.color)
crystalMaterial.metalness = crystalMaterialParams.metalness
crystalMaterial.roughness = crystalMaterialParams.roughness
crystalMaterial.transmission = crystalMaterialParams.transmission
crystalMaterial.ior = crystalMaterialParams.ior
crystalMaterial.thickness = crystalMaterialParams.thickness

const crystalGUIFolder = gui.addFolder('crystalMaterial')
crystalGUIFolder.addColor(crystalMaterialParams, 'color').onChange(value => {
    crystalMaterial.color.set(value)
})
crystalGUIFolder.add(crystalMaterialParams, 'metalness', 0, 1).onChange(value => {
    crystalMaterial.metalness = value
})
crystalGUIFolder.add(crystalMaterialParams, 'roughness', 0, 1).onChange(value => {
    crystalMaterial.roughness = value
})
crystalGUIFolder.add(crystalMaterialParams, 'transmission', 0, 1).onChange(value => {
    crystalMaterial.transmission = value
})
crystalGUIFolder.add(crystalMaterialParams, 'ior', 1, 2.5).onChange(value => {
    crystalMaterial.ior = value
})
crystalGUIFolder.add(crystalMaterialParams, 'thickness', 0, 1).onChange(value => {
    crystalMaterial.thickness = value
})

crystalGUIFolder.close()


const crystalCube = new THREE.Mesh(
    new THREE.BoxGeometry(10, 2, 1),
    crystalMaterial
)

crystalCube.castShadow = true
crystalCube.receiveShadow = true

crystalCube.position.set(0, 0, -5)
scene.add(crystalCube)

const crystalCube2 = crystalCube.clone()
crystalCube2.position.set(0, 0, 5)
scene.add(crystalCube2)

const crystalCube3 = crystalCube.clone()
crystalCube3.position.set(-5, 0, 0)
crystalCube3.rotation.set(0, Math.PI/2, 0)
scene.add(crystalCube3)

const crystalCube4 = crystalCube.clone()
crystalCube4.position.set(5, 0, 0)
crystalCube4.rotation.set(0, Math.PI/2, 0)
scene.add(crystalCube4)

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
    //if (gameStarted) return
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