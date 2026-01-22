import GUI from 'lil-gui'

export default class Debug
{
    constructor()
    {
        this.active = false // TODO: put in an env variable

        if(this.active)
        {
            this.ui = new GUI()
        }
    }
}