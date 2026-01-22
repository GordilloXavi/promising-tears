import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import Experience from "../Experience"

class LeavesModel {
    constructor (position, rotation, model) {
        this.experience = new Experience()
        this.camera = this.experience.camera.instance
        this.resources = this.experience.resources
        this.time = this.experience.time

        this.model = model

        this.mesh = this.createMesh()
        this.mesh.position.set(position.x, position.y, position.z)
        this.mesh.rotation.set(rotation.x, rotation.y, rotation.z)

        this.setAnimation()
    }

    createMesh () {
        const resource = this.model
        const model = SkeletonUtils.clone(resource.scene)

        return model
    }

    setAnimation () {
        if (!this.model?.animations || this.model.animations.length === 0) {
            this.animation = null
            return
        }

        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.mesh)
        this.animation.action = this.animation.mixer.clipAction(this.model.animations[0])
        this.animation.action.setLoop(THREE.LoopRepeat, Infinity)
        this.animation.action.play()
    }

    handleIntersections (rayCaster) {
        return
    }

    handleClick (event) {
        return
    }

    update () {
        if (this.animation?.mixer) {
            this.animation.mixer.update(this.time.delta * 0.5)
        }
    }
}

export default class FallingLeaves {
    constructor () {
        this.experience = new Experience()
        this.resources = this.experience.resources

        const leaves_position = new THREE.Vector3(0, 0, -2)

        const leaves_rotation = new THREE.Euler(0, 0, 0)

        this.leaves_object = new LeavesModel(leaves_position, leaves_rotation, this.resources.items.FallingLeaves)

        this.experience.scene.add(this.leaves_object.mesh)
    }

    getAllInstances() {
        return [
            this.leaves_object
        ]
    }

    handleIntersections(rayCaster) {
        let instances = this.getAllInstances()
        instances.forEach((instance, index) => {
            instance.handleIntersections(rayCaster)
        })
    }

    handleClick (event) {
        let instances = this.getAllInstances()
        instances.forEach((instance, index) => {
            instance.handleClick(event)
        })
    }

    update () {
        this.leaves_object.update()
    }
}