import * as THREE from 'three'
import Experience from '../Experience.js'
import WaterFloor from './WaterFloor.js'
import {Player, PlayerPool} from './PlayerPool.js'
import StemObjectGroup from './StemObjectGroup.js'

export default class World
{
    constructor()
    {
        this.experience = new Experience()
        this.camera = this.experience.camera.instance
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.rayCaster = new THREE.Raycaster()

        this.initPlayers()

        // Wait for resources
        this.resources.on('ready', () =>
        {
            // Setup
            this.waterFloor = new WaterFloor()
            this.stemObjectGroup = new StemObjectGroup()

            this.envMap = this.resources.items.skyEnvMap
            this.envMap.mapping = THREE.EquirectangularReflectionMapping
            this.scene.background = this.envMap
            this.scene.environment = this.envMap
            this.scene.backgroundIntensity = 0.7
            this.scene.environmentIntensity = 0.7
        })
    }

    initPlayers() {
        this.players = new PlayerPool()
        const cameraPosition = {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        }
        this.selfPlayer = new Player({
            name: 'Ylie', 
            position: cameraPosition,
            self: true
        })
        this.players.add(this.selfPlayer)
    }

    getSelfPlayer() {
        return this.selfPlayer
    }

    getPlayer(playerId) {
        return this.players.get(playerId)
    }

    addPlayer(player) {
        const newPlayer = new Player({
            name: player.name,
            position: player.position,
            id: player.client_id,
            serverId: player.id,
            self: false
        })
        this.players.add(newPlayer)
    }

    removePlayer(playerId) {
        this.players.delete(playerId)
    }

    updatePlayerPosition(playerId, position) {
        this.players[playerId].position = {
            x: position.x,
            y: position.y,
            z: position.z
        }
    }

    handleIntersections () {
        if (this.stemObjectGroup) this.stemObjectGroup.handleIntersections(this.rayCaster)
    }

    handleClick (event) {
        this.stemObjectGroup.handleClick(event)
    }

    update()
    {
        if (this.players)
            this.players.update()
        this.rayCaster.setFromCamera(new THREE.Vector2(0, 0), this.camera)
        this.handleIntersections()
        if (this.waterFloor)
            this.waterFloor.update()
        if (this.stemObjectGroup)
            this.stemObjectGroup.update()
    }
}