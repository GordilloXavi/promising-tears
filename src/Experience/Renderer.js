import * as THREE from 'three'
import Experience from './Experience.js'

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js'


export default class Renderer
{
    constructor()
    {
        this.experience = new Experience()
        this.canvas = this.experience.canvas
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.camera = this.experience.camera
        this.time = this.experience.time

        this.postProcessingEnabled = true

        // Bloom target values (normal state)
        this.bloomTargetStrength = 0.2 // 0.2
        this.bloomTargetRadius = 0.49 // 0.05
        this.bloomTargetThreshold = 0.005 // 0.01

        // Bloom entry effect values (bright/overexposed)
        this.bloomEntryStrength = 1.5
        this.bloomEntryRadius = 1.2
        this.bloomEntryThreshold = 0.0

        // Animation state
        this.isAnimatingEntry = false
        this.entryAnimationSpeed = 6.0 // How fast the transition happens

        this.setInstance()
    }

    setInstance()
    {
        this.instance = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        })
        this.instance.toneMapping = THREE.CineonToneMapping
        this.instance.toneMappingExposure = 1.75
        this.instance.shadowMap.enabled = true
        this.instance.shadowMap.type = THREE.PCFSoftShadowMap
        this.instance.setClearColor('#211d20')
        this.instance.setSize(this.sizes.width, this.sizes.height)
        this.instance.setPixelRatio(this.sizes.pixelRatio)

        // Add effects:
        const renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                type: THREE.HalfFloatType,
                format: THREE.RGBAFormat,
                encoding: THREE.sRGBEncoding,
            }
        )
        this.effectComposer = new EffectComposer(this.instance, renderTarget)
        this.effectComposer.setSize(this.sizes.width, this.sizes.height)
        this.effectComposer.setPixelRatio(Math.min(this.sizes.pixelRatio, 2))
        this.effectComposer.addPass(new RenderPass(this.scene, this.camera.instance))

        
        this.unrealBloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.bloomTargetStrength,
            this.bloomTargetRadius,
            this.bloomTargetThreshold
        )
        this.unrealBloomPass.renderToScreen = true

        this.effectComposer.addPass(this.unrealBloomPass)
        
        const effectFilm = new FilmPass( 0.1, false )
        this.effectComposer.addPass(effectFilm)

        if(this.instance.getPixelRatio() == 1 )
        {
            const smaaPass = new SMAAPass()
            this.effectComposer.addPass(smaaPass)
        }
    }

    resize()
    {
        this.instance.setSize(this.sizes.width, this.sizes.height)
        this.instance.setPixelRatio(this.sizes.pixelRatio)

        this.effectComposer.setSize(this.sizes.width, this.sizes.height)
        this.effectComposer.setPixelRatio(this.sizes.pixelRatio)
    }

    /**
     * Trigger the entry effect - bloom starts at full intensity
     * and smoothly transitions back to normal values
     */
    enter()
    {
        // Set bloom to entry values (overexposed/bright)
        this.unrealBloomPass.strength = this.bloomEntryStrength
        this.unrealBloomPass.radius = this.bloomEntryRadius
        this.unrealBloomPass.threshold = this.bloomEntryThreshold

        // Start the animation
        this.isAnimatingEntry = true
    }

    update()
    {
        // Animate bloom entry effect
        if (this.isAnimatingEntry)
        {
            const lerpFactor = 1.0 - Math.exp(-this.entryAnimationSpeed * this.time.delta)

            this.unrealBloomPass.strength = THREE.MathUtils.lerp(
                this.unrealBloomPass.strength,
                this.bloomTargetStrength,
                lerpFactor
            )
            this.unrealBloomPass.radius = THREE.MathUtils.lerp(
                this.unrealBloomPass.radius,
                this.bloomTargetRadius,
                lerpFactor
            )
            this.unrealBloomPass.threshold = THREE.MathUtils.lerp(
                this.unrealBloomPass.threshold,
                this.bloomTargetThreshold,
                lerpFactor
            )

            // Check if animation is complete (values are close enough to target)
            const strengthDiff = Math.abs(this.unrealBloomPass.strength - this.bloomTargetStrength)
            const radiusDiff = Math.abs(this.unrealBloomPass.radius - this.bloomTargetRadius)
            const thresholdDiff = Math.abs(this.unrealBloomPass.threshold - this.bloomTargetThreshold)

            if (strengthDiff < 0.001 && radiusDiff < 0.001 && thresholdDiff < 0.0001)
            {
                // Snap to final values and stop animation
                this.unrealBloomPass.strength = this.bloomTargetStrength
                this.unrealBloomPass.radius = this.bloomTargetRadius
                this.unrealBloomPass.threshold = this.bloomTargetThreshold
                this.isAnimatingEntry = false
            }
        }

        if (this.postProcessingEnabled) {
            this.effectComposer.render()
        } else {
            this.instance.render(this.scene, this.camera.instance)
        }
    }
}