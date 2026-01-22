import * as THREE from 'three'

import { v4 as uuidv4 } from 'uuid'
import Experience from '../Experience'

export class Player
{
    constructor(data)
    {
        this.experience = new Experience()
        this.resources = this.experience.resources
        this.name = data.name
        this.position = data.position
        this.id = data.id != null ? data.id : uuidv4()
        this.serverId = data.serverId != null ? data.serverId : null
        this.isSelf = data.self
        this.renderedModel = false
        this.animationMixer = null

        if (!this.isSelf) {
            this.renderPlayerModel()
            console.log('rendered player')
        }
        this.updatePosition(this.position)
    }

    renderPlayerModel() {
        if (this.isSelf || this.renderedModel) return

        if (this.experience.resources.allLoaded()) {
            this.destroyDefaultModel()
            this.renderCharacterModel()
        } else {
            this.renderDefaultModel()
        }
    }

    renderCharacterModel() {
        console.log('rendering character model')

        const femaleCharacterModel = this.resources.items.femaleCharacterModel
        const femaleCharacterColorTexture = this.resources.items.femaleCharacterColorTexture
        const femaleCharacterNormalTexture = this.resources.items.femaleCharacterNormalTexture
        const femaleCharacterRoughnessMetalnessTexture = this.resources.items.femaleCharacterRoughnessMetalnessTexture

        femaleCharacterModel.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    map: femaleCharacterColorTexture,
                    normalMap: femaleCharacterNormalTexture,
                    roughnessMap: femaleCharacterRoughnessMetalnessTexture,
                    metalnessMap: femaleCharacterRoughnessMetalnessTexture
                })
            }
        })
        femaleCharacterModel.scale.set(0.004, 0.004, 0.004)
        this.mesh = femaleCharacterModel
        this.addNameLabel(this.mesh)

        this.experience.scene.add(this.mesh)

        if (!this.animationMixer) {
            this.animationMixer = new THREE.AnimationMixer(this.mesh)
            console.log(this.mesh.animations)
            const action = this.animationMixer.clipAction(this.resources.items.femaleCharacterIdleAnimation.animations[0])
            action.play()
        }
    }

    renderDefaultModel() {
        console.log('rendering default model')
        const geometry = new THREE.SphereGeometry(0.3)
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            }
        )

        this.mesh = new THREE.Mesh(geometry, material)
        this.addNameLabel(this.mesh)

        this.experience.scene.add(this.mesh)
    }

    destroyDefaultModel() {
        if (this.mesh) {
            this.experience.scene.remove(this.mesh)
            this.mesh.geometry.dispose()
            this.mesh.material.dispose()
            this.mesh = null
        }
    }

    addNameLabel(mesh) {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const textSize = 256
        canvas.width = textSize
        canvas.height = textSize
        ctx.fillStyle = '#000000'
        ctx.lineWidth = .5 // Adjust outline width as needed
        ctx.textAlign = 'center'
        ctx.font = `24px "Courier New", monospace`;
        const text = '<' + this.name + '>'
        ctx.fillText(text, textSize / 2, textSize / 2)

        const texture = new THREE.CanvasTexture(canvas)
        texture.minFilter = THREE.LinearFilter

        const geometry = new THREE.PlaneGeometry(1, 1)
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        })

        this.nameLabel = new THREE.Mesh(geometry, material)
        this.nameLabel.position.set(0, 0.5, 0)
        mesh.add(this.nameLabel)
    }

    delete () {
        console.log('deleting player ', this)
        if (this.mesh) {
            this.experience.scene.remove(this.mesh)
    
            if (this.mesh.geometry) this.mesh.geometry.dispose()
            if (this.mesh.material) this.mesh.material.dispose()
    
            this.mesh = null
        }
    }

    update () {
        if (this.isSelf) {
            const oldPosition = new THREE.Vector3().copy(this.position)
            this.updatePosition(this.experience.camera.instance.position)

            if (oldPosition.x !== this.position.x || oldPosition.y !== this.position.y || oldPosition.z !== this.position.z) {
                const currentTime = this.experience.time.elapsed
                if (!this.lastUpdateTime || currentTime - this.lastUpdateTime >= 50) {
                    this.lastUpdateTime = currentTime
                    console.log('sending player position')
                    if (this.experience.socketMessenger) this.experience.socketMessenger.sendPlayerPositionUpdated(this)
                }
            }
        } else if (this.mesh) {
            // interpolate mesh position to object position
            this.mesh.position.lerp(this.position, 0.1)

            if (this.nameLabel) {
                this.nameLabel.lookAt(this.experience.camera.instance.position)
                const distanceToCamera = this.mesh.position.distanceTo(this.experience.camera.instance.position)
                const textSize = Math.max(distanceToCamera / 10, 0.5)
                this.nameLabel.scale.set(textSize, textSize, 1)
            }
            if (this.animationMixer) {
                this.animationMixer.update(this.experience.time.delta / 2)
            }
        }    
    }

    updatePosition(position) {
        this.position.x = position.x
        this.position.y = 0//position.y
        this.position.z = position.z
    }
    
}


export class PlayerPool 
{
    constructor() {
        this.players = {}
        this.experience = new Experience()
        this.resources = this.experience.resources

        this.resources.on('ready', () => {
            this.renderModels()
        })
    }

    add(player) {
        this.players[player.id] = player
    }

    get(playerId) {
        return this.players[playerId]
    }

    delete(playerId) {
        const player = this.get(playerId)

        if (player) {
            player.delete()

            delete this.players[playerId]
        } else {
            console.warn(`Player with ID ${playerId} not found.`)
        }
    }

    getAllPlayers() {
        return Object.values(this.players)
    }

    renderModels() {
        console.log('rendering models')
        for (const player of this.getAllPlayers()) {
            player.renderPlayerModel()
        }
    }

    update() {
        for (const player of this.getAllPlayers()) {
            player.update()
        }
    }
}