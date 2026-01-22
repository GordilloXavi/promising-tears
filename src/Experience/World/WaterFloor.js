import * as THREE from 'three'
import Experience from '../Experience.js'
import { Water } from 'three/addons/objects/Water.js';

export default class WaterFloor
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources

        this.normalMap = this.resources.items.waterNormalTexture
        this.normalMap.wrapS = this.normalMap.wrapT = THREE.RepeatWrapping

        this.water = new Water(new THREE.PlaneGeometry(100, 100),
            {
                textureWidth: 1024,
                textureHeight: 1024,
                waterNormals: this.normalMap,
                //sunDirection: new THREE.Vector3(), // this was commented
                sunColor: 0x111111,
                waterColor: 0x111111,
                //distortionScale: 1000,
                fog: true
            }
        )

        this.water.rotation.x = - Math.PI / 2
        this.waterUniforms = this.water.material.uniforms
        this.waterUniforms['size'].value = 10
        this.waterUniforms['distortionScale'].value = 1


        this.scene.add(this.water)
    }

    update() {
        this.water.position.y = Math.sin(this.experience.time.elapsed/1000) / 10
        this.waterUniforms[ 'time' ].value += this.experience.time.delta / 2
    }
}