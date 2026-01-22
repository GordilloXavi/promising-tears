import { io } from "socket.io-client"
import Experience from './Experience.js'


export default class SocketMessenger
{
    constructor()
    {
        this.experience = new Experience()
        this.world = this.experience.world
        this.socket = io('https://seal-app-hivs4.ondigitalocean.app')

        this.socket.on('connect', () => {
            console.log('connected_to_server, adding player')
            const selfPlayer = this.world.getSelfPlayer()
            const playerData = {
                name: selfPlayer.name,
                position: selfPlayer.position,
                id: selfPlayer.id
            }
            this.socket.emit("register_player", playerData)
        })

        // Listen for disconnection
        this.socket.on("player_disconnected", (data) => {
            // remove disconnected player
            console.log("player disconnected: ", data)
            this.world.removePlayer(data.client_id)
        })

        this.socket.on('players_info', (data) => {
            console.log('connected!', data)
            const playersInfo = data.players
            for (let i = 0; i < playersInfo.length; i++){
                if (playersInfo[i].client_id != this.world.getSelfPlayer().id)
                    this.world.addPlayer(playersInfo[i])
            }
        })

        this.socket.on("player_added", (data) => {
            console.log('new player added: ', data)
            if (data.client_id == this.world.getSelfPlayer().id) {
                this.world.getSelfPlayer().serverId = data.id
            } else {
                this.world.addPlayer(data)
            }
        })

        this.listenToPlayerPositionUpdates()
    }

    listenToPlayerPositionUpdates() {
        this.socket.on('player_position_updated', (data) => {
            console.log('player_position_updated: ', data)
            const player = this.world.getPlayer(data.client_id)
            if (player) {
                player.updatePosition(data.position)
            }
        })
    }

    sendPlayerPositionUpdated(player) {
        //console.log('sending player position: ', player)
        this.socket.emit('update_player_position', {
            playerId: player.serverId,
            position: player.position
        })
    }

    sendObjectPosition(objectId, objectPosition) {
        // TODO: update the positions of the stems shapes
    }
}