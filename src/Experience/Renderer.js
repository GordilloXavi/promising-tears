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

        this.postProcessingEnabled = true

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

        
        const unrealBloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.35, // strength 0.2
            0.49, // radius 0.05
            0.005 // threshold 0.01
        )
        unrealBloomPass.renderToScreen = true

        this.effectComposer.addPass(unrealBloomPass)
        
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

    update()
    {
        if (this.postProcessingEnabled) {
            this.effectComposer.render()
        } else {
            this.instance.render(this.scene, this.camera.instance)
        }
    }
}