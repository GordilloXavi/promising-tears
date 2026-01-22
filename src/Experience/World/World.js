import * as THREE from 'three'
import Experience from '../Experience.js'
import WaterFloor from './WaterFloor.js'
import PlanktonGroup from './PlanktonGroup.js'

export default class World
{
    constructor()
    {
        this.experience = new Experience()
        this.camera = this.experience.camera.instance
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.rayCaster = new THREE.Raycaster()

        // Wait for resources
        this.resources.on('ready', () =>
        {
            // Setup
            this.waterFloor = new WaterFloor()
            this.PlanktonGroup = new PlanktonGroup()

            this.envMap = this.resources.items.skyEnvMap
            this.envMap.mapping = THREE.EquirectangularReflectionMapping
            this.scene.background = this.envMap
            this.scene.environment = this.envMap
            this.scene.backgroundIntensity = 0.7
            this.scene.environmentIntensity = 0.7
        })
    }

    handleIntersections () {
        if (this.PlanktonGroup) this.PlanktonGroup.handleIntersections(this.rayCaster)
    }

    handleClick (event) {
        this.PlanktonGroup.handleClick(event)
    }

    update()
    {
        if (this.players)
            this.players.update()
        this.rayCaster.setFromCamera(new THREE.Vector2(0, 0), this.camera)
        this.handleIntersections()
        if (this.waterFloor)
            this.waterFloor.update()
        if (this.PlanktonGroup)
            this.PlanktonGroup.update()
    }
}